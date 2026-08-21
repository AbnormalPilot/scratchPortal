import { Router, Response } from 'express';
import { Role, prisma } from '@repo/db';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { broadcastTwistRelease, broadcastTwistUpdate } from '../lib/socket.js';

const router = Router();

// 1. Get all twists (Public/Participants see released only; Organizers see all)
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
        // Unauthenticated/invalid token
      }
    }

    const whereClause = isOrganizer ? {} : { isReleased: true };

    const twists = await prisma.twist.findMany({
      where: whereClause,
      orderBy: isOrganizer ? { createdAt: 'asc' } : { releasedAt: 'desc' },
    });

    res.json({
      twists,
      releasedCount: twists.filter((t) => t.isReleased).length,
    });
  } catch (error: any) {
    console.error('Fetch twists error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament twists.' });
  }
});

// 2. Organizer: Create New Twist
router.post('/', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, bonusPoints, isReleased } = req.body;

    if (!title || !description) {
      res.status(400).json({ error: 'Title and description are required for the twist.' });
      return;
    }

    const shouldRelease = Boolean(isReleased);

    const created = await prisma.twist.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        bonusPoints: Number(bonusPoints) || 5,
        isReleased: shouldRelease,
        releasedAt: shouldRelease ? new Date() : null,
      },
    });

    if (shouldRelease) {
      broadcastTwistRelease(created);
    } else {
      broadcastTwistUpdate();
    }

    res.status(201).json({
      message: shouldRelease ? 'Twist created and broadcasted to all squads!' : 'Draft twist saved in vault.',
      twist: created,
    });
  } catch (error: any) {
    console.error('Create twist error:', error);
    res.status(500).json({ error: 'Failed to create tournament twist.' });
  }
});

// 3. Organizer: Update / Edit Twist
router.put('/:id', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, description, bonusPoints, isReleased } = req.body;

    const existing = await prisma.twist.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Twist not found.' });
      return;
    }

    const updated = await prisma.twist.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : existing.title,
        description: description !== undefined ? description.trim() : existing.description,
        bonusPoints: bonusPoints !== undefined ? Number(bonusPoints) : existing.bonusPoints,
        isReleased: isReleased !== undefined ? Boolean(isReleased) : existing.isReleased,
        releasedAt:
          isReleased !== undefined
            ? Boolean(isReleased)
              ? existing.releasedAt || new Date()
              : null
            : existing.releasedAt,
      },
    });

    broadcastTwistUpdate();

    res.json({
      message: 'Twist updated successfully.',
      twist: updated,
    });
  } catch (error: any) {
    console.error('Update twist error:', error);
    res.status(500).json({ error: 'Failed to update tournament twist.' });
  }
});

// 4. Organizer: Release Twist Live to All Teams
router.patch('/:id/release', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.twist.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'Twist not found.' });
      return;
    }

    const released = await prisma.twist.update({
      where: { id },
      data: {
        isReleased: true,
        releasedAt: new Date(),
      },
    });

    broadcastTwistRelease(released);
    broadcastTwistUpdate();

    res.json({
      message: `Surprise Twist "${released.title}" is now LIVE and broadcasted to all squads!`,
      twist: released,
    });
  } catch (error: any) {
    console.error('Release twist error:', error);
    res.status(500).json({ error: 'Failed to release tournament twist.' });
  }
});

// 5. Organizer: Unrelease / Recall Twist
router.patch('/:id/unrelease', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.twist.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'Twist not found.' });
      return;
    }

    const unreleased = await prisma.twist.update({
      where: { id },
      data: {
        isReleased: false,
        releasedAt: null,
      },
    });

    broadcastTwistUpdate();

    res.json({
      message: `Twist "${unreleased.title}" has been recalled to drafts.`,
      twist: unreleased,
    });
  } catch (error: any) {
    console.error('Unrelease twist error:', error);
    res.status(500).json({ error: 'Failed to recall tournament twist.' });
  }
});

// 6. Organizer: Bulk Release ALL Twists At Once
router.post('/release-all', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await prisma.twist.updateMany({
      where: { isReleased: false },
      data: {
        isReleased: true,
        releasedAt: new Date(),
      },
    });

    const allReleased = await prisma.twist.findMany({
      where: { isReleased: true },
      orderBy: { releasedAt: 'desc' },
    });

    broadcastTwistRelease(allReleased);
    broadcastTwistUpdate();

    res.json({
      message: `⚡ All ${updated.count} vault twists have been RELEASED to all squads simultaneously!`,
      count: updated.count,
    });
  } catch (error: any) {
    console.error('Bulk release twists error:', error);
    res.status(500).json({ error: 'Failed to bulk release twists.' });
  }
});

// 7. Organizer: Bulk Unrelease / Hide ALL Twists
router.post('/unrelease-all', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await prisma.twist.updateMany({
      where: { isReleased: true },
      data: {
        isReleased: false,
        releasedAt: null,
      },
    });

    broadcastTwistUpdate();

    res.json({
      message: `All twists have been recalled back to the draft vault.`,
      count: updated.count,
    });
  } catch (error: any) {
    console.error('Bulk unrelease twists error:', error);
    res.status(500).json({ error: 'Failed to bulk unrelease twists.' });
  }
});

// 8. Organizer: Delete Twist
router.delete('/:id', requireAuth, requireRole(Role.ORGANIZER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.twist.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'Twist not found.' });
      return;
    }

    await prisma.twist.delete({ where: { id } });
    broadcastTwistUpdate();

    res.json({
      message: `Twist "${existing.title}" deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Delete twist error:', error);
    res.status(500).json({ error: 'Failed to delete tournament twist.' });
  }
});

export default router;
