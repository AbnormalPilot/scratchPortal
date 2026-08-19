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

// 2. Get Public Leaderboard (Only when published or organizer preview)
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
      where: {
        finalScore: { not: null },
      },
      include: {
        challenge: { select: { title: true, category: true } },
        members: { select: { fullName: true } },
        submissions: {
          select: { roundNumber: true, scratchUrl: true },
        },
      },
      orderBy: { finalScore: 'desc' },
    });

    const rankings = teams.map((t, idx) => ({
      rank: idx + 1,
      teamId: t.id,
      teamName: t.name,
      challengeTitle: t.challenge?.title || 'Unassigned',
      category: t.challenge?.category || '',
      members: t.members.map((m) => m.fullName),
      round1Score: t.round1Score,
      round2Score: t.round2Score,
      finalScore: t.finalScore,
      isFinalist: t.isFinalist,
      scratchUrl: t.submissions[0]?.scratchUrl || '',
    }));

    res.json({
      isPublished: true,
      publishedAt: eventConfig.updatedAt,
      rankings,
    });
  } catch (error: any) {
    console.error('Fetch public leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

export default router;
