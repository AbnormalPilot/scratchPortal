import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { EventStage } from '@repo/db';
import { createRedisClient, redisEnabled } from './redis.js';
import { invalidate, invalidatePrefix, CacheKeys, ChallengeCacheKeys, TwistCacheKeys, JUDGE_TEAMS_PREFIX, mePrefix } from './cache.js';
import { auditLog } from './audit.js';
import { verifyToken, TokenPayload } from './jwt.js';

let io: Server | null = null;

// Flood control thresholds. A real client emits a handful of joins per session.
const EVENT_WINDOW_MS = 10_000;
const MAX_EVENTS_PER_WINDOW = 40;
const MAX_STRIKES = 3;
const MAX_ROOMS_PER_SOCKET = 12;

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

  // Optional handshake auth. Public viewers (leaderboard screens) may connect
  // without a token; only authenticated sockets can enter private rooms.
  io.use((socket, next) => {
    const raw = socket.handshake.auth?.token || socket.handshake.query?.token;
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (token) {
      try {
        socket.data.user = verifyToken(String(token));
      } catch {
        socket.data.user = undefined; // expired or forged - treated as a guest
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Flood control: a single client should never need more than a handful of
    // control messages. Past the burst allowance we ignore, then disconnect -
    // one abusive socket cannot cost the other 299 people anything.
    let events = 0;
    let strikes = 0;
    const windowTimer = setInterval(() => { events = 0; }, EVENT_WINDOW_MS);
    windowTimer.unref?.();

    const floodGuard = (): boolean => {
      if (++events <= MAX_EVENTS_PER_WINDOW) return false;
      if (++strikes >= MAX_STRIKES) {
        auditLog({ kind: 'security', event: 'socket:flood_disconnect', socketId: socket.id, ip, events });
        console.warn(`[Socket.IO] Disconnecting ${socket.id} for flooding (${events} events/${EVENT_WINDOW_MS}ms)`);
        socket.disconnect(true);
      }
      return true;
    };

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
      if (floodGuard()) return;
      if (typeof roomName !== 'string' || roomName.length > 64) return;

      // Team rooms carry another team's submissions and scores - they are only
      // reachable through join:team, which checks who is asking.
      if (roomName.startsWith('room:team:')) {
        auditLog({ kind: 'security', event: 'socket:room_denied', socketId: socket.id, ip, roomName });
        return;
      }
      if (socket.rooms.size > MAX_ROOMS_PER_SOCKET) return;

      socket.join(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} joined room: ${roomName}`);
    });

    socket.on('leave:room', (roomName: string) => {
      if (floodGuard()) return;
      if (typeof roomName !== 'string') return;
      socket.leave(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} left room: ${roomName}`);
    });

    socket.on('join:team', (teamId: string) => {
      if (floodGuard()) return;
      if (typeof teamId !== 'string' || teamId.length > 64) return;

      const user = socket.data.user as TokenPayload | undefined;
      const isStaff = user?.role === 'JUDGE' || user?.role === 'ORGANIZER';
      const ownsTeam = Boolean(user?.teamId && user.teamId === teamId);

      if (!isStaff && !ownsTeam) {
        // Was previously open to anyone: a guest could subscribe to any team's
        // live submissions and scores just by guessing an id.
        auditLog({
          kind: 'security',
          event: 'socket:team_join_denied',
          socketId: socket.id,
          ip,
          teamId,
          user: user ? { id: user.userId, email: user.email, role: user.role } : null,
        });
        return;
      }

      socket.join(`room:team:${teamId}`);
      auditLog({ kind: 'presence', event: 'socket:join_team', socketId: socket.id, ip, teamId, userId: user?.userId });
      console.log(`[Socket.IO] Socket ${socket.id} joined team channel: room:team:${teamId}`);
    });

    socket.on('disconnect', (reason: string) => {
      clearInterval(windowTimer);
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
  void invalidate(CacheKeys.adminOverview);
  void invalidatePrefix(JUDGE_TEAMS_PREFIX);
  // The stage is part of the challenge payload, so that list goes too.
  void invalidate(CacheKeys.eventState, CacheKeys.leaderboard, ...ChallengeCacheKeys);
  if (!io) return;
  io.to('room:global').emit('stage:changed', {
    stage: newStage,
    data: stageData,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastSeatClaim(challengeId: string, claimedCount: number, maxCapacity: number) {
  void invalidate(CacheKeys.adminOverview);
  void invalidate(...ChallengeCacheKeys);
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
  void invalidate(CacheKeys.adminOverview, CacheKeys.teamSubmissions(teamId));
  void invalidatePrefix(mePrefix(teamId));
  void invalidatePrefix(JUDGE_TEAMS_PREFIX);
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
  void invalidate(CacheKeys.adminOverview);
  void invalidatePrefix(mePrefix(teamId));
  void invalidatePrefix(JUDGE_TEAMS_PREFIX);
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
  void invalidate(CacheKeys.adminOverview);
  void invalidate(CacheKeys.eventState, CacheKeys.leaderboard);
  if (!io) return;
  io.to('room:global').emit('leaderboard:published', {
    timestamp: new Date().toISOString(),
  });
}

export function broadcastChallengeListUpdate() {
  void invalidate(...ChallengeCacheKeys);
  if (!io) return;
  io.to('room:global').emit('challenge:list_updated', {
    timestamp: new Date().toISOString(),
  });
}

export function broadcastTwistRelease(twistData: any) {
  void invalidate(...TwistCacheKeys);
  if (!io) return;
  io.to('room:global').emit('twist:released', {
    twist: twistData,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastTwistUpdate() {
  void invalidate(...TwistCacheKeys);
  if (!io) return;
  io.to('room:global').emit('twist:updated', {
    timestamp: new Date().toISOString(),
  });
}
