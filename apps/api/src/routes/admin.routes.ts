import { Router, Response } from 'express';
import { EventStage, Role, SubmissionStatus, prisma } from '@repo/db';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getIO,
  broadcastStageChange,
  broadcastTimerAdjust,
  broadcastLeaderboardPublished,
} from '../lib/socket.js';

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
        prisma.challenge.findMany({
          select: {
            id: true,
            title: true,
            category: true,
            difficulty: true,
            maxCapacity: true,
            claimedCount: true,
            isPublished: true,
            teams: {
              select: {
                id: true,
                name: true,
                accessCode: true,
                challengeClaimedAt: true,
                members: {
                  select: {
                    fullName: true,
                    isTeamLeader: true,
                  },
                },
              },
            },
          },
          orderBy: { title: 'asc' },
        }),
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

// 3. Configure Event Schedule & Durations (Round 1 & Round 2)
router.post('/schedule', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      targetRound = 1,
      r1StartTime,
      r1DurationMinutes,
      r2StartTime,
      r2DurationMinutes,
      startNow = false,
      startR2Now = false,
    } = req.body;

    let eventConfig = await prisma.eventConfig.findFirst();
    if (!eventConfig) {
      eventConfig = await prisma.eventConfig.create({
        data: { currentStage: EventStage.REGISTRATION },
      });
    }

    const updateData: any = {};
    const now = new Date();

    // Round 1 Configuration
    if (targetRound === 1 || startNow || (r1StartTime !== undefined && r1StartTime !== null) || r1DurationMinutes !== undefined) {
      if (r1StartTime !== undefined || startNow) {
        const startDate = startNow ? now : r1StartTime ? new Date(r1StartTime) : null;
        updateData.r1StartTime = startDate;

        if (startDate && r1DurationMinutes) {
          const durationMs = Number(r1DurationMinutes) * 60 * 1000;
          updateData.r1EndTime = new Date(startDate.getTime() + durationMs);
        }
      } else if (r1DurationMinutes && eventConfig.r1StartTime) {
        const durationMs = Number(r1DurationMinutes) * 60 * 1000;
        updateData.r1EndTime = new Date(eventConfig.r1StartTime.getTime() + durationMs);
      }

      if (startNow) {
        updateData.currentStage = EventStage.ROUND1_BUILDING;
      }
    }

    // Round 2 Configuration
    if (targetRound === 2 || startR2Now || (r2StartTime !== undefined && r2StartTime !== null) || r2DurationMinutes !== undefined) {
      if (r2StartTime !== undefined || startR2Now) {
        const startDate = startR2Now ? now : r2StartTime ? new Date(r2StartTime) : null;
        updateData.r2StartTime = startDate;

        if (startDate && r2DurationMinutes) {
          const durationMs = Number(r2DurationMinutes) * 60 * 1000;
          updateData.r2EndTime = new Date(startDate.getTime() + durationMs);
        }
      } else if (r2DurationMinutes && eventConfig.r2StartTime) {
        const durationMs = Number(r2DurationMinutes) * 60 * 1000;
        updateData.r2EndTime = new Date(eventConfig.r2StartTime.getTime() + durationMs);
      }

      if (startR2Now) {
        updateData.currentStage = EventStage.ROUND2_LIVE;
      } else if (updateData.r2StartTime && eventConfig.currentStage !== EventStage.ROUND2_LIVE) {
        updateData.currentStage = EventStage.ROUND2_PREP;
      }
    }

    const updated = await prisma.eventConfig.update({
      where: { id: eventConfig.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        eventType: 'TIMER_ADJUSTED',
        userId: req.user?.userId,
        metadata: {
          targetRound,
          r1StartTime: updated.r1StartTime,
          r1EndTime: updated.r1EndTime,
          r2StartTime: updated.r2StartTime,
          r2EndTime: updated.r2EndTime,
          startNow,
          startR2Now,
        },
      },
    });

    broadcastStageChange(updated.currentStage, updated);
    if (startR2Now && updated.r2EndTime) {
      broadcastTimerAdjust(updated.r2EndTime, 'Round 2 Live Presentations launched live!');
    } else if (targetRound === 2 && updated.r2StartTime) {
      broadcastTimerAdjust(updated.r2StartTime, 'Round 2 Presentation countdown scheduled');
    } else if (updated.r1EndTime) {
      broadcastTimerAdjust(updated.r1EndTime, 'Schedule updated by Organizer');
    }

    const responseMsg = startR2Now
      ? 'Round 2 Live Presentations launched live!'
      : targetRound === 2
      ? 'Round 2 presentation schedule saved successfully.'
      : startNow
      ? 'Round 1 launched live!'
      : 'Tournament schedule saved successfully.';

    res.json({
      message: responseMsg,
      eventConfig: updated,
    });
  } catch (error: any) {
    console.error('Schedule update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update schedule.' });
  }
});

