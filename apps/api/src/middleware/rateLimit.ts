import rateLimit, { Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request } from 'express';
import { getRedis } from '../lib/redis.js';
import { verifyToken } from '../lib/jwt.js';

/**
 * Rate limiting, shared across replicas through Redis.
 *
 * IMPORTANT: at a physical event every participant is usually behind the venue's
 * single public IP. Limiting purely by IP would throttle the whole room the
 * moment one person refreshes hard. So the key is the authenticated user id when
 * a valid token is present, and the client IP only for anonymous traffic.
 */
function clientIp(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  // Collapse IPv6 to its /64 so a single client cannot rotate addresses.
  if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':');
  return ip;
}

function isAuthenticated(req: Request): boolean {
  return keyFor(req).startsWith('u:');
}

function keyFor(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(authHeader.slice(7));
      if (payload?.userId) return `u:${payload.userId}`;
    } catch {
      /* fall through to IP */
    }
  }

  return `ip:${clientIp(req)}`;
}

function makeStore(prefix: string) {
  const redis = getRedis();
  if (!redis) return undefined; // falls back to per-process MemoryStore
  return new RedisStore({
    prefix: `scratch:rl:${prefix}:`,
    sendCommand: (...args: string[]) => (redis as any).call(...args),
  });
}

/** Reads must never be charged to a write budget. */
const isRead = (req: Request) => req.method === 'GET' || req.method === 'HEAD';

function limiter(prefix: string, options: Partial<Options>) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: keyFor,
    store: makeStore(prefix),
    handler: (req, res) => {
      res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
    },
    ...options,
  });
}

/**
 * Broad backstop for all API traffic. It exists to stop runaway loops, not users.
 *
 * A signed-in participant gets their own budget, which is the control that
 * actually matters. Anonymous requests can only be keyed by IP, and at a venue
 * behind one NAT (and behind Cloudflare) that single address IS the entire room:
 * 300 people sharing 3000/min worked out to 10 requests each per minute and
 * handed out 429s within seconds under load test. The anonymous ceiling is
 * therefore very high - those routes are all cache-served, so the traffic is
 * cheap, and Cloudflare handles actual volumetric attacks upstream.
 *
 * /health is exempt: it is the container liveness probe, and a throttled probe
 * marks a healthy replica as failed and pulls it out of the load balancer.
 */
export const apiLimiter = limiter('api', {
  windowMs: 60_000,
  limit: (req) => (isAuthenticated(req) ? 300 : 20_000),
  skip: (req) => req.path === '/health',
});

/**
 * Login/registration. Keyed by the submitted email rather than the IP: 200
 * people checking in from one venue router must not exhaust a shared IP budget,
 * while a single account still cannot be brute forced.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 15,
  skipSuccessfulRequests: true,
  // GET /api/auth/me runs on every page load and carries no email, so it would
  // fall back to the IP key - which at a venue is the whole room sharing a
  // 15-per-15-minute budget. Only the credential-bearing POSTs belong here.
  skip: isRead,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    return email ? `email:${email}` : `ip:${clientIp(req)}`;
  },
  store: makeStore('auth'),
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many attempts for this account. Please wait a few minutes and try again.' });
  },
});

/** 50MB video uploads - the most expensive request in the app. */
export const uploadLimiter = limiter('upload', {
  windowMs: 10 * 60_000,
  limit: 10,
});

/**
 * Judge/admin scoring writes, which fan out socket broadcasts.
 *
 * Mounted on the whole /api/judge and /api/admin routers, so it explicitly skips
 * reads: the judging and organizer dashboards refetch on every socket event and
 * would otherwise burn a write budget just by watching submissions arrive.
 */
export const writeLimiter = limiter('write', {
  windowMs: 60_000,
  limit: 120,
  skip: isRead,
});
