import { getRedis } from './redis.js';

/**
 * Short-TTL read-through cache for hot public endpoints.
 *
 * The leaderboard query loads every team with five nested relations. When the
 * organizer publishes results, every connected client requests it at the same
 * second - that is the one query that actually falls over at 200 users. One DB
 * read per TTL window serves all of them instead.
 */

// De-dupes concurrent misses inside a single process (Redis handles the rest).
const inflight = new Map<string, Promise<any>>();

// Fallback store so a single-instance deploy (or local dev with no Redis) still
// gets the thundering-herd protection. Bounded by the handful of keys below.
const memory = new Map<string, { value: any; expiresAt: number }>();

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const redis = getRedis();

  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit) return JSON.parse(hit) as T;
    } catch (err: any) {
      console.error(`[Cache] read failed for ${key}: ${err.message}`);
    }
  } else {
    const hit = memory.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  }

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    const value = await loader();
    if (redis) {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err: any) {
        console.error(`[Cache] write failed for ${key}: ${err.message}`);
      }
    } else {
      memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

/** Call after any write that changes what a cached endpoint returns. */
export async function invalidate(...keys: string[]): Promise<void> {
  keys.forEach((k) => {
    inflight.delete(k);
    memory.delete(k);
  });
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err: any) {
    console.error(`[Cache] invalidate failed: ${err.message}`);
  }
}

export const CacheKeys = {
  eventState: 'scratch:cache:event-state',
  leaderboard: 'scratch:cache:leaderboard',
  challenges: (isOrganizer: boolean) => `scratch:cache:challenges:${isOrganizer ? 'organizer' : 'public'}`,
  twists: (isOrganizer: boolean) => `scratch:cache:twists:${isOrganizer ? 'organizer' : 'public'}`,
};

/** Every variant of the challenge/twist lists, for invalidation. */
export const ChallengeCacheKeys = [CacheKeys.challenges(true), CacheKeys.challenges(false)];
export const TwistCacheKeys = [CacheKeys.twists(true), CacheKeys.twists(false)];
