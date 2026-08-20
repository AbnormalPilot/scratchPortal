import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { broadcastScoreUpdate } from '../lib/socket.js';
import { Role } from '@prisma/client';

const router = Router();

// Only Judges and Organizers can access judging routes
router.use(requireAuth, requireRole(Role.JUDGE, Role.ORGANIZER));

// 1. Get teams list for current judging round
router.get('/teams', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const judgeId = req.user?.userId;
    const eventConfig = await prisma.eventConfig.findFirst();

    const teams = await prisma.team.findMany({
      include: {
        challenge: {
          select: { id: true, title: true, category: true, difficulty: true },
        },
        submissions: {
          orderBy: { submittedAt: 'desc' },
        },
        round1Scores: {
          where: { judgeId },
        },
        round2Scores: {
          where: { judgeId },
        },
        members: {
          select: { fullName: true, email: true, isTeamLeader: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enriched = teams.map((t) => {
      const r1Score = t.round1Scores[0] || null;
      const r2Score = t.round2Scores[0] || null;
      const r1Submission =
        t.submissions.find((s) => s.roundNumber === 1 && (s.status === 'SUBMITTED' || s.status === 'LATE')) ||
        t.submissions.find((s) => s.roundNumber === 1) ||
        null;
      const r2Submission =
        t.submissions.find((s) => s.roundNumber === 2 && (s.status === 'SUBMITTED' || s.status === 'LATE')) ||
        t.submissions.find((s) => s.roundNumber === 2) ||
        null;

      return {
        id: t.id,
        name: t.name,
        isFinalist: t.isFinalist,
        r2PresentationSlot: t.r2PresentationSlot,
        challenge: t.challenge,
        members: t.members,
        r1Submission,
        r2Submission,
        myR1Score: r1Score,
        myR2Score: r2Score,
        cachedR1Score: t.round1Score,
        cachedR2Score: t.round2Score,
        finalScore: t.finalScore,
      };
    });

    res.json({
      stage: eventConfig?.currentStage,
      teams: enriched,
    });
  } catch (error: any) {
    console.error('Fetch judging teams error:', error);
    res.status(500).json({ error: 'Failed to fetch judging teams.' });
  }
});

// 2. Get single team evaluation profile
router.get('/team/:teamId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamId = req.params.teamId as string;
    const judgeId = req.user?.userId;

    const team: any = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        challenge: true,
        submissions: { orderBy: { submittedAt: 'desc' } },
        members: { select: { fullName: true, email: true, isTeamLeader: true } },
        round1Scores: { where: { judgeId } },
        round2Scores: { where: { judgeId } },
      },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found.' });
      return;
    }

    res.json({
      team,
      myR1Score: team.round1Scores[0] || null,
      myR2Score: team.round2Scores[0] || null,
    });
  } catch (error: any) {
    console.error('Fetch team evaluation profile error:', error);
    res.status(500).json({ error: 'Failed to fetch team details.' });
  }
});

// 3. Submit Round 1 Rubric Score (Max 100 pts)
router.post('/score/r1', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const judgeId = req.user?.userId;
    if (!judgeId) {
      res.status(401).json({ error: 'Judge ID required.' });
      return;
    }

    const { teamId, basicWorkingScore, visualSpritesScore, creativityScore, comments, isFinal } = req.body;

    if (!teamId) {
      res.status(400).json({ error: 'teamId is required.' });
      return;
    }

    const basic = Number(basicWorkingScore) || 0;
    const visual = Number(visualSpritesScore) || 0;
    const creative = Number(creativityScore) || 0;

    // Validate Rubric ranges
    if (basic < 0 || basic > 40) {
      res.status(400).json({ error: 'Basic Game Working score must be between 0 and 40.' });
      return;
    }
    if (visual < 0 || visual > 25) {
      res.status(400).json({ error: 'Sprites & Visuals score must be between 0 and 25.' });
      return;
    }
    if (creative < 0 || creative > 35) {
      res.status(400).json({ error: 'Creativity & Game Design score must be between 0 and 35.' });
      return;
    }

    const totalScore = Number((basic + visual + creative).toFixed(2));

    // Ensure Judge and Team exist to avoid foreign key errors from stale client tokens/IDs
    const judgeUser = await prisma.user.findUnique({ where: { id: judgeId } });
    if (!judgeUser) {
      res.status(401).json({ error: 'Your session is expired or invalid. Please log out and sign back in.' });
      return;
    }

    const teamExists = await prisma.team.findUnique({ where: { id: teamId } });
    if (!teamExists) {
      res.status(404).json({ error: 'Team not found in the current tournament database. Please refresh the page.' });
      return;
    }

    const scoreRecord = await prisma.round1Score.upsert({
      where: {
        teamId_judgeId: {
          teamId,
          judgeId,
        },
      },
      update: {
        basicWorkingScore: basic,
        visualSpritesScore: visual,
        creativityScore: creative,
        totalScore,
        comments: comments || null,
        isFinal: Boolean(isFinal),
        submittedAt: new Date(),
      },
      create: {
        teamId,
        judgeId,
        basicWorkingScore: basic,
        visualSpritesScore: visual,
        creativityScore: creative,
        totalScore,
        comments: comments || null,
        isFinal: Boolean(isFinal),
      },
      include: {
        team: true,
      },
    });

    // Compute average Round 1 score across all judges for this team (ONLY FINALIZED SCORES)
    const finalR1Scores = await prisma.round1Score.findMany({
      where: { teamId, isFinal: true },
      select: { totalScore: true },
    });
    const avgR1Score = finalR1Scores.length > 0
      ? Number((finalR1Scores.reduce((acc, s) => acc + s.totalScore, 0) / finalR1Scores.length).toFixed(2))
      : null;

    // Update cached score on Team
    await prisma.team.update({
      where: { id: teamId },
      data: { round1Score: avgR1Score },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        eventType: 'ROUND1_SCORE_ENTERED',
        teamId,
        userId: judgeId,
        metadata: {
          totalScore,
          breakdown: { basic, visual, creative },
          isFinal,
        },
      },
    });

    // Broadcast to Organizers
    broadcastScoreUpdate(teamId, scoreRecord.team.name, 1, totalScore);

    res.json({
      message: 'Round 1 score saved successfully!',
      score: scoreRecord,
      calculatedTotal: totalScore,
      teamAverageR1Score: avgR1Score,
    });
  } catch (error: any) {
    console.error('Round 1 scoring error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit Round 1 score.' });
  }
});

