import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSocketServer } from './lib/socket.js';
import authRoutes from './routes/auth.routes.js';
import challengesRoutes from './routes/challenges.routes.js';
import submissionsRoutes from './routes/submissions.routes.js';
import judgeRoutes from './routes/judge.routes.js';
import adminRoutes from './routes/admin.routes.js';
import publicRoutes from './routes/public.routes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Initialize Socket.IO
initSocketServer(server);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/judge', judgeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Health check
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

server.listen(PORT, () => {
  console.log(`\n🚀 Scratch Game Hackathon Server running at http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO initialized and listening for connections.`);
});

export { app, server };
