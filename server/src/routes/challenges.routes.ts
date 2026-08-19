import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { broadcastSeatClaim, broadcastChallengeListUpdate } from '../lib/socket.js';
import { EventStage, Role } from '@prisma/client';

const router = Router();

// 1. Get all challenges with live remaining seat counts (Enforces release stage & publish status)
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

    // Organizers get all challenges (published & unpublished); students get all published challenges
    const whereClause = isOrganizer ? {} : { isPublished: true };

    const challenges = await prisma.challenge.findMany({
      where: whereClause,
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
        isPublished: true,
        teams: {
          select: {
            id: true,
            name: true,
            accessCode: true,
            challengeClaimedAt: true,
            round1Score: true,
            round2Score: true,
            finalScore: true,
            isFinalist: true,
            submissions: {
              select: {
                roundNumber: true,
                status: true,
                scratchUrl: true,
              },
            },
          },
        },
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
            accessCode: true,
            challengeClaimedAt: true,
            round1Score: true,
            round2Score: true,
            finalScore: true,
            isFinalist: true,
            submissions: {
              select: {
                roundNumber: true,
                status: true,
                scratchUrl: true,
              },
            },
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

// 3. Organizer: Create New Challenge
router.post('/', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      shortDescription,
      fullDescription,
      requirements,
      maxCapacity,
      difficulty,
      category,
      isPublished,
    } = req.body;

    if (!title || !shortDescription || !fullDescription) {
      res.status(400).json({ error: 'Title, short description, and full description are required.' });
      return;
    }

    const created = await prisma.challenge.create({
      data: {
        title,
        shortDescription,
        fullDescription,
        requirements: Array.isArray(requirements) ? requirements : [],
        maxCapacity: Number(maxCapacity) || 4,
        difficulty: difficulty || 'Intermediate',
        category: category || 'Arcade',
        isPublished: isPublished !== false,
      },
    });

    broadcastChallengeListUpdate();

    res.status(201).json({
      message: 'Problem statement created successfully!',
      challenge: created,
    });
  } catch (error: any) {
    console.error('Create challenge error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A challenge with this title already exists.' });
      return;
    }
    res.status(500).json({ error: 'Failed to create challenge.' });
  }
});

// 4. Organizer: Update / Edit Challenge
router.put('/:id', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      shortDescription,
      fullDescription,
      requirements,
      maxCapacity,
      difficulty,
      category,
      isPublished,
    } = req.body;

    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }

    const updated = await prisma.challenge.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        shortDescription: shortDescription ?? existing.shortDescription,
        fullDescription: fullDescription ?? existing.fullDescription,
        requirements: Array.isArray(requirements) ? requirements : existing.requirements,
        maxCapacity: maxCapacity !== undefined ? Number(maxCapacity) : existing.maxCapacity,
        difficulty: difficulty ?? existing.difficulty,
        category: category ?? existing.category,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : existing.isPublished,
      },
    });

    broadcastChallengeListUpdate();
    broadcastSeatClaim(updated.id, updated.claimedCount, updated.maxCapacity);

    res.json({
      message: 'Problem statement updated successfully!',
      challenge: updated,
    });
  } catch (error: any) {
    console.error('Update challenge error:', error);
    res.status(500).json({ error: 'Failed to update challenge.' });
  }
});

// 5. Organizer: Toggle Single Challenge Publish/Release State
router.patch('/:id/toggle-publish', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.challenge.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }

    const updated = await prisma.challenge.update({
      where: { id },
      data: { isPublished: !existing.isPublished },
    });

    broadcastChallengeListUpdate();

    res.json({
      message: `Challenge "${updated.title}" is now ${updated.isPublished ? 'PUBLISHED & RELEASED' : 'UNPUBLISHED (HIDDEN)'}.`,
      challenge: updated,
    });
  } catch (error: any) {
    console.error('Toggle publish error:', error);
    res.status(500).json({ error: 'Failed to toggle challenge publish status.' });
  }
});

// 6. Organizer: Bulk Publish / Unpublish All Challenges
router.post('/bulk-publish', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { publishAll } = req.body;
    const isPublished = Boolean(publishAll);

    await prisma.challenge.updateMany({
      data: { isPublished },
    });

    broadcastChallengeListUpdate();

    res.json({
      message: `All challenges have been ${isPublished ? 'RELEASED & PUBLISHED' : 'UNPUBLISHED'}.`,
      isPublished,
    });
  } catch (error: any) {
    console.error('Bulk publish error:', error);
    res.status(500).json({ error: 'Failed to bulk update challenges.' });
  }
});

// 7. Organizer: Delete Challenge
router.delete('/:id', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.challenge.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }

    if (existing.claimedCount > 0) {
      res.status(400).json({
        error: `Cannot delete "${existing.title}" because it has already been claimed by ${existing.claimedCount} team(s).`,
      });
      return;
    }

    await prisma.challenge.delete({ where: { id } });
    broadcastChallengeListUpdate();

    res.json({ message: `Challenge "${existing.title}" deleted successfully.` });
  } catch (error: any) {
    console.error('Delete challenge error:', error);
    res.status(500).json({ error: 'Failed to delete challenge.' });
  }
});

// 8. Atomic FCFS Challenge Claim (for Participants)
router.post('/:id/claim', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: challengeId } = req.params;
    const teamId = req.user?.teamId;

    if (!teamId) {
      res.status(400).json({ error: 'You must belong to a team to claim a challenge.' });
      return;
    }

    // Check if target challenge is published & released
    const targetChallenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!targetChallenge || !targetChallenge.isPublished) {
      res.status(400).json({
        error: `This problem statement has not been released yet by the organizers.`,
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
        Array<{ id: string; title: string; maxCapacity: number; claimedCount: number; isPublished: boolean }>
      >`
        SELECT "id", "title", "maxCapacity", "claimedCount", "isPublished"
        FROM "Challenge"
        WHERE "id" = ${challengeId}
        FOR UPDATE
      `;

      if (!lockedChallenges || lockedChallenges.length === 0) {
        throw new Error('Challenge not found.');
      }

      const challenge = lockedChallenges[0];

      if (!challenge.isPublished) {
        throw new Error(`Challenge "${challenge.title}" is currently unpublished and not available.`);
      }

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

      // 4. Assign challenge to the claiming team
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: {
          challengeId,
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
          userId: req.user?.id,
          teamId,
          metadata: {
            challengeId,
            challengeTitle: challenge.title,
            claimedCount: updatedChallenge.claimedCount,
          },
        },
      });

      return { updatedChallenge, updatedTeam };
    });

    // Broadcast seat claim update over Socket.IO
    broadcastSeatClaim(
      claimResult.updatedChallenge.id,
      claimResult.updatedChallenge.claimedCount,
      claimResult.updatedChallenge.maxCapacity
    );

    res.json({
      message: `Challenge "${claimResult.updatedTeam.challenge?.title}" successfully claimed for your team!`,
      challenge: claimResult.updatedTeam.challenge,
      team: claimResult.updatedTeam,
    });
  } catch (error: any) {
    console.error('Claim challenge error:', error);
    if (error.code === 'CHALLENGE_FULL') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message || 'Failed to claim challenge.' });
  }
});

export default router;