// 4. Extend Active Round Timer by +N Minutes
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

// 4. Manual Finalist Toggle Endpoint (Strict 1 Finalist Per Challenge)
router.post('/teams/:teamId/toggle-finalist', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamId = req.params.teamId as string;
    const team: any = await prisma.team.findUnique({
      where: { id: teamId },
      include: { challenge: true },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found.' });
      return;
    }

    const nextFinalistState = !team.isFinalist;
    let presentationSlot = team.r2PresentationSlot;
    let previousFinalistName: string | null = null;

    if (nextFinalistState) {
      // 1. Strictly enforce 1 Finalist per Problem Statement
      if (team.challengeId) {
        const existingFinalist = await prisma.team.findFirst({
          where: {
            challengeId: team.challengeId,
            isFinalist: true,
            id: { not: team.id },
          },
        });

        if (existingFinalist) {
          previousFinalistName = existingFinalist.name;
          await prisma.team.update({
            where: { id: existingFinalist.id },
            data: { isFinalist: false, r2PresentationSlot: null },
          });
        }
      }

      // 2. Assign next available presentation slot if not already set
      if (!presentationSlot) {
        const maxSlotTeam = await prisma.team.findFirst({
          where: { isFinalist: true },
          orderBy: { r2PresentationSlot: 'desc' },
        });
        presentationSlot = (maxSlotTeam?.r2PresentationSlot || 0) + 1;
      }
    } else {
      presentationSlot = null;
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        isFinalist: nextFinalistState,
        r2PresentationSlot: presentationSlot,
      },
      include: {
        challenge: true,
        members: true,
      },
    });

    // Broadcast update so Judge & Admin screens update in real-time
    try {
      const io = getIO();
      if (io) {
        io.to('room:global').emit('team:finalist_updated', {
          teamId: updated.id,
          isFinalist: updated.isFinalist,
          r2PresentationSlot: updated.r2PresentationSlot,
        });
        io.to('room:global').emit('score:updated', { teamId: updated.id });
        io.to('room:global').emit('stage:changed', { teamId: updated.id });
      }
    } catch (e) {
      console.warn('Socket broadcast warning:', e);
    }

    await prisma.auditLog.create({
      data: {
        eventType: 'MANUAL_FINALIST_TOGGLED',
        userId: req.user?.userId,
        metadata: {
          teamId: updated.id,
          teamName: updated.name,
          challengeId: updated.challengeId,
          isFinalist: updated.isFinalist,
          r2PresentationSlot: updated.r2PresentationSlot,
          replacedPreviousFinalist: previousFinalistName,
        },
      },
    });

    const responseMsg = updated.isFinalist
      ? previousFinalistName
        ? `Squad "${updated.name}" is now the Finalist for "${team.challenge?.title || 'this challenge'}" (Replaced "${previousFinalistName}")`
        : `Squad "${updated.name}" is now marked as the ROUND 2 FINALIST`
      : `Squad "${updated.name}" removed from Round 2 finalists.`;

    res.json({
      message: responseMsg,
      team: updated,
    });
  } catch (error: any) {
    console.error('Manual finalist toggle error:', error);
    res.status(500).json({ error: error.message || 'Failed to update finalist status.' });
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

// 6A. Publish / Unpublish Round 1 Sprint Leaderboard (Syncs all team Round 1 scores)
router.post('/leaderboard/publish-r1', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { publish = true } = req.body;
    const eventConfig = await prisma.eventConfig.findFirst();

    if (!eventConfig) {
      res.status(404).json({ error: 'Event config not found.' });
      return;
    }

    if (publish) {
      // Sync Round 1 scores for all teams from finalized judge evaluations
      const teams = await prisma.team.findMany({
        include: {
          round1Scores: { where: { isFinal: true } },
        },
      });

      for (const team of teams) {
        const avgR1 =
          team.round1Scores.length > 0
            ? Number((team.round1Scores.reduce((acc, s) => acc + s.totalScore, 0) / team.round1Scores.length).toFixed(2))
            : team.round1Score || 0;

        await prisma.team.update({
          where: { id: team.id },
          data: { round1Score: avgR1 },
        });
      }
    }

    const updated = await prisma.eventConfig.update({
      where: { id: eventConfig.id },
      data: { isR1LeaderboardPublished: Boolean(publish) },
    });

    broadcastLeaderboardPublished();

    await prisma.auditLog.create({
      data: {
        eventType: publish ? 'R1_LEADERBOARD_PUBLISHED' : 'R1_LEADERBOARD_UNPUBLISHED',
        userId: req.user?.userId,
        metadata: { isPublished: publish },
      },
    });

    res.json({
      message: publish ? 'Round 1 Leaderboard successfully published to public view!' : 'Round 1 Leaderboard unpublished.',
      isR1LeaderboardPublished: updated.isR1LeaderboardPublished,
    });
  } catch (error: any) {
    console.error('Publish Round 1 leaderboard error:', error);
    res.status(500).json({ error: 'Failed to update Round 1 leaderboard visibility.' });
  }
});

