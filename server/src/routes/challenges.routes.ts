import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { broadcastSeatClaim } from '../lib/socket.js';
import { EventStage } from '@prisma/client';

const router = Router();

// 1. Get all challenges with live remaining seat counts (Enforces release stage)
router.get('/', async (req, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    let isOrganizer = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = (await import('../lib/jwt.js')).verifyToken(token);
        if (payload.role === 'ORGANIZER') {
          isOrganizer = true;
        }
      } catch (e) {
        // invalid token, treat as unauthenticated
      }
    }

    const eventConfig = await prisma.eventConfig.findFirst();
    const currentStage = eventConfig?.currentStage || EventStage.REGISTRATION;
    const isReleased =
      currentStage === EventStage.CHALLENGE_SELECTION ||
      currentStage === EventStage.ROUND1_BUILDING ||
      currentStage === EventStage.ROUND1_JUDGING ||
      currentStage === EventStage.ROUND2_PREP ||
      currentStage === EventStage.ROUND2_LIVE ||
      currentStage === EventStage.ROUND2_JUDGING ||
      currentStage === EventStage.COMPLETED;

    // If not released and not organizer, hide full challenge statements
    if (!isReleased && !isOrganizer) {
      const challengeCount = await prisma.challenge.count();
      res.json({
        isReleased: false,
        stage: currentStage,
        message: 'Problem statements are locked and will be revealed once released by the organizer.',
        totalChallenges: challengeCount,
        challenges: [],
      });
      return;
    }

    const challenges = await prisma.challenge.findMany({
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        shortDescription: true,
        fullDescription: true,
        requirements: true,
        maxCapacity: true,
        claimedCount: true,
        difficulty: true,
        category: true,
      },
    });

    const enriched = challenges.map((c) => ({
      ...c,
      remainingSeats: Math.max(0, c.maxCapacity - c.claimedCount),
      isFull: c.claimedCount >= c.maxCapacity,
    }));

    res.json({
      isReleased: true,
      stage: currentStage,
      challenges: enriched,
    });
  } catch (error: any) {
    console.error('Fetch challenges error:', error);
    res.status(500).json({ error: 'Failed to fetch challenges.' });
  }
});

// 2. Get detailed challenge by ID
router.get('/:id', async (req, res: Response) => {
  try {
    const { id } = req.params;
    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            challengeClaimedAt: true,
          },
        },
      },
    });

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }

    res.json({
      ...challenge,
      remainingSeats: Math.max(0, challenge.maxCapacity - challenge.claimedCount),
      isFull: challenge.claimedCount >= challenge.maxCapacity,
    });
  } catch (error: any) {
    console.error('Fetch challenge detail error:', error);
    res.status(500).json({ error: 'Failed to fetch challenge details.' });
  }
});

// 3. Atomic FCFS Challenge Claim
router.post('/:id/claim', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: challengeId } = req.params;
    const teamId = req.user?.teamId;

    if (!teamId) {
      res.status(400).json({ error: 'You must belong to a team to claim a challenge.' });
      return;
    }

    // Check if event is in a stage that allows claiming
    const eventConfig = await prisma.eventConfig.findFirst();
    if (
      !eventConfig ||
      (eventConfig.currentStage !== EventStage.CHALLENGE_SELECTION &&
        eventConfig.currentStage !== EventStage.ROUND1_BUILDING)
    ) {
      res.status(403).json({
        error: `Challenge selection is currently locked. Problem statements have not been released by the organizers yet.`,
      });
      return;
    }

    // Execute Atomic Claim within an Interactive Transaction with Row-Level Lock
    const claimResult = await prisma.$transaction(async (tx) => {
      // 1. Check if team already has a claimed challenge
      const team = await tx.team.findUnique({ where: { id: teamId } });
      if (!team) {
        throw new Error('Team not found.');
      }
      if (team.challengeId) {
        throw new Error('Your team has already claimed a challenge. You cannot switch challenges.');
      }

      // 2. Lock the Challenge row with SELECT FOR UPDATE to prevent race conditions
      const lockedChallenges = await tx.$queryRaw<
        Array<{ id: string; title: string; maxCapacity: number; claimedCount: number }>
      >`
        SELECT "id", "title", "maxCapacity", "claimedCount"
        FROM "Challenge"
        WHERE "id" = ${challengeId}
        FOR UPDATE
      `;

      if (!lockedChallenges || lockedChallenges.length === 0) {
        throw new Error('Challenge not found.');
      }

      const challenge = lockedChallenges[0];

      if (challenge.claimedCount >= challenge.maxCapacity) {
        const error: any = new Error(`Challenge "${challenge.title}" is completely full.`);
        error.code = 'CHALLENGE_FULL';
        throw error;
      }

      // 3. Atomically update challenge counter
      const updatedChallenge = await tx.challenge.update({
        where: { id: challengeId },
        data: {
          claimedCount: { increment: 1 },
        },
      });

      // 4. Assign challenge to team
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: {
          challengeId: challengeId,
          challengeClaimedAt: new Date(),
        },
        include: {
          challenge: true,
        },
      });

      // 5. Create audit log
      await tx.auditLog.create({
        data: {
          eventType: 'CHALLENGE_CLAIMED',
          teamId: team.id,
          userId: req.user?.userId,
          metadata: {
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            newClaimedCount: updatedChallenge.claimedCount,
            maxCapacity: updatedChallenge.maxCapacity,
          },
        },
      });

      return { updatedChallenge, updatedTeam };
    });

    // 6. Broadcast updated seat availability to all clients in real-time
    broadcastSeatClaim(
      claimResult.updatedChallenge.id,
      claimResult.updatedChallenge.claimedCount,
      claimResult.updatedChallenge.maxCapacity
    );

    res.json({
      message: `Successfully claimed challenge: "${claimResult.updatedChallenge.title}"!`,
      team: claimResult.updatedTeam,
      challenge: claimResult.updatedChallenge,
    });
  } catch (error: any) {
    console.error('Challenge claim transaction error:', error);
    if (error.code === 'CHALLENGE_FULL' || error.message?.includes('completely full')) {
      res.status(409).json({ error: error.message || 'Challenge is already full.' });
      return;
    }
    res.status(400).json({ error: error.message || 'Failed to claim challenge.' });
  }
});

export default router;
