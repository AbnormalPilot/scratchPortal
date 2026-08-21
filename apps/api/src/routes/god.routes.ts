import { Router, Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { collectMetrics } from '../lib/metrics.js';
import { GOD_PAGE } from '../god/page.js';

const router = Router();

const USER = process.env.GOD_USER || 'god';
const PASSWORD = process.env.GOD_PASSWORD || 'god';

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * HTTP Basic auth, checked here on the server - the browser shows its own native
 * credential prompt, so this page is reachable without touching the app's login
 * or holding an organizer session.
 */
function basicAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';

  if (header.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);

    if (safeEqual(user, USER) && safeEqual(pass, PASSWORD)) return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="god", charset="UTF-8"');
  res.status(401).send('Authentication required.');
}

router.use(basicAuth);

router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('html').send(GOD_PAGE);
});

router.get('/metrics', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await collectMetrics());
  } catch (error: any) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to collect metrics.' });
  }
});

export default router;