// 6B. Publish / Unpublish Final Grand Champion Leaderboard (Syncs final weighted scores)
router.post('/leaderboard/publish', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { publish = true } = req.body;
    const eventConfig = await prisma.eventConfig.findFirst();

    if (!eventConfig) {
      res.status(404).json({ error: 'Event config not found.' });
      return;
    }

    if (publish) {
      // Sync scores for ALL teams from their judge evaluations
      const teams = await prisma.team.findMany({
        include: {
          round1Scores: { where: { isFinal: true } },
          round2Scores: { where: { isFinal: true } },
        },
      });

      for (const team of teams) {
        const avgR1 =
          team.round1Scores.length > 0
            ? Number((team.round1Scores.reduce((acc, s) => acc + s.totalScore, 0) / team.round1Scores.length).toFixed(2))
            : team.round1Score || 0;

        const avgR2 =
          team.round2Scores.length > 0
            ? Number((team.round2Scores.reduce((acc, s) => acc + s.totalScore, 0) / team.round2Scores.length).toFixed(2))
            : team.round2Score !== null && team.round2Score !== undefined
            ? team.round2Score
            : null;

        const finalScore =
          team.isFinalist && avgR2 !== null
            ? Number((avgR1 * 0.4 + avgR2 * 0.6).toFixed(2))
            : avgR1;

        await prisma.team.update({
          where: { id: team.id },
          data: {
            round1Score: avgR1,
            round2Score: avgR2,
            finalScore,
          },
        });
      }
    }

    const updated = await prisma.eventConfig.update({
      where: { id: eventConfig.id },
      data: { isLeaderboardPublished: Boolean(publish) },
    });

    broadcastLeaderboardPublished();

    await prisma.auditLog.create({
      data: {
        eventType: publish ? 'FINAL_LEADERBOARD_PUBLISHED' : 'FINAL_LEADERBOARD_UNPUBLISHED',
        userId: req.user?.userId,
        metadata: { isPublished: publish },
      },
    });

    res.json({
      message: publish ? 'Final Grand Champion Leaderboard successfully published to public view!' : 'Final Leaderboard unpublished.',
      isLeaderboardPublished: updated.isLeaderboardPublished,
    });
  } catch (error: any) {
    console.error('Publish final leaderboard error:', error);
    res.status(500).json({ error: 'Failed to update final leaderboard visibility.' });
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

// 8. Manage all teams and complete submission/member history
router.get('/teams', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            category: true,
            difficulty: true,
            shortDescription: true,
            requirements: true,
          },
        },
        members: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isTeamLeader: true,
            createdAt: true,
          },
          orderBy: { isTeamLeader: 'desc' },
        },
        submissions: {
          orderBy: { submittedAt: 'desc' },
        },
        round1Scores: {
          include: {
            judge: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
        round2Scores: {
          include: {
            judge: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(teams);
  } catch (error: any) {
    console.error('Fetch all teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams.' });
  }
});

