import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// 1. Get Public Event State and Time Sync
router.get('/event-state', async (req, res: Response) => {
  try {
    const eventConfig = await prisma.eventConfig.findFirst();
    const serverTime = new Date().toISOString();

    res.json({
      serverTime,
      currentStage: eventConfig?.currentStage || 'REGISTRATION',
      r1StartTime: eventConfig?.r1StartTime,
      r1EndTime: eventConfig?.r1EndTime,
      r2StartTime: eventConfig?.r2StartTime,
      r2EndTime: eventConfig?.r2EndTime,
      isLeaderboardPublished: eventConfig?.isLeaderboardPublished || false,
    });
  } catch (error: any) {
    console.error('Fetch public event state error:', error);
    res.status(500).json({ error: 'Failed to fetch event state.' });
  }
});

// 2. Get Public Leaderboard (Displays all teams, Round 1 grades, and Round 2 qualification)
router.get('/leaderboard', async (req, res: Response) => {
  try {
    const eventConfig = await prisma.eventConfig.findFirst();

    if (!eventConfig?.isLeaderboardPublished) {
      res.json({
        isPublished: false,
        message: 'The leaderboard has not been published yet. Check back soon!',
        rankings: [],
      });
      return;
    }

    const teams = await prisma.team.findMany({
      include: {
        challenge: { select: { id: true, title: true, category: true } },
        members: { select: { id: true, fullName: true, email: true, isTeamLeader: true } },
        round1Scores: {
          select: {
            basicWorkingScore: true,
            visualSpritesScore: true,
            creativityScore: true,
            totalScore: true,
            comments: true,
          },
        },
        round2Scores: {
          select: {
            presentationQualityScore: true,
            projectExplanationScore: true,
            technicalQaScore: true,
            teamContributionScore: true,
            totalScore: true,
            comments: true,
          },
        },
        submissions: {
          where: { roundNumber: 1 },
          select: { roundNumber: true, scratchUrl: true, shortDescription: true, videoUrl: true, status: true },
        },
      },
    });

    // Compute live averages and rankings for ALL teams
    const scoredList = teams.map((t) => {
      const avgR1 =
        t.round1Scores.length > 0
          ? Number((t.round1Scores.reduce((acc, s) => acc + s.totalScore, 0) / t.round1Scores.length).toFixed(2))
          : t.round1Score || 0;

      const avgR2 =
        t.round2Scores.length > 0
          ? Number((t.round2Scores.reduce((acc, s) => acc + s.totalScore, 0) / t.round2Scores.length).toFixed(2))
          : t.round2Score !== null && t.round2Score !== undefined
          ? t.round2Score
          : null;

      // Final score formula: R1 * 0.40 + R2 * 0.60 if finalist with R2 score, else R1 score
      const finalScore =
        t.isFinalist && avgR2 !== null
          ? Number((avgR1 * 0.4 + avgR2 * 0.6).toFixed(2))
          : avgR1;

      return {
        teamId: t.id,
        teamName: t.name,
        name: t.name,
        accessCode: t.accessCode,
        challengeTitle: t.challenge?.title || 'Unassigned',
        category: t.challenge?.category || '',
        members: t.members.map((m) => m.fullName),
        isFinalist: t.isFinalist,
        qualificationStatus: t.isFinalist ? 'QUALIFIED' : 'NOT_QUALIFIED',
        r2PresentationSlot: t.r2PresentationSlot,
        round1Score: avgR1,
        r1Score: avgR1,
        round1JudgesCount: t.round1Scores.length,
        round2Score: avgR2,
        r2Score: avgR2,
        round2JudgesCount: t.round2Scores.length,
        finalScore,
        scratchUrl: t.submissions[0]?.scratchUrl || '',
        videoUrl: t.submissions[0]?.videoUrl || '',
      };
    });

    // Sort: Finalists first (ranked by finalScore desc), then non-finalists (ranked by round1Score desc)
    scoredList.sort((a, b) => {
      if (a.isFinalist && !b.isFinalist) return -1;
      if (!a.isFinalist && b.isFinalist) return 1;
      return (b.finalScore || 0) - (a.finalScore || 0);
    });

    const rankings = scoredList.map((t, idx) => ({
      ...t,
      rank: idx + 1,
    }));

    res.json({
      isPublished: true,
      publishedAt: eventConfig.updatedAt,
      stage: eventConfig.currentStage,
      totalTeams: rankings.length,
      finalistsCount: rankings.filter((r) => r.isFinalist).length,
      rankings,
    });
  } catch (error: any) {
    console.error('Fetch public leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

export default router;
