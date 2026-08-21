import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { EventStage } from '@repo/db';
import { createRedisClient, redisEnabled } from './redis.js';
import { invalidate, CacheKeys } from './cache.js';
import { auditLog } from './audit.js';

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Without this adapter each replica only reaches the clients holding a socket
  // to itself: a score update broadcast from replica 2 never arrives for anyone
  // connected to replica 1. Redis pub/sub fans every emit out to all replicas.
  if (redisEnabled) {
    const pubClient = createRedisClient('socket-pub');
    const subClient = createRedisClient('socket-sub');
    if (pubClient && subClient) {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Socket.IO] Redis adapter attached - broadcasts span all replicas.');
    }
  }

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    const forwarded = socket.handshake.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim()
      || socket.handshake.address;

    auditLog({
      kind: 'presence',
      event: 'socket:connect',
      socketId: socket.id,
      ip,
      ua: socket.handshake.headers['user-agent'] || null,
    });

    // Join default global room
    socket.join('room:global');

    // Client can request to join specific channels
    socket.on('join:room', (roomName: string) => {
      socket.join(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} joined room: ${roomName}`);
    });

    socket.on('leave:room', (roomName: string) => {
      socket.leave(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} left room: ${roomName}`);
    });

    socket.on('join:team', (teamId: string) => {
      socket.join(`room:team:${teamId}`);
      auditLog({ kind: 'presence', event: 'socket:join_team', socketId: socket.id, ip, teamId });
      console.log(`[Socket.IO] Socket ${socket.id} joined team channel: room:team:${teamId}`);
    });

    socket.on('disconnect', (reason: string) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      auditLog({ kind: 'presence', event: 'socket:disconnect', socketId: socket.id, ip, reason });
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
}

// Typed Real-time Broadcast Helpers
export function broadcastStageChange(newStage: EventStage, stageData: any) {
  void invalidate(CacheKeys.eventState, CacheKeys.leaderboard);
  if (!io) return;
  io.to('room:global').emit('stage:changed', {
    stage: newStage,
    data: stageData,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastSeatClaim(challengeId: string, claimedCount: number, maxCapacity: number) {
  if (!io) return;
  io.to('room:global').emit('challenge:seat_updated', {
    challengeId,
    claimedCount,
    maxCapacity,
    remainingSeats: Math.max(0, maxCapacity - claimedCount),
    timestamp: new Date().toISOString(),
  });
}

export function broadcastSubmissionUpdate(teamId: string, teamName: string, roundNumber: number, status: string, submissionData?: any) {
  void invalidate(CacheKeys.leaderboard);
  if (!io) return;
  io.to('room:global').emit('submission:updated', {
    teamId,
    teamName,
    roundNumber,
    status,
    submission: submissionData,
    timestamp: new Date().toISOString(),
  });
  io.to(`room:team:${teamId}`).emit('submission:updated', {
    teamId,
    teamName,
    roundNumber,
    status,
    submission: submissionData,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastScoreUpdate(teamId: string, teamName: string, roundNumber: number, totalScore: number) {
  void invalidate(CacheKeys.leaderboard);
  if (!io) return;
  io.to('room:global').emit('score:updated', {
    teamId,
    teamName,
    roundNumber,
    totalScore,
    timestamp: new Date().toISOString(),
  });
  io.to(`room:team:${teamId}`).emit('score:updated', {
    teamId,
    teamName,
    roundNumber,
    totalScore,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastTimerAdjust(newEndTime: Date | null, reason: string) {
  void invalidate(CacheKeys.eventState);
  if (!io) return;
  io.to('room:global').emit('timer:adjusted', {
    newEndTime: newEndTime ? newEndTime.toISOString() : null,
    reason,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastLeaderboardPublished() {
  void invalidate(CacheKeys.eventState, CacheKeys.leaderboard);
  if (!io) return;
  io.to('room:global').emit('leaderboard:published', {
    timestamp: new Date().toISOString(),
  });
}

export function broadcastChallengeListUpdate() {
  if (!io) return;
  io.to('room:global').emit('challenge:list_updated', {
    timestamp: new Date().toISOString(),
  });
}

export function broadcastTwistRelease(twistData: any) {
  if (!io) return;
  io.to('room:global').emit('twist:released', {
    twist: twistData,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastTwistUpdate() {
  if (!io) return;
  io.to('room:global').emit('twist:updated', {
    timestamp: new Date().toISOString(),
  });
}
