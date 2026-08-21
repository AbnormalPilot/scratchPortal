import { warmCache, CacheKeys } from './cache.js';
import { acquireLeadership, INSTANCE_ID } from './leader.js';

/**
 * Keeps the routes every attendee loads permanently hot.
 *
 * These four are the "front door" of the event: the SPA asks for all of them on
 * first paint, so at 10:00 tomorrow ~300 browsers request them within the same
 * minute. A cold or just-expired key at that moment means everyone queues behind
 * one database round trip - and this database is a continent away, so that round
 * trip is ~200ms x several queries.
 *
 * Refreshing slightly faster than the TTL means the fresh copy is essentially
 * always present, and stale-while-revalidate covers any gap. Only the leader
 * replica warms, so this costs one set of queries every few seconds for the
 * whole cluster, not one per replica (measured: ~320 transactions/min).
 *
 * Side benefit: it keeps a scale-to-zero Postgres awake, so the first request of
 * the morning is not the one that pays for the compute cold start.
 *
 * Tune with CACHE_WARM_INTERVAL_MS.
 */
const WARM_INTERVAL_MS = Number(process.env.CACHE_WARM_INTERVAL_MS || 4000);

type WarmTarget = { name: string; key: string; ttl: number; load: () => Promise<unknown> };

// Imported lazily: these modules import the cache, which would otherwise make
// the warmer part of an import cycle at module-init time.
async function targets(): Promise<WarmTarget[]> {
  const [publicRoutes, challenges, twists] = await Promise.all([
    import('../routes/public.routes.js'),
    import('../routes/challenges.routes.js'),
    import('../routes/twists.routes.js'),
  ]);

  return [
    {
      name: 'event-state',
      key: CacheKeys.eventState,
      ttl: publicRoutes.EVENT_STATE_TTL_SECONDS,
      load: publicRoutes.buildEventState,
    },
    {
      name: 'leaderboard',
      key: CacheKeys.leaderboard,
      ttl: publicRoutes.LEADERBOARD_TTL_SECONDS,
      load: publicRoutes.buildLeaderboard,
    },
    {
      name: 'challenges',
      key: CacheKeys.challenges(false),
      ttl: challenges.CHALLENGES_TTL_SECONDS,
      load: () => challenges.buildChallengeList(false),
    },
    {
      name: 'twists',
      key: CacheKeys.twists(false),
      ttl: twists.TWISTS_TTL_SECONDS,
      load: () => twists.buildTwistList(false),
    },
  ];
}

let warming = false;

async function warmAll(reason: string): Promise<void> {
  if (warming) return; // a slow database must not pile cycles on top of each other
  warming = true;

  try {
    const list = await targets();
    const results = await Promise.allSettled(list.map((t) => warmCache(t.key, t.ttl, t.load)));
    const failed = list.filter((_, i) => results[i].status === 'rejected').map((t) => t.name);

    if (failed.length) console.error(`[Warmer] ${reason}: failed to warm ${failed.join(', ')}`);
    else if (reason === 'startup') console.log(`[Warmer] ${INSTANCE_ID} warmed ${list.map((t) => t.name).join(', ')}`);
  } catch (err: any) {
    console.error(`[Warmer] ${reason} failed: ${err.message}`);
  } finally {
    warming = false;
  }
}

export function startCacheWarmer(): NodeJS.Timeout {
  // Warm immediately so a freshly deployed replica is hot before the first
  // request, not after it.
  void (async () => {
    if (await acquireLeadership()) await warmAll('startup');
  })();

  const timer = setInterval(async () => {
    if (!(await acquireLeadership())) return;
    await warmAll('tick');
  }, WARM_INTERVAL_MS);

  timer.unref?.();
  return timer;
}
