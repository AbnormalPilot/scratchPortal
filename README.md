# Scratch Game Hackathon Portal

Turborepo monorepo. React SPA, Express + Socket.IO API, Prisma on Neon Postgres,
Redis for everything that has to be shared between API replicas.

```
apps/
  web/    Vite + React SPA
  api/    Express + Socket.IO server
packages/
  db/                 @repo/db - Prisma schema, client singleton, seed
  eslint-config/      @repo/eslint-config
  typescript-config/  @repo/typescript-config
nginx/    load balancer + static server config used by the web image
```

## Setup

```bash
cp .env.example .env    # DATABASE_URL and JWT_SECRET - the only two required
npm install
npm run db:generate
```

Everything else has a working default and is only worth adding to `.env` if you
want to change it:

| | default | |
|---|---|---|
| `PORT` | `5001` | API port |
| `WEB_PORT` | `8080` | host port for the Docker stack |
| `REDIS_PORT` | `6380` | host port Redis is published on |
| `REDIS_URL` | empty | set to `redis://localhost:6380` to use Redis in local dev; the Docker replicas always get `redis://redis:6379` |
| `VITE_API_URL` | empty | only if the API is on a different origin than the SPA |

## Develop

```bash
npm run infra:up   # Redis on localhost:6380 (optional; without it the API runs single-process)
npm run dev        # api on :5001, web on :5173
```

`npm run dev` loads the root `.env` and runs both apps through Turborepo. The
Vite dev server proxies `/api`, `/uploads` and `/socket.io` to the API, so the
frontend needs no `VITE_API_URL`.

| Command | |
|---|---|
| `npm run build` | build every package in dependency order |
| `npm run check-types` | `tsc --noEmit` across the workspace |
| `npm run lint` | eslint (web) |
| `npm run db:push` | push the Prisma schema to Neon |
| `npm run db:seed` | wipe and reseed |
| `npm run db:studio` | Prisma Studio |

## Run the production stack

```bash
npm run docker:up      # docker compose up -d --build
open http://localhost:8080
```

| Service | |
|---|---|
| `web` | nginx: serves `dist/`, proxies `/api`, `/socket.io`, `/uploads` |
| `api-1`, `api-2` | API replicas, identical apart from `INSTANCE_ID` |
| `redis` | socket fan-out, rate limits, leader lock, leaderboard cache |
| `migrate` | one-shot `prisma db push`, completes before the replicas start |

The database is Neon; nothing local. Both images are built with `turbo prune`, so
an edit in `apps/web` does not invalidate the API image cache.

```bash
docker compose logs -f api-1 api-2
docker compose exec redis redis-cli
docker compose --profile seed run --rm seed
docker compose down
```

## Why Redis

Two replicas without shared state are two servers that disagree:

1. **Broadcasts** - without `@socket.io/redis-adapter` a score update emitted by
   `api-2` never reaches clients socketed to `api-1`.
2. **The stage scheduler** - `startStageWatcher()` writes `EventConfig` every
   second. Both replicas running it means every transition fires twice. A Redis
   lock (`apps/api/src/lib/leader.ts`) elects one ticker; another takes over
   within 15s if it dies.
3. **Rate limits and cache** - shared counters, and a publish invalidates the
   cached leaderboard everywhere.

With `REDIS_URL` empty the API runs single-process with an in-memory cache, so
local dev needs nothing extra.

## Measured at 200 concurrent clients

- 200/200 websockets connected in ~220 ms
- 200 parallel `/api/public/leaderboard` reads: p50 97 ms, p95 130 ms
- those 200 reads cost **4 database transactions** (short-TTL cache)
- an admin stage change reached **200/200** clients across both replicas
- killing the leader replica: failover in under 5 s, no failed requests

## Caching

Everything a crowd hits in the first minute is cached in Redis and kept warm.

