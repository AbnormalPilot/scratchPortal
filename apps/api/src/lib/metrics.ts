import { getRedis, redisEnabled } from './redis.js';
import { INSTANCE_ID } from './leader.js';

/**
 * In-process counters, published to Redis once a second so /god can show the
 * whole cluster rather than whichever replica happened to serve the request.
 *
 * Everything here is deliberately cheap: integer counters and a 90-slot ring of
 * per-second buckets. No allocation per request beyond a couple of increments.
 */

const WINDOW_SECONDS = 90;
const PUBLISH_INTERVAL_MS = 1000;
const SNAPSHOT_TTL_SECONDS = 5;
const SNAPSHOT_PREFIX = 'scratch:metrics:';

type Bucket = { t: number; requests: number; errors: number; throttled: number; hits: number; misses: number };

const ring: Bucket[] = [];
let current: Bucket = emptyBucket();

function emptyBucket(): Bucket {
  return { t: Math.floor(Date.now() / 1000), requests: 0, errors: 0, throttled: 0, hits: 0, misses: 0 };
}

// Totals since boot
const totals = { requests: 0, errors: 0, throttled: 0, cacheHits: 0, cacheStale: 0, cacheMisses: 0 };

/**
 * Per-route stats over a rolling window rather than since boot: on a dashboard
 * refreshing every second, a lifetime average hides exactly the spike you opened
 * the page to see.
 */
const ROUTE_WINDOW_SECONDS = 60;
const byRoute = new Map<string, Map<number, { n: number; ms: number; errors: number; max: number }>>();

/** Last few requests, for the live feed. */
const FEED_SIZE = 30;
const feed: { t: number; method: string; path: string; status: number; ms: number }[] = [];
const latencies: number[] = []; // rolling sample for percentiles
const LATENCY_SAMPLE = 2000;

/**
 * Sampled rather than event-counted: socket.io fires 'disconnect' before the
 * engine drops the client, so reading the count inside the handler only ever
 * observes the pre-disconnect value and the gauge never falls.
 */
let socketGauge: () => number = () => 0;

export function registerSocketGauge(fn: () => number): void {
  socketGauge = fn;
}

function rollIfNeeded(): void {
  const nowSec = Math.floor(Date.now() / 1000);
  if (current.t === nowSec) return;

  ring.push(current);
  while (ring.length > WINDOW_SECONDS) ring.shift();
  current = emptyBucket();
}

export function recordRequest(route: string, status: number, ms: number): void {
  rollIfNeeded();
  current.requests++;
  totals.requests++;

  if (status >= 500) { current.errors++; totals.errors++; }
  if (status === 429) { current.throttled++; totals.throttled++; }

  const sec = Math.floor(Date.now() / 1000);
  let buckets = byRoute.get(route);
  if (!buckets) byRoute.set(route, (buckets = new Map()));
  const b = buckets.get(sec) || { n: 0, ms: 0, errors: 0, max: 0 };
  b.n++;
  b.ms += ms;
  b.max = Math.max(b.max, ms);
  if (status >= 500) b.errors++;
  buckets.set(sec, b);

  const [method, ...rest] = route.split(' ');
  feed.push({ t: Date.now(), method, path: rest.join(' '), status, ms });
  if (feed.length > FEED_SIZE) feed.shift();

  latencies.push(ms);
  if (latencies.length > LATENCY_SAMPLE) latencies.shift();
}

export function recordCache(outcome: 'hit' | 'stale' | 'miss'): void {
  rollIfNeeded();
  if (outcome === 'miss') { current.misses++; totals.cacheMisses++; return; }
  current.hits++;
  if (outcome === 'stale') totals.cacheStale++;
  else totals.cacheHits++;
}

function windowedRoutes() {
  const cutoff = Math.floor(Date.now() / 1000) - ROUTE_WINDOW_SECONDS;
  const out: { route: string; n: number; avgMs: number; maxMs: number; errors: number }[] = [];

  for (const [route, buckets] of byRoute) {
    let n = 0, ms = 0, errors = 0, max = 0;
    for (const [sec, b] of buckets) {
      if (sec < cutoff) { buckets.delete(sec); continue; }
      n += b.n; ms += b.ms; errors += b.errors; max = Math.max(max, b.max);
    }
    if (!buckets.size) byRoute.delete(route);
    if (n) out.push({ route, n, avgMs: Math.round(ms / n), maxMs: max, errors });
  }

  return out.sort((a, b) => b.n - a.n).slice(0, 14);
}

function percentile(p: number): number {
  if (!latencies.length) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function localSnapshot() {
  rollIfNeeded();
  const series = [...ring, current];

  return {
    instance: INSTANCE_ID,
    at: Date.now(),
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1048576),
    sockets: socketGauge(),
    totals: { ...totals },
    latency: { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) },
    series: series.map((b) => ({ t: b.t, r: b.requests, e: b.errors, x: b.throttled, h: b.hits, m: b.misses })),
    routes: windowedRoutes(),
    feed: [...feed],
  };
}