// 8. Reset Schedule / Timers Back to Standby
router.post('/timer/reset', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const eventConfig = await prisma.eventConfig.findFirst();
    if (!eventConfig) {
      res.status(404).json({ error: 'Event config not found.' });
      return;
    }

    const updated = await prisma.eventConfig.update({
      where: { id: eventConfig.id },
      data: {
        r1StartTime: null,
        r1EndTime: null,
        r2StartTime: null,
        r2EndTime: null,
        currentStage: EventStage.REGISTRATION,
      },
    });

    await prisma.auditLog.create({
      data: {
        eventType: 'TIMER_RESET',
        userId: req.user?.userId,
        metadata: { message: 'Schedule and timers reset by organizer' },
      },
    });

    broadcastStageChange(updated.currentStage, updated);
    broadcastTimerAdjust(null, 'Timers and schedule reset by Organizer');

    res.json({
      message: 'Schedule and timers reset successfully!',
      eventConfig: updated,
    });
  } catch (error: any) {
    console.error('Timer reset error:', error);
    res.status(500).json({ error: 'Failed to reset timers.' });
  }
});

// 9. Dev/Testing: Reset all team claims, submissions, scores, timers, and reset to REGISTRATION
router.post('/dev-reset-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Delete all scores and submissions
    await prisma.round1Score.deleteMany({});
    await prisma.round2Score.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.auditLog.deleteMany({});

    // 2. Reset all team claims and scores
    await prisma.team.updateMany({
      data: {
        challengeId: null,
        challengeClaimedAt: null,
        isFinalist: false,
        r2PresentationSlot: null,
        round1Score: null,
        round2Score: null,
        finalScore: null,
      },
    });

    // 3. Reset all challenge claim counts
    await prisma.challenge.updateMany({
      data: {
        claimedCount: 0,
      },
    });

    // 4. Reset EventConfig to REGISTRATION and clear all timer dates
    let eventConfig = await prisma.eventConfig.findFirst();
    if (eventConfig) {
      eventConfig = await prisma.eventConfig.update({
        where: { id: eventConfig.id },
        data: {
          currentStage: EventStage.REGISTRATION,
          r1StartTime: null,
          r1EndTime: null,
          r2StartTime: null,
          r2EndTime: null,
          isR1LeaderboardPublished: false,
          isLeaderboardPublished: false,
        },
      });
    }

    // 5. Broadcast reset over Socket.IO
    broadcastStageChange(EventStage.REGISTRATION, eventConfig);
    broadcastTimerAdjust(null, 'Platform test data reset');
    broadcastLeaderboardPublished();

    res.json({
      message: 'All test data and timers reset successfully! Stage set to CHALLENGE_SELECTION.',
      eventConfig,
    });
  } catch (error: any) {
    console.error('Dev reset error:', error);
    res.status(500).json({ error: 'Failed to reset test data.' });
  }
});

export default router;