// 4. Submit Round 2 Rubric Score (Max 100 pts)
router.post('/score/r2', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const judgeId = req.user?.userId;
    if (!judgeId) {
      res.status(401).json({ error: 'Judge ID required.' });
      return;
    }

    const {
      teamId,
      presentationQualityScore,
      projectExplanationScore,
      technicalQaScore,
      teamContributionScore,
      comments,
      isFinal,
    } = req.body;

    if (!teamId) {
      res.status(400).json({ error: 'teamId is required.' });
      return;
    }

    const pres = Number(presentationQualityScore) || 0;
    const expl = Number(projectExplanationScore) || 0;
    const qa = Number(technicalQaScore) || 0;
    const teamContrib = Number(teamContributionScore) || 0;

    // Validate Rubric ranges
    if (pres < 0 || pres > 30) {
      res.status(400).json({ error: 'Presentation Quality score must be between 0 and 30.' });
      return;
    }
    if (expl < 0 || expl > 40) {
      res.status(400).json({ error: 'Project Explanation score must be between 0 and 40.' });
      return;
    }
    if (qa < 0 || qa > 20) {
      res.status(400).json({ error: 'Technical Q&A score must be between 0 and 20.' });
      return;
    }
    if (teamContrib < 0 || teamContrib > 10) {
      res.status(400).json({ error: 'Team Contribution score must be between 0 and 10.' });
      return;
    }

    const totalScore = Number((pres + expl + qa + teamContrib).toFixed(2));

    // Ensure Judge and Team exist to avoid foreign key errors from stale client tokens/IDs
    const judgeUser = await prisma.user.findUnique({ where: { id: judgeId } });
    if (!judgeUser) {
      res.status(401).json({ error: 'Your session is expired or invalid. Please log out and sign back in.' });
      return;
    }

    const teamExists = await prisma.team.findUnique({ where: { id: teamId } });
    if (!teamExists) {
      res.status(404).json({ error: 'Team not found in the current tournament database. Please refresh the page.' });
      return;
    }

    const scoreRecord = await prisma.round2Score.upsert({
      where: {
        teamId_judgeId: {
          teamId,
          judgeId,
        },
      },
      update: {
        presentationQualityScore: pres,
        projectExplanationScore: expl,
        technicalQaScore: qa,
        teamContributionScore: teamContrib,
        totalScore,
        comments: comments || null,
        isFinal: Boolean(isFinal),
        submittedAt: new Date(),
      },
      create: {
        teamId,
        judgeId,
        presentationQualityScore: pres,
        projectExplanationScore: expl,
        technicalQaScore: qa,
        teamContributionScore: teamContrib,
        totalScore,
        comments: comments || null,
        isFinal: Boolean(isFinal),
      },
      include: {
        team: true,
      },
    });

    // Compute average Round 2 score across all judges for this team (ONLY FINALIZED SCORES)
    const finalR2Scores = await prisma.round2Score.findMany({
      where: { teamId, isFinal: true },
      select: { totalScore: true },
    });
    const avgR2Score = finalR2Scores.length > 0
      ? Number((finalR2Scores.reduce((acc, s) => acc + s.totalScore, 0) / finalR2Scores.length).toFixed(2))
      : null;

    // Calculate final weighted score: R1 * 0.40 + R2 * 0.60
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    const r1 = team?.round1Score || 0;
    const finalScore = avgR2Score !== null ? Number((r1 * 0.4 + avgR2Score * 0.6).toFixed(2)) : null;

    await prisma.team.update({
      where: { id: teamId },
      data: {
        round2Score: avgR2Score,
        finalScore,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        eventType: 'ROUND2_SCORE_ENTERED',
        teamId,
        userId: judgeId,
        metadata: {
          totalScore,
          breakdown: { pres, expl, qa, teamContrib },
          finalWeightedScore: finalScore,
          isFinal,
        },
      },
    });

    // Broadcast to Organizers
    broadcastScoreUpdate(teamId, scoreRecord.team.name, 2, totalScore);

    res.json({
      message: 'Round 2 score saved successfully!',
      score: scoreRecord,
      calculatedTotal: totalScore,
      teamAverageR2Score: avgR2Score,
      teamFinalScore: finalScore,
    });
  } catch (error: any) {
    console.error('Round 2 scoring error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit Round 2 score.' });
  }
});

export default router;