export type Snapshot = ReturnType<typeof localSnapshot>;

export function startMetricsPublisher(): NodeJS.Timeout | null {
  if (!redisEnabled) return null;

  const timer = setInterval(async () => {
    const redis = getRedis();
    if (!redis) return;
    try {
      await redis.set(`${SNAPSHOT_PREFIX}${INSTANCE_ID}`, JSON.stringify(localSnapshot()), 'EX', SNAPSHOT_TTL_SECONDS);
    } catch {
      /* metrics must never break the server */
    }
  }, PUBLISH_INTERVAL_MS);

  timer.unref?.();
  return timer;
}

/** Merges every live replica's snapshot into one cluster view. */
export async function collectMetrics(): Promise<any> {
  const snapshots: Snapshot[] = [localSnapshot()];
  const redis = getRedis();

  if (redis) {
    try {
      let cursor = '0';
      const keys: string[] = [];
      do {
        const [next, found] = await redis.scan(cursor, 'MATCH', `${SNAPSHOT_PREFIX}*`, 'COUNT', 50);
        cursor = next;
        keys.push(...found);
      } while (cursor !== '0');

      const others = keys.filter((k) => k !== `${SNAPSHOT_PREFIX}${INSTANCE_ID}`);
      if (others.length) {
        const raw = await redis.mget(...others);
        for (const r of raw) {
          if (!r) continue;
          try { snapshots.push(JSON.parse(r)); } catch { /* ignore */ }
        }
      }
    } catch {
      /* fall back to this replica only */
    }
  }

  // Merge the per-second series by timestamp so the graph is cluster-wide.
  const merged = new Map<number, { t: number; r: number; e: number; x: number; h: number; m: number }>();
  for (const s of snapshots) {
    for (const b of s.series) {
      const e = merged.get(b.t) || { t: b.t, r: 0, e: 0, x: 0, h: 0, m: 0 };
      e.r += b.r; e.e += b.e; e.x += b.x; e.h += b.h; e.m += b.m;
      merged.set(b.t, e);
    }
  }

  const series = [...merged.values()].sort((a, b) => a.t - b.t).slice(-WINDOW_SECONDS);
  const sum = (fn: (s: Snapshot) => number) => snapshots.reduce((a, s) => a + fn(s), 0);

  const recent = series.slice(-10);
  const hits = recent.reduce((a, b) => a + b.h, 0);
  const misses = recent.reduce((a, b) => a + b.m, 0);

  // The newest bucket is the second currently in progress and is always
  // partially filled, so rate is averaged over the last few COMPLETE seconds.
  const nowSec = Math.floor(Date.now() / 1000);
  const complete = series.filter((b) => b.t < nowSec).slice(-5);
  const requestsPerSecond = complete.length
    ? Math.round(complete.reduce((a, b) => a + b.r, 0) / complete.length)
    : 0;
  const peakRps = series.length ? Math.max(...series.map((b) => b.r)) : 0;

  const routes = new Map<string, { route: string; n: number; avgMs: number; maxMs: number; errors: number }>();
  for (const s of snapshots) {
    for (const r of s.routes) {
      const e = routes.get(r.route) || { route: r.route, n: 0, avgMs: 0, maxMs: 0, errors: 0 };
      e.avgMs = Math.round((e.avgMs * e.n + r.avgMs * r.n) / (e.n + r.n));
      e.n += r.n;
      e.maxMs = Math.max(e.maxMs, r.maxMs);
      e.errors += r.errors;
      routes.set(r.route, e);
    }
  }

  const feed = snapshots
    .flatMap((s) => s.feed || [])
    .sort((a, b) => b.t - a.t)
    .slice(0, 30);

  return {
    at: Date.now(),
    replicas: snapshots
      .map((s) => ({
        instance: s.instance,
        sockets: s.sockets,
        uptimeSeconds: s.uptimeSeconds,
        memoryMb: s.memoryMb,
        p95: s.latency.p95,
        stale: Date.now() - s.at > 3000,
      }))
      .sort((a, b) => a.instance.localeCompare(b.instance)),
    live: {
      sockets: sum((s) => s.sockets),
      requestsPerSecond,
      peakRps,
      cacheHitRate: hits + misses ? Math.round((hits / (hits + misses)) * 100) : null,
    },
    totals: {
      requests: sum((s) => s.totals.requests),
      errors: sum((s) => s.totals.errors),
      throttled: sum((s) => s.totals.throttled),
      cacheHits: sum((s) => s.totals.cacheHits),
      cacheStale: sum((s) => s.totals.cacheStale),
      cacheMisses: sum((s) => s.totals.cacheMisses),
    },
    latency: {
      p50: Math.max(...snapshots.map((s) => s.latency.p50), 0),
      p95: Math.max(...snapshots.map((s) => s.latency.p95), 0),
      p99: Math.max(...snapshots.map((s) => s.latency.p99), 0),
    },
    series,
    routes: [...routes.values()].sort((a, b) => b.n - a.n).slice(0, 14),
    feed,
  };
}
