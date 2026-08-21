import { Request, Response, NextFunction } from 'express';
import { auditLog } from '../lib/audit.js';
import { verifyToken } from '../lib/jwt.js';

/**
 * Who did what, appended to the on-disk trail.
 *
 * Identity comes from the JWT, which is the only reliable identifier here: with
 * a few hundred people on one venue wifi, NAT collapses everybody onto a single
 * IP, so the address tells you almost nothing on its own.
 */

// Mounted at app.use('/api', ...), so req.path here is '/health', not '/api/health'.
// Container healthchecks fire every 15s per replica - pure noise in the trail.
const SKIP_PATHS = new Set(['/health']);
const SENSITIVE_KEY = /pass|token|secret|authorization|hash/i;

function summarizeBody(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = '[redacted]';
    } else if (typeof value === 'string') {
      out[key] = value.length > 200 ? value.slice(0, 200) + '…' : value;
    } else if (value === null || ['number', 'boolean'].includes(typeof value)) {
      out[key] = value;
    } else {
      out[key] = `[${Array.isArray(value) ? 'array' : typeof value}]`;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function actor(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return { user: null as null | Record<string, unknown> };

  try {
    const p = verifyToken(header.slice(7));
    return {
      user: {
        id: p.userId,
        email: p.email,
        name: p.fullName,
        role: p.role,
        teamId: p.teamId ?? null,
        isTeamLeader: Boolean(p.isTeamLeader),
      },
    };
  } catch {
    return { user: null, tokenInvalid: true };
  }
}

export function auditTrail(req: Request, res: Response, next: NextFunction) {
  if (SKIP_PATHS.has(req.path)) return next();


  const startedAt = Date.now();

  res.on('finish', () => {
    const { user, tokenInvalid } = actor(req) as any;

    auditLog({
      kind: req.method === 'GET' ? 'read' : 'write',
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms: Date.now() - startedAt,
      ip: req.ip,
      ua: req.headers['user-agent'] || null,
      user,
      tokenInvalid: tokenInvalid || undefined,
      body: req.method === 'GET' ? undefined : summarizeBody(req.body),
      file: (req as any).file
        ? { field: (req as any).file.fieldname, name: (req as any).file.originalname, bytes: (req as any).file.size }
        : undefined,
    });
  });

  next();
}
