import { Router, Response } from 'express';
import { EventStage, Role, prisma } from '@repo/db';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { broadcastSeatClaim, broadcastChallengeListUpdate } from '../lib/socket.js';

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

    const publishedCount = isOrganizer
      ? challenges.filter((c) => c.isPublished).length
      : challenges.length;

    const isReleased = isOrganizer ? true : publishedCount > 0;

    res.json({
      isReleased,
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
    const id = req.params.id as string;
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
        requirements: Array.isArray(requirements) ? requirements : (existing.requirements as any),
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
    const id = req.params.id as string;
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
    const id = req.params.id as string;
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
    const challengeId = req.params.id as string;
    let teamId = req.user?.teamId as string | undefined;
    const userId = req.user?.userId || req.user?.id;

    // Fallback: If teamId is missing in JWT payload, look it up directly from the User record in DB
    if (!teamId && userId) {
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      if (dbUser?.teamId) {
        teamId = dbUser.teamId;
      }
    }

    if (!teamId) {
      res.status(400).json({ error: 'You must belong to a registered squad to claim a problem statement.' });
      return;
    }

    // Fast preliminary checks outside transaction (saves latency)
    const [team, challenge] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamId } }),
      prisma.challenge.findUnique({ where: { id: challengeId } }),
    ]);

    if (!team) {
      res.status(404).json({ error: 'Squad not found in database.' });
      return;
    }

    if (team.challengeId) {
      res.status(400).json({ error: 'Your squad has already claimed and locked in a problem statement.' });
      return;
    }

    if (!challenge) {
      res.status(404).json({ error: 'Problem statement not found.' });
      return;
    }

    if (challenge.claimedCount >= challenge.maxCapacity) {
      res.status(409).json({
        error: `All ${challenge.maxCapacity} seats for "${challenge.title}" have already been claimed. Please choose another quest!`,
      });
      return;
    }

    // Execute Atomic Claim within an Interactive Transaction with extended 20s timeout
    const claimResult = await prisma.$transaction(
      async (tx) => {
        // 1. Atomically update challenge counter ONLY if claimedCount < maxCapacity (Race-condition proof)
        const updateResult = await tx.challenge.updateMany({
          where: {
            id: challengeId,
            claimedCount: { lt: challenge.maxCapacity },
          },
          data: {
            claimedCount: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          const err: any = new Error(
            `The last seat for "${challenge.title}" was just claimed by another squad! Please choose another quest.`
          );
          err.code = 'CHALLENGE_FULL';
          throw err;
        }

        // 2. Assign challenge to the claiming team
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

        const updatedChallenge = await tx.challenge.findUniqueOrThrow({ where: { id: challengeId } });

        return { updatedChallenge, updatedTeam };
      },
      {
        timeout: 20000,
        maxWait: 10000,
      }
    );

    // Audit log in background (never blocks transaction response)
    if (userId) {
      prisma.auditLog
        .create({
          data: {
            eventType: 'CHALLENGE_CLAIMED',
            userId,
            teamId,
            metadata: {
              challengeId,
              challengeTitle: challenge.title,
              claimedCount: claimResult.updatedChallenge.claimedCount,
            },
          },
        })
        .catch((err) => console.warn('Audit log write error:', err));
    }

    // Broadcast seat claim update over Socket.IO
    broadcastSeatClaim(
      claimResult.updatedChallenge.id,
      claimResult.updatedChallenge.claimedCount,
      claimResult.updatedChallenge.maxCapacity
    );

    res.json({
      message: `Challenge "${(claimResult.updatedTeam as any).challenge?.title}" successfully claimed for your team!`,
      challenge: (claimResult.updatedTeam as any).challenge,
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
