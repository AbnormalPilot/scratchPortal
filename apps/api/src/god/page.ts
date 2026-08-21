/**
 * Self-contained operations dashboard. No build step, no framework, no external
 * requests - it is one string served by the API behind Basic auth, so it keeps
 * working even if the SPA build is broken.
 */
export const GOD_PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GOD // scratchportal</title>
<style>
  :root {
    --bg:#05070d; --panel:#0b1020; --line:#16203a; --dim:#5b6b8c;
    --fg:#c9d8ff; --cyan:#22d3ee; --green:#34d399; --amber:#fbbf24; --red:#f43f5e; --violet:#a78bfa;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    background:var(--bg); color:var(--fg); min-height:100vh;
    font:13px/1.4 ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
    background-image:linear-gradient(rgba(34,211,238,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,.035) 1px,transparent 1px);
    background-size:44px 44px; padding:18px; overflow-x:hidden;
  }
  .wrap{max-width:1500px;margin:0 auto}
  header{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:16px}
  h1{font-size:26px;letter-spacing:.34em;color:#fff;text-shadow:0 0 22px rgba(34,211,238,.75)}
  .sub{color:var(--dim);letter-spacing:.18em;font-size:10px;text-transform:uppercase}
  .live{margin-left:auto;display:flex;align-items:center;gap:8px;color:var(--green);font-size:10px;letter-spacing:.2em}
  .dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 12px var(--green);animation:pulse 1.6s infinite}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}
  .grid{display:grid;gap:12px}
  .g4{grid-template-columns:repeat(4,1fr)}
  .g2{grid-template-columns:1.35fr 1fr}
  .g3{grid-template-columns:1.1fr 1fr .9fr}
  @media(max-width:1100px){.g4{grid-template-columns:repeat(2,1fr)}.g2,.g3{grid-template-columns:1fr}}
  .card{background:linear-gradient(180deg,rgba(17,25,48,.92),rgba(8,12,26,.92));border:1px solid var(--line);border-radius:12px;padding:14px;position:relative;overflow:hidden}
  .card::before{content:"";position:absolute;inset:0 0 auto 0;height:1px;background:linear-gradient(90deg,transparent,rgba(34,211,238,.55),transparent)}
  .label{color:var(--dim);font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;margin-bottom:8px}
  .big{font-size:44px;line-height:1;font-weight:600;color:#fff;font-variant-numeric:tabular-nums;transition:color .25s}
  .unit{font-size:15px;color:var(--dim);margin-left:4px}
  .foot{color:var(--dim);font-size:10px;margin-top:8px}
  .flash{animation:flash .5s}
  @keyframes flash{from{color:var(--cyan);text-shadow:0 0 20px var(--cyan)}to{color:#fff}}
  table{width:100%;border-collapse:collapse;font-size:11.5px}
  th{color:var(--dim);text-align:left;font-weight:400;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;padding-bottom:7px}
  td{padding:4px 0;border-top:1px solid rgba(22,32,58,.65);font-variant-numeric:tabular-nums}
  td.r,th.r{text-align:right}
  .bar{height:4px;border-radius:2px;background:linear-gradient(90deg,var(--cyan),var(--violet));box-shadow:0 0 10px rgba(34,211,238,.5);transition:width .4s}
  .feed{height:236px;overflow:hidden;display:flex;flex-direction:column-reverse;gap:2px}
  .row{display:flex;gap:8px;align-items:center;font-size:11px;padding:2px 0;animation:slide .35s}
  @keyframes slide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .m{color:var(--violet);width:44px}
  .p{color:var(--fg);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .s{width:34px;text-align:right}
  .t{width:60px;text-align:right;color:var(--dim)}
  .ok{color:var(--green)}.warn{color:var(--amber)}.bad{color:var(--red)}.cy{color:var(--cyan)}
  .rep{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-top:1px solid rgba(22,32,58,.65);font-size:11.5px}
  .chip{display:inline-flex;align-items:center;gap:6px;color:#fff}
  .err{color:var(--red);text-align:center;padding:40px;letter-spacing:.2em}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>GOD</h1>
    <span class="sub" id="cluster">cluster telemetry</span>
    <span class="live"><span class="dot"></span><span id="ticker">LIVE</span></span>
  </header>

  <div class="grid g4" style="margin-bottom:12px">
    <div class="card"><div class="label">Live users</div><div class="big" id="sockets">0</div><div class="foot" id="socketsFoot">open realtime connections</div></div>
    <div class="card"><div class="label">Requests / sec</div><div class="big" id="rps">0</div><div class="foot" id="rpsFoot">&nbsp;</div></div>
    <div class="card"><div class="label">Cache hit rate</div><div class="big" id="hit">—</div><div class="foot" id="hitFoot">&nbsp;</div></div>
    <div class="card"><div class="label">Latency p95</div><div class="big" id="p95">0<span class="unit">ms</span></div><div class="foot" id="latFoot">&nbsp;</div></div>
  </div>

  <div class="grid g2" style="margin-bottom:12px">
    <div class="card">
      <div class="label">Throughput — last 90 seconds</div>
      <svg id="rpsChart" viewBox="0 0 600 130" preserveAspectRatio="none" style="width:100%;height:130px"></svg>
    </div>
    <div class="card">
      <div class="label">Cache — hits vs database reads</div>
      <svg id="cacheChart" viewBox="0 0 600 130" preserveAspectRatio="none" style="width:100%;height:130px"></svg>
    </div>
  </div>

  <div class="grid g3">
    <div class="card">
      <div class="label">Routes — rolling 60s</div>
      <table>
        <thead><tr><th>route</th><th class="r">req</th><th class="r">avg</th><th class="r">peak</th></tr></thead>
        <tbody id="routes"></tbody>
      </table>
    </div>
    <div class="card">
      <div class="label">Live request feed</div>
      <div class="feed" id="feed"></div>
    </div>
    <div class="card">
      <div class="label">Replicas</div>
      <div id="replicas"></div>
      <div class="label" style="margin-top:16px">Counters</div>
      <table><tbody id="counters"></tbody></table>
    </div>
  </div>
</div>

<script>
const $ = (id) => document.getElementById(id);
const prev = {};

function set(id, value, extra) {
  const el = $(id);
  const text = extra ? value + '<span class="unit">' + extra + '</span>' : String(value);
  if (el.innerHTML !== text) {
    el.innerHTML = text;
    if (prev[id] !== undefined && prev[id] !== value) {
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    }
    prev[id] = value;
  }
}

function area(svg, series, pick, color, fill) {
  const W = 600, H = 130, values = series.map(pick);
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const pts = values.map((v, i) => [i * step, H - (v / max) * (H - 10) - 4]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return '<defs><linearGradient id="' + fill + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity=".42"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="' + line + ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z" fill="url(#' + fill + ')"/>' +
    '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px ' + color + ')"/>' +
    '<text x="6" y="14" fill="' + color + '" font-size="10" opacity=".85">peak ' + max + '</text>';
}

const cls = (s) => s >= 500 ? 'bad' : s === 429 ? 'warn' : s >= 400 ? 'cy' : 'ok';
const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 1 ? 'now' : s + 's'; };

async function tick() {
  let m;
  try {
    const r = await fetch('/god/metrics', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    m = await r.json();
  } catch (e) {
    $('ticker').textContent = 'RECONNECTING';
    return;
  }
  $('ticker').textContent = 'LIVE';

  set('sockets', m.live.sockets);
  $('socketsFoot').textContent = m.replicas.map(r => r.instance + ' ' + r.sockets).join('  ·  ');

  set('rps', m.live.requestsPerSecond);
  $('rpsFoot').textContent = 'peak ' + (m.live.peakRps || 0) + '/s · ' + m.totals.requests.toLocaleString() + ' total';

  const hit = m.live.cacheHitRate;
  set('hit', hit === null ? '—' : hit + '%');
  $('hit').style.color = hit === null ? '#fff' : hit >= 90 ? 'var(--green)' : hit >= 70 ? 'var(--amber)' : 'var(--red)';
  const life = m.totals.cacheHits + m.totals.cacheStale + m.totals.cacheMisses;
  $('hitFoot').textContent = life ? Math.round(((m.totals.cacheHits + m.totals.cacheStale) / life) * 100) + '% since boot · ' + m.totals.cacheMisses.toLocaleString() + ' db reads' : 'no traffic yet';

  set('p95', m.latency.p95, 'ms');
  $('p95').style.color = m.latency.p95 < 300 ? 'var(--green)' : m.latency.p95 < 1500 ? 'var(--amber)' : 'var(--red)';
  $('latFoot').textContent = 'p50 ' + m.latency.p50 + 'ms · p99 ' + m.latency.p99 + 'ms';

  $('rpsChart').innerHTML = area(null, m.series, s => s.r, '#22d3ee', 'gr');
  $('cacheChart').innerHTML = area(null, m.series, s => s.h, '#34d399', 'gc') +
    area(null, m.series, s => s.m, '#f43f5e', 'gm');

  const maxN = Math.max(1, ...m.routes.map(r => r.n));
  $('routes').innerHTML = m.routes.map(r =>
    '<tr><td><div>' + r.route.replace(/</g, '&lt;') + '</div><div class="bar" style="width:' + Math.max(3, (r.n / maxN) * 100) + '%"></div></td>' +
    '<td class="r">' + r.n.toLocaleString() + '</td>' +
    '<td class="r ' + (r.avgMs > 1000 ? 'bad' : r.avgMs > 300 ? 'warn' : 'ok') + '">' + r.avgMs + 'ms</td>' +
    '<td class="r" style="color:var(--dim)">' + r.maxMs + 'ms</td></tr>').join('') ||
    '<tr><td colspan="4" style="color:var(--dim)">no traffic in the last 60s</td></tr>';

  $('feed').innerHTML = (m.feed || []).map(f =>
    '<div class="row"><span class="m">' + f.method + '</span><span class="p">' + f.path.replace(/</g, '&lt;') + '</span>' +
    '<span class="s ' + cls(f.status) + '">' + f.status + '</span><span class="t">' + f.ms + 'ms</span></div>').join('');

  $('replicas').innerHTML = m.replicas.map(r =>
    '<div class="rep"><span class="chip"><span class="dot" style="background:' + (r.stale ? 'var(--red)' : 'var(--green)') +
    ';box-shadow:0 0 10px ' + (r.stale ? 'var(--red)' : 'var(--green)') + '"></span>' + r.instance + '</span>' +
    '<span style="color:var(--dim)">' + r.sockets + ' ws · ' + r.memoryMb + 'mb · p95 ' + r.p95 + 'ms · ' + Math.floor(r.uptimeSeconds / 60) + 'm</span></div>').join('');

  $('counters').innerHTML =
    '<tr><td>requests</td><td class="r">' + m.totals.requests.toLocaleString() + '</td></tr>' +
    '<tr><td>server errors</td><td class="r ' + (m.totals.errors ? 'bad' : 'ok') + '">' + m.totals.errors + '</td></tr>' +
    '<tr><td>throttled (429)</td><td class="r ' + (m.totals.throttled ? 'warn' : 'ok') + '">' + m.totals.throttled + '</td></tr>' +
    '<tr><td>cache hits</td><td class="r ok">' + m.totals.cacheHits.toLocaleString() + '</td></tr>' +
    '<tr><td>served stale</td><td class="r">' + m.totals.cacheStale.toLocaleString() + '</td></tr>' +
    '<tr><td>database reads</td><td class="r cy">' + m.totals.cacheMisses.toLocaleString() + '</td></tr>';

  $('cluster').textContent = m.replicas.length + ' replicas · ' + new Date(m.at).toISOString().slice(11, 19) + ' UTC';
}

tick();
setInterval(tick, 1000);
</script>
</body>
</html>`;
