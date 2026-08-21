#!/usr/bin/env node
/**
 * Incident triage for the on-disk event trail.
 *
 *   npm run audit:top            last 15 minutes
 *   npm run audit:top -- 60      last 60 minutes
 *
 * Reads audit-*.jsonl from stdin (see package.json) and answers the question you
 * actually have during an incident: is one person doing this, or is everyone
 * slow? A single account or IP holding most of the traffic is sabotage. Traffic
 * spread evenly with latency climbing is capacity or a bug.
 */
const minutes = Number(process.argv[2] || 15);
const since = Date.now() - minutes * 60_000;

let raw = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) raw += chunk;

const rows = raw
  .split('\n')
  .filter(Boolean)
  .map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter((r) => r && Date.parse(r.ts) >= since);

if (!rows.length) {
  console.log(`No events in the last ${minutes} minutes.`);
  process.exit(0);
}

const http = rows.filter((r) => r.method);
const by = (fn) => {
  const m = new Map();
  for (const r of http) {
    const k = fn(r);
    if (k == null) continue;
    const e = m.get(k) || { n: 0, err: 0, throttled: 0, ms: [] };
    e.n++;
    if (r.status >= 500) e.err++;
    if (r.status === 429) e.throttled++;
    e.ms.push(r.ms || 0);
    m.set(k, e);
  }
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
};
const p95 = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.95)] : 0);
const pctOf = (n) => ((n / http.length) * 100).toFixed(1) + '%';

const table = (title, entries, limit = 8) => {
  console.log(`\n${title}`);
  console.log('  ' + 'who'.padEnd(42) + 'reqs'.padStart(7) + 'share'.padStart(8) + '429'.padStart(7) + '5xx'.padStart(6) + 'p95'.padStart(8));
  for (const [k, v] of entries.slice(0, limit)) {
    console.log('  ' + String(k).slice(0, 41).padEnd(42) + String(v.n).padStart(7) + pctOf(v.n).padStart(8) +
      String(v.throttled).padStart(7) + String(v.err).padStart(6) + (p95(v.ms) + 'ms').padStart(8));
  }
};

console.log(`Event trail - last ${minutes} minutes`);
console.log(`  ${http.length} HTTP requests, ${rows.filter((r) => r.kind === 'presence').length} socket events, ` +
  `${rows.filter((r) => r.status >= 500).length} server errors, ${rows.filter((r) => r.status === 429).length} throttled`);

const users = by((r) => (r.user ? `${r.user.email} (${r.user.role})` : null));
const ips = by((r) => r.ip);
table('BY ACCOUNT  (one name dominating = that person, not your code)', users);
table('BY IP       (a venue shares one IP, so this is coarse)', ips);
table('BY ENDPOINT (spread evenly = load; concentrated = one hot path)', by((r) => `${r.method} ${r.path}`));

const security = rows.filter((r) => r.kind === 'security');
if (security.length) {
  console.log(`\nSECURITY EVENTS (${security.length})`);
  const counts = security.reduce((a, r) => ((a[r.event] = (a[r.event] || 0) + 1), a), {});
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  for (const r of security.slice(-5)) console.log(`  ${r.ts.slice(11, 19)} ${r.event} ip=${r.ip} ${r.teamId || r.roomName || ''}`);
}

const top = users[0];
console.log('\nVERDICT');
if (top && top[1].n / http.length > 0.4 && http.length > 200) {
  console.log(`  ${top[0]} is ${pctOf(top[1].n)} of all traffic - that is one actor, not organic load.`);
  console.log('  Their own rate limit already contains them; see the runbook in README for cutting them off.');
} else if (rows.filter((r) => r.status >= 500).length > http.length * 0.05) {
  console.log('  Errors are widespread and traffic is not concentrated - look at the app or the database, not an attacker.');
} else {
  console.log('  Traffic is spread across accounts. No single actor stands out.');
}
