import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import {
  broadcastStageChange,
  broadcastTimerAdjust,
  broadcastLeaderboardPublished,
} from '../lib/socket.js';
import { Role, EventStage, SubmissionStatus } from '@prisma/client';

const router = Router();

// Only Organizers/Admins can access these routes
router.use(requireAuth, requireRole(Role.ORGANIZER));

// 1. Mission Control Overview Metrics
router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [eventConfig, totalTeams, totalUsers, challenges, submissions, r1ScoresCount, r2ScoresCount] =
      await Promise.all([
        prisma.eventConfig.findFirst(),
        prisma.team.count(),
        prisma.user.count(),
        prisma.challenge.findMany({ select: { id: true, title: true, maxCapacity: true, claimedCount: true } }),
        prisma.submission.findMany({ select: { roundNumber: true, status: true } }),
        prisma.round1Score.count(),
        prisma.round2Score.count(),
      ]);

    const totalSeats = challenges.reduce((acc, c) => acc + c.maxCapacity, 0);
    const claimedSeats = challenges.reduce((acc, c) => acc + c.claimedCount, 0);

    const r1Submissions = submissions.filter((s) => s.roundNumber === 1);
    const submittedCount = r1Submissions.filter((s) => s.status === SubmissionStatus.SUBMITTED).length;
    const draftCount = r1Submissions.filter((s) => s.status === SubmissionStatus.DRAFT).length;
    const notStartedCount = Math.max(0, totalTeams - (submittedCount + draftCount));

    res.json({
      eventConfig,
      telemetry: {
        totalTeams,
        totalUsers,
        totalSeats,
        claimedSeats,
        seatsRemaining: Math.max(0, totalSeats - claimedSeats),
        r1Submissions: {
          total: r1Submissions.length,
          submitted: submittedCount,
          draft: draftCount,
          notStarted: notStartedCount,
        },
        judging: {
          r1ScoresCount,
          r2ScoresCount,
        },
      },
      challenges,
    });
  } catch (error: any) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to retrieve admin overview.' });
  }
});

// 2. Advance / Transition Global Event Stage
router.post('/event-stage', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stage, customDurationMinutes } = req.body;

    if (!stage || !Object.values(EventStage).includes(stage)) {
      res.status(400).json({ error: `Invalid stage. Valid stages: ${Object.values(EventStage).join(', ')}` });
      return;
    }

    let eventConfig = await prisma.eventConfig.findFirst();
    if (!eventConfig) {
      eventConfig = await prisma.eventConfig.create({
        data: { currentStage: stage },
      });
    }

    const now = new Date();
    const updateData: any = { currentStage: stage };

    // Auto-configure standard round timers if transitioning into rounds
    if (stage === EventStage.ROUND1_BUILDING) {
      const durationMs = (customDurationMinutes || 240) * 60 * 1000; // default 4 hours
      updateData.r1StartTime = now;
      updateData.r1EndTime = new Date(now.getTime() + durationMs);
    } else if (stage === EventStage.ROUND2_LIVE) {
      const durationMs = (customDurationMinutes || 120) * 60 * 1000; // default 2 hours
      updateData.r2StartTime = now;
      updateData.r2EndTime = new Date(now.getTime() + durationMs);
    }

    const updatedConfig = await prisma.eventConfig.update({
      where: { id: eventConfig.id },
      data: updateData,
    });

    // Log Audit Event
    await prisma.auditLog.create({
      data: {
        eventType: 'STAGE_TRANSITION',
        userId: req.user?.userId,
        metadata: {
          previousStage: eventConfig.currentStage,
          newStage: stage,
          r1EndTime: updatedConfig.r1EndTime,
          r2EndTime: updatedConfig.r2EndTime,
        },
      },
    });

    // Broadcast in real-time to all clients
    broadcastStageChange(stage, updatedConfig);

    res.json({
      message: `Event transitioned to stage: ${stage}`,
      eventConfig: updatedConfig,
    });
  } catch (error: any) {
    console.error('Stage transition error:', error);
    res.status(500).json({ error: error.message || 'Failed to update event stage.' });
  }
});

// 3. Extend Active Round Timer by +N Minutes
router.post('/timer/extend', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { minutes = 10, roundNumber = 1, reason = 'Organizer extension' } = req.body;
    const eventConfig = await prisma.eventConfig.findFirst();

    if (!eventConfig) {
      res.status(404).json({ error: 'Event config not found.' });
      return;
    }

    const extensionMs = minutes * 60 * 1000;
    let newEndTime: Date;

    if (roundNumber === 1) {
      const currentEnd = eventConfig.r1EndTime || new Date();
      newEndTime = new Date(currentEnd.getTime() + extensionMs);
      await prisma.eventConfig.update({
        where: { id: eventConfig.id },
        data: { r1EndTime: newEndTime },
      });
    } else {
      const currentEnd = eventConfig.r2EndTime || new Date();
      newEndTime = new Date(currentEnd.getTime() + extensionMs);
      await prisma.eventConfig.update({
        where: { id: eventConfig.id },
        data: { r2EndTime: newEndTime },
      });
    }

    await prisma.auditLog.create({
      data: {
        eventType: 'TIMER_EXTENDED',
        userId: req.user?.userId,
        metadata: { minutes, roundNumber, newEndTime, reason },
      },
    });

    broadcastTimerAdjust(newEndTime, reason);

    res.json({
      message: `Timer extended by ${minutes} minutes for Round ${roundNumber}.`,
      newEndTime,
    });
  } catch (error: any) {
    console.error('Timer extend error:', error);
    res.status(500).json({ error: 'Failed to extend timer.' });
  }
});

