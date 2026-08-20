import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSocketServer, broadcastStageChange, broadcastTimerAdjust } from './lib/socket.js';
import { prisma } from './lib/prisma.js';
import { EventStage } from '@prisma/client';
import authRoutes from './routes/auth.routes.js';
import challengesRoutes from './routes/challenges.routes.js';
import submissionsRoutes from './routes/submissions.routes.js';
import judgeRoutes from './routes/judge.routes.js';
import adminRoutes from './routes/admin.routes.js';
import publicRoutes from './routes/public.routes.js';

import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

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
app.use(express.json());

// Robust uploads static folder serving
const uploadsDir = fs.existsSync(path.join(process.cwd(), 'uploads'))
  ? path.join(process.cwd(), 'uploads')
  : fs.existsSync(path.join(process.cwd(), 'server', 'uploads'))
  ? path.join(process.cwd(), 'server', 'uploads')
  : path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Initialize Socket.IO
initSocketServer(server);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/judge', judgeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Root & Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: '🚀 Scratch Game Hackathon API Server is running!',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  setInterval(async () => {
    try {
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
        console.log(`⏰ Scheduled time reached (${eventConfig.r1StartTime.toISOString()}). Automatically starting Round 1 Sprint!`);
        
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
        console.log(`⏰ Scheduled Round 2 start time reached (${eventConfig.r2StartTime.toISOString()}). Automatically starting Round 2 Live Presentations!`);

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
}

server.listen(PORT, () => {
  console.log(`\n🚀 Scratch Game Hackathon Server running at http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO initialized and listening for connections.`);
  startStageWatcher();
});

export { app, server };