| what | scope | TTL |
|---|---|---|
| `/api/public/event-state` | global, **warmed** | 8s |
| `/api/public/leaderboard` | global, **warmed** | 8s |
| `/api/challenges` | public **warmed** / organizer | 8s |
| `/api/twists` | public **warmed** / organizer | 8s |
| `/api/auth/me` | per team + user | 4s |
| `/api/submissions/my-team` | per team | 4s |
| `/api/judge/teams` | per judge | 5s |
| `/api/admin/overview` | global | 5s |

Correctness comes from invalidation, not expiry: every write already emits a
socket broadcast, and the broadcast helpers in `apps/api/src/lib/socket.ts` clear
exactly the keys that action affects. TTL is only a backstop.

Four properties matter under a crowd, all in `apps/api/src/lib/cache.ts`:

- **Single-flight** - 300 simultaneous misses run one query, not 300.
- **TTL jitter (+/-20%)** - without it every key written at deploy time expires
  in the same tick and the whole room stampedes the database together.
- **Stale-while-revalidate** - after the first load, expiry never makes a user
  wait on the database again: the request gets the previous value in ~10ms and
  one background refresh goes to the DB.
- **Serve-stale-on-error** - a 15 minute fallback copy behind every key. If the
  database is unreachable, endpoints serve the last known-good response instead
  of failing.

`apps/api/src/lib/warmer.ts` refreshes the four public routes every 4s
(`CACHE_WARM_INTERVAL_MS`) on the leader replica only, so they are hot before the
first visitor and stay hot with no traffic at all. It also keeps a scale-to-zero
Postgres awake. Measured cost: ~320 transactions/min for the whole cluster.

## Event trail

Every API call and every socket connection is appended to a JSONL file on the
`logs` Docker volume - deliberately not in the database, so a compromised or
rolled-back database cannot rewrite it.

```
/data/logs/audit-2026-08-22-api-1.jsonl   one file per day, per replica
/data/logs/nginx-access.log               raw HTTP log, real client IPs
```

Each line records timestamp, replica, method, path, status, duration, client IP,
user agent, and the acting account from the JWT (id, email, name, role, team).
Writes also carry a summary of the request body - any key matching
`pass|token|secret|authorization|hash` is replaced with `[redacted]` - plus the
uploaded filename and size. Socket connect / join / disconnect events give you
presence. Rejected tokens are flagged `tokenInvalid`, and failed logins keep the
attempted email, which is the trail you actually want after an incident.

```bash
npm run audit                  # print the whole trail
npm run audit:save             # write it to audit-export.jsonl

# one person's actions
npm run audit | jq 'select(.user.email == "alex@pixelwarriors.com")'
# everything that changed state
npm run audit | jq 'select(.kind == "write" and .status < 400)'
# failed logins
npm run audit | jq 'select(.path == "/api/auth/login" and .status == 401) | {ts, ip, email: .body.email}'
```

Health checks are skipped. Files older than `AUDIT_RETENTION_DAYS` (30) are
pruned hourly by the leader replica.

**What is not collected:** no MAC addresses - they are layer 2 and never reach a
web server, no browser can be asked for one. No device fingerprinting, no
cookies beyond the app's own auth. On shared venue wifi every attendee also
shares one public IP, so the account in the JWT is the identifier that means
anything; the IP mostly tells you inside-vs-outside the venue.

## Known limits

- `ip_hash` in `nginx/nginx.conf` means a room behind one NAT lands on one
  replica. Fine at this scale; the second replica still covers failover. The
  `least_conn` alternative and the client change it needs are documented there.
- Uploads live on a Docker volume shared by the replicas on one host. Multiple
  hosts means S3/R2 or a network mount.
- Only the newest video per team and round is kept; earlier ones are deleted on
  the next submission and their `videoUrl` cleared. That bounds storage at one
  file per team per round instead of growing with every resubmission.
- `connection_limit` in `DATABASE_URL` is per replica: 2 x 10 = 20 Neon
  connections.
- Login rate limiting is keyed by email, not IP, so a shared venue IP cannot
  lock the room out (`apps/api/src/middleware/rateLimit.ts`).
