import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { EventStage } from '@prisma/client';

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // Join default global room
    socket.join('room:global');

    // Client can request to join specific channels
    socket.on('join:room', (roomName: string) => {
      socket.join(roomName);
      console.log(`📌 Socket ${socket.id} joined room: ${roomName}`);
    });

    socket.on('leave:room', (roomName: string) => {
      socket.leave(roomName);
      console.log(`👋 Socket ${socket.id} left room: ${roomName}`);
    });

    socket.on('join:team', (teamId: string) => {
      socket.join(`room:team:${teamId}`);
      console.log(`🛡️ Socket ${socket.id} joined team channel: room:team:${teamId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
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

export function broadcastSubmissionUpdate(teamId: string, teamName: string, roundNumber: number, status: string) {
  if (!io) return;
  io.to('room:organizers').emit('submission:updated', {
    teamId,
    teamName,
    roundNumber,
    status,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastScoreUpdate(teamId: string, teamName: string, roundNumber: number, totalScore: number) {
  if (!io) return;
  io.to('room:organizers').emit('score:updated', {
    teamId,
    teamName,
    roundNumber,
    totalScore,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastTimerAdjust(newEndTime: Date | null, reason: string) {
  if (!io) return;
  io.to('room:global').emit('timer:adjusted', {
    newEndTime: newEndTime ? newEndTime.toISOString() : null,
    reason,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastLeaderboardPublished() {
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
