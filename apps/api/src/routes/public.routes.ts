import { Router, Response } from 'express';
import { prisma } from '@repo/db';
import { cached, CacheKeys } from '../lib/cache.js';

const router = Router();

export const buildEventState = () => prisma.eventConfig.findFirst();

// These are the warmed routes (lib/warmer.ts refreshes them every 4s), so the
// TTL only has to outlive the warm interval - correctness comes from explicit
// invalidation on the broadcasts, not from expiry. serverTime is always computed
// fresh per request, so countdown clocks stay accurate regardless.
export const EVENT_STATE_TTL_SECONDS = 8;
export const LEADERBOARD_TTL_SECONDS = 8;

// 1. Get Public Event State and Time Sync
router.get('/event-state', async (req, res: Response) => {
  try {
    const eventConfig = await cached(CacheKeys.eventState, EVENT_STATE_TTL_SECONDS, buildEventState);
    // Never cached - clients use this to sync their countdown clocks.
    const serverTime = new Date().toISOString();

    res.json({
      serverTime,
      currentStage: eventConfig?.currentStage || 'REGISTRATION',
      r1StartTime: eventConfig?.r1StartTime,
      r1EndTime: eventConfig?.r1EndTime,
      r2StartTime: eventConfig?.r2StartTime,
      r2EndTime: eventConfig?.r2EndTime,
      isR1LeaderboardPublished: eventConfig?.isR1LeaderboardPublished || false,
      isLeaderboardPublished: eventConfig?.isLeaderboardPublished || false,
    });
  } catch (error: any) {
    console.error('Fetch public event state error:', error);
    res.status(500).json({ error: 'Failed to fetch event state.' });
  }
});

// 2. Get Public Leaderboard (Supports distinct Round 1 and Grand Finale Leaderboards)
router.get('/leaderboard', async (req, res: Response) => {
  try {
    const payload = await cached(CacheKeys.leaderboard, LEADERBOARD_TTL_SECONDS, buildLeaderboard);
    res.json(payload);
  } catch (error: any) {
    console.error('Fetch public leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

export async function buildLeaderboard() {
    const eventConfig = await prisma.eventConfig.findFirst();
    const isR1Published = Boolean(eventConfig?.isR1LeaderboardPublished);
    const isFinalPublished = Boolean(eventConfig?.isLeaderboardPublished);

    if (!isR1Published && !isFinalPublished) {
      return {
        isPublished: false,
        isR1Published: false,
        isFinalPublished: false,
        message: 'The leaderboard has not been published yet. Check back soon!',
        rankings: [],
        r1Rankings: [],
        finalRankings: [],
      };
    }

    const teams = await prisma.team.findMany({
      include: {
        challenge: { select: { id: true, title: true, category: true } },
        members: { select: { id: true, fullName: true, email: true, isTeamLeader: true } },
        round1Scores: {
          where: { isFinal: true },
          select: {
            basicWorkingScore: true,
            visualSpritesScore: true,
            creativityScore: true,
            totalScore: true,
            comments: true,
            isFinal: true,
          },
        },
        round2Scores: {
          where: { isFinal: true },
          select: {
            presentationQualityScore: true,
            projectExplanationScore: true,
            technicalQaScore: true,
            teamContributionScore: true,
            totalScore: true,
            comments: true,
            isFinal: true,
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

    // 1. R1 Standings: Ordered strictly by Round 1 score descending
    const r1Sorted = [...scoredList].sort((a, b) => (b.round1Score || 0) - (a.round1Score || 0));
    const r1Rankings = r1Sorted.map((t, idx) => ({ ...t, rank: idx + 1 }));

    // 2. Final Standings: Finalists first (ranked by finalScore desc), then non-finalists (by round1Score desc)
    const finalSorted = [...scoredList].sort((a, b) => {
      if (a.isFinalist && !b.isFinalist) return -1;
      if (!a.isFinalist && b.isFinalist) return 1;
      return (b.finalScore || 0) - (a.finalScore || 0);
    });
    const finalRankings = finalSorted.map((t, idx) => ({ ...t, rank: idx + 1 }));

    return {
      isPublished: isFinalPublished || isR1Published,
      isR1Published,
      isFinalPublished,
      publishedAt: eventConfig.updatedAt,
      stage: eventConfig.currentStage,
      totalTeams: teams.length,
      finalistsCount: teams.filter((r) => r.isFinalist).length,
      r1Rankings: isR1Published ? r1Rankings : [],
      finalRankings: isFinalPublished ? finalRankings : [],
      rankings: isFinalPublished ? finalRankings : isR1Published ? r1Rankings : [],
    };
}

export default router;
