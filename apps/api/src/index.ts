import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSocketServer, broadcastStageChange, broadcastTimerAdjust } from './lib/socket.js';
import { EventStage, prisma } from '@repo/db';
import authRoutes from './routes/auth.routes.js';
import challengesRoutes from './routes/challenges.routes.js';
import submissionsRoutes from './routes/submissions.routes.js';
import judgeRoutes from './routes/judge.routes.js';
import adminRoutes from './routes/admin.routes.js';
import publicRoutes from './routes/public.routes.js';
import twistsRoutes from './routes/twists.routes.js';
import { apiLimiter, authLimiter, writeLimiter } from './middleware/rateLimit.js';
import { acquireLeadership, releaseLeadership, INSTANCE_ID } from './lib/leader.js';
import { getRedis, redisEnabled, closeRedis } from './lib/redis.js';
import { UPLOADS_DIR, ensureUploadDirs } from './lib/uploads.js';
import { sweepOrphanVideos } from './lib/retention.js';
import { initAuditLog, flushAuditLog, pruneAuditLogs, auditLog, AUDIT_LOG_DIR } from './lib/audit.js';
import { startCacheWarmer } from './lib/warmer.js';
import { startMetricsPublisher } from './lib/metrics.js';
import { auditTrail } from './middleware/auditTrail.js';

import path from 'path';

// apps/api/.env when the app is started on its own; the monorepo root .env when
// started through `npm run dev` at the root (dotenv never overrides real env vars,
// so docker compose values always win).
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Behind the nginx load balancer in docker-compose.yml, so req.ip must come from
// X-Forwarded-For or every request would look like it came from the proxy.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // allow all localhost ports for dev flexibility
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Backstop limiter for every API route (see middleware/rateLimit.ts for why the
// key is the user id rather than the IP).
app.use('/api', apiLimiter);

// Every API call is appended to the on-disk trail in lib/audit.ts.
initAuditLog();
app.use('/api', auditTrail);

// Uploaded videos. In the Docker stack nginx serves this directory straight off
// the shared volume, so this route is the fallback for running the API alone.
ensureUploadDirs();
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize Socket.IO
initSocketServer(server);

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/judge', writeLimiter, judgeRoutes);
app.use('/api/admin', writeLimiter, adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/twists', twistsRoutes);

// Root & Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Scratch Game Hackathon API Server is running!',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', async (req, res) => {
  let redis: 'ok' | 'down' | 'disabled' = 'disabled';
  if (redisEnabled) {
    try {
      await getRedis()!.ping();
      redis = 'ok';
    } catch {
      redis = 'down';
    }
  }

  res.status(redis === 'down' ? 503 : 200).json({
    status: redis === 'down' ? 'degraded' : 'ok',
    instance: INSTANCE_ID,
    redis,
    timestamp: new Date().toISOString(),
  });
});

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error.',
  });
});

