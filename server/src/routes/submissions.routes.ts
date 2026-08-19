import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { broadcastSubmissionUpdate } from '../lib/socket.js';
import { EventStage, SubmissionStatus } from '@prisma/client';

const router = Router();

// 1. Get current team submission history for Round 1 and Round 2 (Latest first)
router.get('/my-team', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamId = req.user?.teamId;
    if (!teamId) {
      res.status(400).json({ error: 'User is not assigned to any team.' });
      return;
    }

    const submissions = await prisma.submission.findMany({
      where: { teamId },
      orderBy: { submittedAt: 'desc' },
    });

    res.json(submissions);
  } catch (error: any) {
    console.error('Fetch my-team submission error:', error);
    res.status(500).json({ error: 'Failed to fetch team submissions.' });
  }
});

// 2. Submit or update Scratch project link (Creates a NEW row in DB for every submission/draft)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamId = req.user?.teamId;
    const { scratchUrl, notes, isDraft, roundNumber = 1 } = req.body;

    if (!teamId) {
      res.status(400).json({ error: 'User is not assigned to any team.' });
      return;
    }

    if (!scratchUrl || typeof scratchUrl !== 'string' || !scratchUrl.trim()) {
      res.status(400).json({ error: 'Scratch Project URL is required.' });
      return;
    }

    const trimmedUrl = scratchUrl.trim();

    // Basic URL validation
    const isValidUrl =
      trimmedUrl.startsWith('http://') ||
      trimmedUrl.startsWith('https://') ||
      trimmedUrl.includes('scratch.mit.edu/projects/');
    if (!isValidUrl) {
      res.status(400).json({
        error: 'Please enter a valid URL (e.g. https://scratch.mit.edu/projects/123456789).',
      });
      return;
    }

    // Check round status & deadline
    const eventConfig = await prisma.eventConfig.findFirst();
    let isLate = false;
    const now = new Date();

    if (roundNumber === 1 && eventConfig?.r1EndTime && now > eventConfig.r1EndTime) {
      isLate = true;
    } else if (roundNumber === 2 && eventConfig?.r2EndTime && now > eventConfig.r2EndTime) {
      isLate = true;
    }

    const targetStatus = isDraft
      ? SubmissionStatus.DRAFT
      : isLate
      ? SubmissionStatus.LATE
      : SubmissionStatus.SUBMITTED;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      res.status(404).json({ error: 'Team not found.' });
      return;
    }

    // Always create a BRAND NEW row in the Submission table
    const submission = await prisma.submission.create({
      data: {
        teamId,
        roundNumber,
        scratchUrl: trimmedUrl,
        notes: notes || null,
        status: targetStatus,
        submittedAt: new Date(),
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        eventType: isDraft ? 'SUBMISSION_SAVED_DRAFT' : 'SUBMISSION_FINALIZED',
        teamId,
        userId: req.user?.id || req.user?.userId,
        metadata: {
          submissionId: submission.id,
          roundNumber,
          scratchUrl: trimmedUrl,
          status: targetStatus,
          isLate,
        },
      },
    });

    // Broadcast to Organizer dashboard
    broadcastSubmissionUpdate(team.id, team.name, roundNumber, targetStatus);

    res.json({
      message: isDraft
        ? 'Draft saved successfully!'
        : isLate
        ? 'Project submitted (marked as late submission).'
        : 'Project submitted successfully for evaluation!',
      submission,
    });
  } catch (error: any) {
    console.error('Submission error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit project.' });
  }
});

export default router;
