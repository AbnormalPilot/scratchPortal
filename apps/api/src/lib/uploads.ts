import path from 'path';
import fs from 'fs';

/**
 * Where submission videos land.
 *
 * Every replica must point at the same directory, otherwise a video accepted by
 * api-2 is a 404 for anyone served by api-1. In Docker that is a shared volume
 * set through UPLOADS_DIR; locally it defaults to apps/api/uploads.
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), 'uploads');

export const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');

/** Public path prefix stored in Submission.videoUrl and served by nginx. */
export const VIDEO_URL_PREFIX = '/uploads/videos/';

export function ensureUploadDirs(): void {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-matroska': '.mkv',
};

const ALLOWED_EXTENSIONS = new Set(Object.values(EXTENSION_BY_MIME));

/**
 * The extension we are willing to write to disk.
 *
 * Never reuse the extension off the client's filename: uploads are served as
 * static files from the same origin as the SPA, so a file that lands as .html
 * or .svg becomes script running next to the token in localStorage. The upload
 * filter itself stays permissive (phones send odd mime types for perfectly good
 * videos) - we just refuse to give the file a dangerous name.
 */
export function safeVideoExtension(file: { mimetype?: string; originalname?: string }): string {
  const byMime = EXTENSION_BY_MIME[(file.mimetype || '').toLowerCase()];
  if (byMime) return byMime;

  const byName = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_EXTENSIONS.has(byName)) return byName;

  return '.mp4';
}

/**
 * Absolute path for a stored video URL, or null if the URL is external (a
 * YouTube link) or tries to escape the videos directory.
 */
export function localVideoPath(videoUrl?: string | null): string | null {
  if (!videoUrl || !videoUrl.startsWith(VIDEO_URL_PREFIX)) return null;

  const name = videoUrl.slice(VIDEO_URL_PREFIX.length);
  const resolved = path.resolve(VIDEOS_DIR, name);
  if (path.dirname(resolved) !== VIDEOS_DIR) return null;

  return resolved;
}

/** Deletes a stored video. External links and already-missing files are no-ops. */
export async function deleteLocalVideo(videoUrl?: string | null): Promise<boolean> {
  const target = localVideoPath(videoUrl);
  if (!target) return false;

  try {
    await fs.promises.unlink(target);
    return true;
  } catch (err: any) {
    if (err.code !== 'ENOENT') console.error(`[Uploads] failed to delete ${target}: ${err.message}`);
    return false;
  }
}
