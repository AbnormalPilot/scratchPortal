import { Router, Response } from 'express';
import { EventStage, SubmissionStatus, prisma } from '@repo/db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import { broadcastSubmissionUpdate } from '../lib/socket.js';
import { VIDEOS_DIR, VIDEO_URL_PREFIX, ensureUploadDirs, safeVideoExtension } from '../lib/uploads.js';
import { pruneSupersededVideos } from '../lib/retention.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Shared with index.ts and with the other replicas via the uploads volume.
ensureUploadDirs();
const uploadDir = VIDEOS_DIR;

// Configure Multer for 50MB video files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req: any, file, cb) => {
    const teamId = req.user?.teamId || 'team';
    const round = Number(req.body?.roundNumber) === 2 ? 'r2' : 'r1';
    // Extension comes from an allowlist, never from the client's filename.
    cb(null, `team_${teamId}_${round}_${Date.now()}${safeVideoExtension(file)}`);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.mp4', '.webm', '.mov', '.mkv'];

  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid video format. Only MP4, WebM, and MOV video files are supported.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 Megabytes Strict Cap
  },
  fileFilter,
});

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

// 2. Submit or update Scratch project link (Supports Multipart video upload + JSON)
router.post(
  '/',
  requireAuth,
  uploadLimiter,
  (req: any, res: any, next: any) => {
    // Wrap upload with friendly size error handling
    upload.single('videoFile')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Video file too large. Maximum allowed video size is 50 MB.',
          });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message || 'Failed to upload video.' });
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamId = req.user?.teamId;
      const {
        scratchUrl,
        shortDescription,
        videoUrl: manualVideoUrl,
        notes,
        roundNumber = 1,
      } = req.body;

      const isDraft = req.body.isDraft === true || req.body.isDraft === 'true';

      if (!teamId) {
        // Clean up uploaded file if rejected
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(400).json({ error: 'User is not assigned to any team.' });
        return;
      }

      // STRICT USER RULE: Save Draft CANNOT accept uploaded video files
      if (isDraft && req.file) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({
          error:
            'Video file upload is only allowed on Final Submission. Please save drafts with Scratch URL, Short Description, and Video Links only.',
        });
        return;
      }

      const hasVideoLink = manualVideoUrl && typeof manualVideoUrl === 'string' && manualVideoUrl.trim();
      const hasContent = (scratchUrl && typeof scratchUrl === 'string' && scratchUrl.trim()) ||
                         (shortDescription && typeof shortDescription === 'string' && shortDescription.trim()) ||
                         (notes && typeof notes === 'string' && notes.trim()) ||
                         hasVideoLink;

      if (!isDraft) {
        if (!scratchUrl || typeof scratchUrl !== 'string' || !scratchUrl.trim()) {
          if (req.file) fs.unlinkSync(req.file.path);
          res.status(400).json({ error: 'Scratch Project URL is required for final submission.' });
          return;
        }

        // STRICT USER RULE: Short Description & Story Pitch is REQUIRED on final submission
        if (!shortDescription || typeof shortDescription !== 'string' || !shortDescription.trim()) {
          if (req.file) fs.unlinkSync(req.file.path);
          res.status(400).json({ error: 'Short Description & Story Pitch is required for final submission.' });
          return;
        }

        // STRICT USER RULE: Video (uploaded file or video link) is REQUIRED on final submission
        if (!req.file && !hasVideoLink) {
          res.status(400).json({ error: 'A gameplay demo video (uploaded file or video link) is required for final submission.' });
          return;
        }
      } else {
        if (!hasContent) {
          res.status(400).json({ error: 'Please fill in at least one field to save a draft.' });
          return;
        }
      }

      const trimmedUrl = (scratchUrl && typeof scratchUrl === 'string') ? scratchUrl.trim() : '';

      // Basic URL validation if URL was entered
      if (trimmedUrl) {
        const isValidUrl =
          trimmedUrl.startsWith('http://') ||
          trimmedUrl.startsWith('https://') ||
          trimmedUrl.includes('scratch.mit.edu/projects/');
        if (!isValidUrl && !isDraft) {
          if (req.file) fs.unlinkSync(req.file.path);
          res.status(400).json({
            error: 'Please enter a valid URL (e.g. https://scratch.mit.edu/projects/123456789).',
          });
          return;
        }
      }

      // Check round status & deadline
      const eventConfig = await prisma.eventConfig.findFirst();
      let isLate = false;
      const now = new Date();

      if (Number(roundNumber) === 1 && eventConfig?.r1EndTime && now > eventConfig.r1EndTime) {
        isLate = true;
      } else if (Number(roundNumber) === 2 && eventConfig?.r2EndTime && now > eventConfig.r2EndTime) {
        isLate = true;
      }

      const targetStatus = isDraft
        ? SubmissionStatus.DRAFT
        : isLate
        ? SubmissionStatus.LATE
        : SubmissionStatus.SUBMITTED;

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(404).json({ error: 'Team not found.' });
        return;
      }

      // Determine final video URL (Uploaded File path vs External Link)
      let resolvedVideoUrl: string | null = null;
      let videoFileName: string | null = null;
      let videoFileSize: number | null = null;

      if (req.file) {
        resolvedVideoUrl = `${VIDEO_URL_PREFIX}${req.file.filename}`;
        videoFileName = req.file.originalname;
        videoFileSize = req.file.size;
      } else if (manualVideoUrl && typeof manualVideoUrl === 'string' && manualVideoUrl.trim()) {
        resolvedVideoUrl = manualVideoUrl.trim();
      }

      // Always create a BRAND NEW row in the Submission table
      const submission = await prisma.submission.create({
        data: {
          teamId,
          roundNumber: Number(roundNumber) || 1,
          scratchUrl: trimmedUrl,
          shortDescription: shortDescription?.trim() || null,
          videoUrl: resolvedVideoUrl,
          videoFileName,
          videoFileSize,
          notes: notes?.trim() || null,
          status: targetStatus,
          submittedAt: new Date(),
        },
      });

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          eventType: isDraft ? 'SUBMISSION_SAVED_DRAFT' : 'SUBMISSION_FINALIZED',
          teamId,
          userId: req.user?.userId,
          metadata: {
            submissionId: submission.id,
            roundNumber,
            scratchUrl: trimmedUrl,
            hasVideoUpload: Boolean(req.file),
            videoUrl: resolvedVideoUrl,
            status: targetStatus,
            isLate,
          },
        },
      });

      // Only the newest submission per round is ever read, so drop the files the
      // earlier ones were holding. Deliberately not awaited - cleanup must not
      // slow down or fail the submission.
      void pruneSupersededVideos(teamId, Number(roundNumber) || 1, submission.id);

      // Broadcast to Organizer and Judge dashboards in real-time
      broadcastSubmissionUpdate(team.id, team.name, Number(roundNumber) || 1, targetStatus, submission);

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
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: error.message || 'Failed to submit project.' });
    }
  }
);

export default router;