// Background Automated Event Stage Scheduler (Ticks every second)
function startStageWatcher() {
  const timer = setInterval(async () => {
    try {
      // Exactly one replica may run this loop - it writes EventConfig, appends
      // audit rows and broadcasts. See lib/leader.ts.
      if (!(await acquireLeadership())) return;

      const eventConfig = await prisma.eventConfig.findFirst();
      if (!eventConfig) return;

      const now = new Date();

      // 1. Auto-Start Round 1 when scheduled start time arrives
      if (
        eventConfig.currentStage !== EventStage.ROUND1_BUILDING &&
        eventConfig.currentStage !== EventStage.ROUND1_JUDGING &&
        eventConfig.currentStage !== EventStage.ROUND2_PREP &&
        eventConfig.currentStage !== EventStage.ROUND2_LIVE &&
        eventConfig.currentStage !== EventStage.ROUND2_JUDGING &&
        eventConfig.currentStage !== EventStage.COMPLETED &&
        eventConfig.r1StartTime &&
        now >= eventConfig.r1StartTime
      ) {
        console.log(`[Scheduler] Scheduled time reached (${eventConfig.r1StartTime.toISOString()}). Automatically starting Round 1 Sprint!`);
        
        let newEndTime = eventConfig.r1EndTime;
        if (!newEndTime || newEndTime <= now) {
          newEndTime = new Date(now.getTime() + 120 * 60 * 1000);
        }

        const updated = await prisma.eventConfig.update({
          where: { id: eventConfig.id },
          data: {
            currentStage: EventStage.ROUND1_BUILDING,
            r1EndTime: newEndTime,
          },
        });

        await prisma.auditLog.create({
          data: {
            eventType: 'AUTO_STAGE_TRANSITION',
            metadata: {
              newStage: EventStage.ROUND1_BUILDING,
              r1StartTime: eventConfig.r1StartTime,
              r1EndTime: newEndTime,
              reason: 'Scheduled start timer reached zero',
            },
          },
        });

        broadcastStageChange(EventStage.ROUND1_BUILDING, updated);
        broadcastTimerAdjust(newEndTime, 'Round 1 Build Sprint Started Automatically!');
      }

      // 2. Auto-Start Round 2 Live Presentations when scheduled start time arrives
      if (
        eventConfig.currentStage !== EventStage.ROUND2_LIVE &&
        eventConfig.currentStage !== EventStage.ROUND2_JUDGING &&
        eventConfig.currentStage !== EventStage.COMPLETED &&
        eventConfig.r2StartTime &&
        now >= eventConfig.r2StartTime
      ) {
        console.log(`[Scheduler] Scheduled Round 2 start time reached (${eventConfig.r2StartTime.toISOString()}). Automatically starting Round 2 Live Presentations!`);

        let newEndTime = eventConfig.r2EndTime;
        if (!newEndTime || newEndTime <= now) {
          newEndTime = new Date(now.getTime() + 60 * 60 * 1000);
        }

        const updated = await prisma.eventConfig.update({
          where: { id: eventConfig.id },
          data: {
            currentStage: EventStage.ROUND2_LIVE,
            r2EndTime: newEndTime,
          },
        });

        await prisma.auditLog.create({
          data: {
            eventType: 'AUTO_STAGE_TRANSITION',
            metadata: {
              newStage: EventStage.ROUND2_LIVE,
              r2StartTime: eventConfig.r2StartTime,
              r2EndTime: newEndTime,
              reason: 'Scheduled Round 2 start timer reached zero',
            },
          },
        });

        broadcastStageChange(EventStage.ROUND2_LIVE, updated);
        broadcastTimerAdjust(newEndTime, 'Round 2 Live Presentations Started Automatically!');
      }
    } catch (err) {
      console.error('Error in stage watcher ticker:', err);
    }
  }, 1000);

  timer.unref?.();
  return timer;
}

// Files whose submission row never got created (validation failed after the
// upload, or the process died mid-request) are invisible to the per-submission
// prune, so one replica sweeps them hourly.
const ORPHAN_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

function startOrphanSweeper() {
  const timer = setInterval(async () => {
    if (!(await acquireLeadership())) return;
    await sweepOrphanVideos();
    await pruneAuditLogs();
  }, ORPHAN_SWEEP_INTERVAL_MS);

  timer.unref?.();
  return timer;
}

const stageWatcher = { timer: null as NodeJS.Timeout | null };
const orphanSweeper = { timer: null as NodeJS.Timeout | null };
const cacheWarmer = { timer: null as NodeJS.Timeout | null };
const metricsPublisher = { timer: null as NodeJS.Timeout | null };

server.listen(PORT, () => {
  console.log(`\n[Server] Scratch Game Hackathon Server running at http://localhost:${PORT}`);
  console.log(`[Server] Instance ${INSTANCE_ID} | Redis ${redisEnabled ? 'enabled' : 'disabled (single-process mode)'}`);
  console.log(`[Socket.IO] Initialized and listening for connections.`);
  console.log(`[Audit] Event trail: ${AUDIT_LOG_DIR}`);
  stageWatcher.timer = startStageWatcher();
  orphanSweeper.timer = startOrphanSweeper();
  cacheWarmer.timer = startCacheWarmer();
  metricsPublisher.timer = startMetricsPublisher();
  auditLog({ kind: 'system', event: 'startup', port: PORT });
});

// Graceful shutdown: hand leadership over immediately instead of making the next
// replica wait out the lock TTL, and let in-flight uploads finish.
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] ${signal} received, shutting down ${INSTANCE_ID}...`);

  if (stageWatcher.timer) clearInterval(stageWatcher.timer);
  if (orphanSweeper.timer) clearInterval(orphanSweeper.timer);
  if (cacheWarmer.timer) clearInterval(cacheWarmer.timer);
  if (metricsPublisher.timer) clearInterval(metricsPublisher.timer);
  server.close();

  auditLog({ kind: 'system', event: 'shutdown', signal });
  flushAuditLog();

  await releaseLeadership();
  await prisma.$disconnect().catch(() => {});
  await closeRedis().catch(() => {});

  setTimeout(() => process.exit(0), 250).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

export { app, server };
