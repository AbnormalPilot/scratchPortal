import fs from 'fs';
import path from 'path';
import { prisma } from '@repo/db';
import { VIDEOS_DIR, VIDEO_URL_PREFIX, deleteLocalVideo, localVideoPath } from './uploads.js';

/**
 * Keep only the newest video per team and round.
 *
 * Judges always resolve the newest SUBMITTED/LATE row for a round
 * (judge.routes.ts), so every earlier upload is 50MB nothing will ever request.
 * Without this the volume grows with every resubmission instead of settling at
 * one file per team per round.
 *
 * The Submission rows are kept - only the file goes, and videoUrl is cleared so
 * the UI shows "no video" rather than a link that 404s.
 */
export async function pruneSupersededVideos(
  teamId: string,
  roundNumber: number,
  keepSubmissionId: string
): Promise<number> {
  try {
    const superseded = await prisma.submission.findMany({
      where: {
        teamId,
        roundNumber,
        id: { not: keepSubmissionId },
        videoUrl: { startsWith: VIDEO_URL_PREFIX },
      },
      select: { id: true, videoUrl: true },
    });

    if (superseded.length === 0) return 0;

    let removed = 0;
    for (const row of superseded) {
      if (await deleteLocalVideo(row.videoUrl)) removed++;
      await prisma.submission.update({ where: { id: row.id }, data: { videoUrl: null } });
    }

    if (removed) console.log(`[Retention] team ${teamId} round ${roundNumber}: removed ${removed} superseded video(s).`);
    return removed;
  } catch (err: any) {
    // Never fail a submission because cleanup failed.
    console.error(`[Retention] prune failed for team ${teamId}: ${err.message}`);
    return 0;
  }
}

const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000;

/**
 * Deletes files on the volume that no Submission row points at - leftovers from
 * a request that wrote the file and then failed validation or crashed before the
 * row was created. Only touches files older than an hour so an upload in flight
 * is never swept. Leader-only (see lib/leader.ts).
 */
export async function sweepOrphanVideos(): Promise<number> {
  try {
    const files = await fs.promises.readdir(VIDEOS_DIR).catch(() => [] as string[]);
    if (files.length === 0) return 0;

    const referenced = new Set(
      (
        await prisma.submission.findMany({
          where: { videoUrl: { startsWith: VIDEO_URL_PREFIX } },
          select: { videoUrl: true },
        })
      )
        .map((s) => localVideoPath(s.videoUrl))
        .filter((p): p is string => Boolean(p))
    );

    const cutoff = Date.now() - ORPHAN_MIN_AGE_MS;
    let removed = 0;

    for (const name of files) {
      const full = path.join(VIDEOS_DIR, name);
      if (referenced.has(full)) continue;

      const stat = await fs.promises.stat(full).catch(() => null);
      if (!stat || !stat.isFile() || stat.mtimeMs > cutoff) continue;

      await fs.promises.unlink(full).catch(() => {});
      removed++;
    }

    if (removed) console.log(`[Retention] swept ${removed} orphaned video file(s).`);
    return removed;
  } catch (err: any) {
    console.error(`[Retention] orphan sweep failed: ${err.message}`);
    return 0;
  }
}
