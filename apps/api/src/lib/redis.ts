import { Redis, RedisOptions } from 'ioredis';

/**
 * Redis is OPTIONAL. With REDIS_URL unset the server runs exactly as before
 * (single process, in-memory rate limiting, no cross-instance broadcasting).
 * Set REDIS_URL as soon as you run more than one API replica - see docker-compose.yml.
 */
const REDIS_URL = process.env.REDIS_URL || '';

export const redisEnabled = Boolean(REDIS_URL);

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: null, // required by the socket.io adapter / long-lived clients
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 200, 5000),
  lazyConnect: false,
};

const clients: Redis[] = [];

/**
 * Create a dedicated Redis connection. Pub/sub connections cannot be shared with
 * regular command connections, so the socket adapter asks for its own pair.
 */
export function createRedisClient(name: string): Redis | null {
  if (!redisEnabled) return null;

  const client = new Redis(REDIS_URL, baseOptions);

  client.on('error', (err) => {
    console.error(`[Redis:${name}] ${err.message}`);
  });
  client.on('connect', () => {
    console.log(`[Redis:${name}] connected`);
  });

  clients.push(client);
  return client;
}

let shared: Redis | null | undefined;

/** Shared command connection, used for caching, rate limiting and the leader lock. */
export function getRedis(): Redis | null {
  if (shared === undefined) shared = createRedisClient('main');
  return shared;
}

export async function closeRedis(): Promise<void> {
  await Promise.allSettled(clients.map((c) => c.quit()));
  clients.length = 0;
  shared = undefined;
}
