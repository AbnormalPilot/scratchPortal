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

/**
 * How long a fallback copy is kept after the fresh entry expires. If the
 * database is unreachable - or just too slow under a crowd - the endpoint serves
 * the last known-good response instead of a 500. Slightly stale beats down.
 */
const STALE_TTL_SECONDS = 15 * 60;
const staleKey = (key: string) => `${key}:stale`;

/**
 * TTLs are jittered by +/-20%. Without it every key written during a deploy
 * expires in the same tick and the whole crowd stampedes the database together -
 * exactly the pile-up this cache exists to prevent.
 */
function jitter(ttlSeconds: number): number {
  return Math.max(1, Math.round(ttlSeconds * (0.8 + Math.random() * 0.4)));
}

async function readFresh<T>(key: string): Promise<T | undefined> {
  const redis = getRedis();
  if (redis) {
    try {
      const hit = await redis.get(key);
      return hit ? (JSON.parse(hit) as T) : undefined;
    } catch (err: any) {
      console.error(`[Cache] read failed for ${key}: ${err.message}`);
      return undefined;
    }
  }
  const hit = memory.get(key);
  return hit && hit.expiresAt > Date.now() ? (hit.value as T) : undefined;
}

async function store<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  const serialized = JSON.stringify(value);
  if (redis) {
    try {
      await redis.set(key, serialized, 'EX', jitter(ttlSeconds));
      await redis.set(staleKey(key), serialized, 'EX', STALE_TTL_SECONDS);
    } catch (err: any) {
      console.error(`[Cache] write failed for ${key}: ${err.message}`);
    }
    return;
  }
  memory.set(key, { value, expiresAt: Date.now() + jitter(ttlSeconds) * 1000 });
  memory.set(staleKey(key), { value, expiresAt: Date.now() + STALE_TTL_SECONDS * 1000 });
}

/** Runs the loader once per key per process, no matter how many callers race. */
function loadOnce<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    const value = await loader();
    await store(key, value, ttlSeconds);
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

/**
 * Unconditionally refreshes a key. Used by the cache warmer so the hot public
 * routes are populated before anyone asks for them - the first arrivals at an
 * event should never be the ones who pay for a cold cache.
 */
export async function warmCache<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<void> {
  await loadOnce(key, ttlSeconds, loader);
}

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const fresh = await readFresh<T>(key);
  if (fresh !== undefined) return fresh;

  // Stale-while-revalidate: once a key has been warmed, expiry never makes a
  // user wait on the database again. The first caller after expiry gets the
  // previous value instantly and one background refresh goes to the DB.
  const stale = await readStale<T>(key);
  if (stale !== undefined) {
    if (!inflight.has(key)) {
      void loadOnce(key, ttlSeconds, loader).catch((err) =>
        console.error(`[Cache] background refresh failed for ${key}: ${err.message}`)
      );
    }
    return stale;
  }

  // Cold: nothing to serve but the real query.
  try {
    return await loadOnce(key, ttlSeconds, loader);
  } catch (err: any) {
    const fallback = await readStale<T>(key);
    if (fallback !== undefined) {
      console.error(`[Cache] loader failed for ${key}, serving stale: ${err.message}`);
      return fallback;
    }
    throw err;
  }
}

async function readStale<T>(key: string): Promise<T | undefined> {
  const redis = getRedis();
  if (redis) {
    try {
      const hit = await redis.get(staleKey(key));
      return hit ? (JSON.parse(hit) as T) : undefined;
    } catch {
      return undefined;
    }
  }
  const hit = memory.get(staleKey(key));
  return hit && hit.expiresAt > Date.now() ? (hit.value as T) : undefined;
}

/** Call after any write that changes what a cached endpoint returns. */
export async function invalidate(...keys: string[]): Promise<void> {
  keys.forEach((k) => {
    inflight.delete(k);
    memory.delete(k);
    memory.delete(staleKey(k));
  });
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys, ...keys.map(staleKey));
  } catch (err: any) {
    console.error(`[Cache] invalidate failed: ${err.message}`);
  }
}

/**
 * Invalidates every key under a prefix - used for the per-judge dashboard caches,
 * where the key set is one entry per judge rather than a fixed name.
 */
export async function invalidatePrefix(prefix: string): Promise<void> {
  for (const k of [...inflight.keys(), ...memory.keys()]) {
    if (k.startsWith(prefix)) {
      inflight.delete(k);
      memory.delete(k);
    }
  }

  const redis = getRedis();
  if (!redis) return;

  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== '0');
  } catch (err: any) {
    console.error(`[Cache] prefix invalidate failed for ${prefix}: ${err.message}`);
  }
}

export const CacheKeys = {
  eventState: 'scratch:cache:event-state',
  leaderboard: 'scratch:cache:leaderboard',
  challenges: (isOrganizer: boolean) => `scratch:cache:challenges:${isOrganizer ? 'organizer' : 'public'}`,
  adminOverview: 'scratch:cache:admin-overview',
  me: (teamId: string | null | undefined, userId: string) => `${mePrefix(teamId)}${userId}`,
  teamSubmissions: (teamId: string) => `scratch:cache:team-submissions:${teamId}`,
  challengeDetail: (id: string, isOrganizer: boolean) =>
    `scratch:cache:challenge:${id}:${isOrganizer ? 'organizer' : 'public'}`,
  judgeTeams: (judgeId: string) => `${JUDGE_TEAMS_PREFIX}${judgeId}`,
  twists: (isOrganizer: boolean) => `scratch:cache:twists:${isOrganizer ? 'organizer' : 'public'}`,
};

export const JUDGE_TEAMS_PREFIX = 'scratch:cache:judge-teams:';

/**
 * /api/auth/me is keyed by team first, then user: claiming a challenge or
 * posting a submission changes what every member of that team sees, and a team
 * prefix lets one invalidation cover all of them.
 */
export const mePrefix = (teamId?: string | null) => `scratch:cache:me:${teamId || 'noteam'}:`;

/** Every variant of the challenge/twist lists, for invalidation. */
export const ChallengeCacheKeys = [CacheKeys.challenges(true), CacheKeys.challenges(false)];
export const TwistCacheKeys = [CacheKeys.twists(true), CacheKeys.twists(false)];