// 4. Automated Finalist Selection Engine (Top 1 team per challenge)
router.post('/finalists/compute', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const challenges = await prisma.challenge.findMany({
      include: {
        teams: {
          include: {
            round1Scores: true,
          },
        },
      },
    });

    // Reset all previous finalist flags
    await prisma.team.updateMany({
      data: { isFinalist: false, r2PresentationSlot: null },
    });

    const finalistResults: any[] = [];
    let presentationSlotCounter = 1;

    for (const challenge of challenges) {
      if (challenge.teams.length === 0) continue;

      // Calculate or fetch highest Round 1 scoring team for this challenge
      const scoredTeams = challenge.teams.map((t) => {
        const avgScore =
          t.round1Scores.length > 0
            ? t.round1Scores.reduce((acc, s) => acc + s.totalScore, 0) / t.round1Scores.length
            : t.round1Score || 0;
        return {
          teamId: t.id,
          teamName: t.name,
          score: Number(avgScore.toFixed(2)),
        };
      });

      scoredTeams.sort((a, b) => b.score - a.score);

      const topTeam = scoredTeams[0];
      if (topTeam) {
        await prisma.team.update({
          where: { id: topTeam.teamId },
          data: {
            isFinalist: true,
            r2PresentationSlot: presentationSlotCounter++,
          },
        });

        finalistResults.push({
          challengeTitle: challenge.title,
          finalistTeamId: topTeam.teamId,
          finalistTeamName: topTeam.teamName,
          round1Score: topTeam.score,
          competingTeamsCount: scoredTeams.length,
          allScores: scoredTeams,
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        eventType: 'FINALISTS_COMPUTED',
        userId: req.user?.userId,
        metadata: {
          totalFinalists: finalistResults.length,
          finalists: finalistResults,
        },
      },
    });

    res.json({
      message: `Successfully computed ${finalistResults.length} finalists!`,
      finalists: finalistResults,
    });
  } catch (error: any) {
    console.error('Compute finalists error:', error);
    res.status(500).json({ error: error.message || 'Failed to compute finalists.' });
  }
});

// 5. Compute Final Weighted Scores (R1 * 0.40 + R2 * 0.60)
router.post('/final-scores/compute', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        round1Scores: true,
        round2Scores: true,
      },
    });

    const results = [];

    for (const team of teams) {
      const avgR1 =
        team.round1Scores.length > 0
          ? team.round1Scores.reduce((acc, s) => acc + s.totalScore, 0) / team.round1Scores.length
          : team.round1Score || 0;

      const avgR2 =
        team.round2Scores.length > 0
          ? team.round2Scores.reduce((acc, s) => acc + s.totalScore, 0) / team.round2Scores.length
          : team.round2Score || 0;

      const finalScore = Number((avgR1 * 0.4 + avgR2 * 0.6).toFixed(2));

      const updated = await prisma.team.update({
        where: { id: team.id },
        data: {
          round1Score: Number(avgR1.toFixed(2)),
          round2Score: Number(avgR2.toFixed(2)),
          finalScore,
        },
      });

      results.push({
        teamId: updated.id,
        teamName: updated.name,
        round1Score: updated.round1Score,
        round2Score: updated.round2Score,
        finalScore: updated.finalScore,
        isFinalist: updated.isFinalist,
      });
    }

    results.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

    res.json({
      message: 'Final weighted scores computed successfully!',
      rankings: results,
    });
  } catch (error: any) {
    console.error('Compute final scores error:', error);
    res.status(500).json({ error: 'Failed to compute final scores.' });
  }
});

// 6. Publish / Unpublish Final Leaderboard
router.post('/leaderboard/publish', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { publish = true } = req.body;
    const eventConfig = await prisma.eventConfig.findFirst();

    if (!eventConfig) {
      res.status(404).json({ error: 'Event config not found.' });
      return;
    }

    const updated = await prisma.eventConfig.update({
      where: { id: eventConfig.id },
      data: { isLeaderboardPublished: Boolean(publish) },
    });

    if (publish) {
      broadcastLeaderboardPublished();
    }

    await prisma.auditLog.create({
      data: {
        eventType: publish ? 'LEADERBOARD_PUBLISHED' : 'LEADERBOARD_UNPUBLISHED',
        userId: req.user?.userId,
        metadata: { isPublished: publish },
      },
    });

    res.json({
      message: publish ? 'Leaderboard successfully published to public view!' : 'Leaderboard unpublished.',
      isLeaderboardPublished: updated.isLeaderboardPublished,
    });
  } catch (error: any) {
    console.error('Publish leaderboard error:', error);
    res.status(500).json({ error: 'Failed to update leaderboard visibility.' });
  }
});

// 7. Get live platform audit logs
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        team: { select: { name: true } },
        user: { select: { fullName: true, email: true, role: true } },
      },
    });

    res.json(logs);
  } catch (error: any) {
    console.error('Fetch audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// 8. Manage all teams
router.get('/teams', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        challenge: true,
        members: true,
        submissions: true,
        round1Scores: true,
        round2Scores: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(teams);
  } catch (error: any) {
    console.error('Fetch all teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams.' });
  }
});

export default router;
