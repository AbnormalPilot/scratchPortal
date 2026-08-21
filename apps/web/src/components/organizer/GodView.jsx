import React, { useEffect, useRef, useState } from 'react';
import { Activity, Users, Database, Zap, AlertTriangle, ShieldAlert, Server, Timer } from 'lucide-react';
import api from '../../lib/api.js';

const POLL_MS = 1000;

/** Sparkline. No chart library - it is 20 lines of SVG and always in our palette. */
function Spark({ points, color = '#4e97fe', height = 44, label }) {
  const max = Math.max(1, ...points);
  const w = 240;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(height - (p / max) * (height - 4) - 2).toFixed(1)}`).join(' ');

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        <path d={`${d} L ${w} ${height} L 0 ${height} Z`} fill={color} opacity="0.12" />
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[9px] font-retro text-[#64748b] mt-1">
        <span>{label}</span>
        <span>peak {max}</span>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone = 'normal' }) {
  const tones = {
    normal: 'text-[#1e293b] border-[#bad6fc]',
    good: 'text-[#15803d] border-[#bbf7d0]',
    warn: 'text-[#a4640c] border-[#fde68a]',
    bad: 'text-[#b91c1c] border-[#fecaca]',
  };
  return (
    <div className={`bg-white rounded-2xl border-2 ${tones[tone]} p-4 shadow-xs`}>
      <div className="flex items-center gap-2 text-[10px] font-pixel uppercase tracking-wide text-[#64748b]">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`mt-2 text-3xl font-pixel ${tones[tone].split(' ')[0]}`}>{value}</div>
      {sub && <div className="text-[10px] font-retro text-[#94a3b8] mt-1">{sub}</div>}
    </div>
  );
}

export default function GodView() {
  const [m, setM] = useState(null);
  const [err, setErr] = useState(null);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (paused) return;
      try {
        const data = await api.get('/admin/god');
        if (!cancelled) { setM(data); setErr(null); }
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load metrics');
      }
    };
    tick();
    timer.current = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(timer.current); };
  }, [paused]);

  if (err && !m) {
    return (
      <div className="max-w-2xl mx-auto mt-16 p-6 bg-white rounded-2xl border-2 border-[#fecaca] text-center">
        <ShieldAlert className="w-8 h-8 mx-auto text-[#b91c1c]" />
        <p className="font-pixel text-sm text-[#b91c1c] mt-3">{err}</p>
      </div>
    );
  }
  if (!m) return <div className="text-center font-pixel text-sm text-[#64748b] mt-16">Connecting…</div>;

  const series = m.series || [];
  const rps = series.map((s) => s.r);
  const hitSeries = series.map((s) => s.h);
  const missSeries = series.map((s) => s.m);
  const errSeries = series.map((s) => s.e + s.x);
  const hitRate = m.live.cacheHitRate;
  const totalCache = m.totals.cacheHits + m.totals.cacheStale + m.totals.cacheMisses;
  const lifetimeHitRate = totalCache ? Math.round(((m.totals.cacheHits + m.totals.cacheStale) / totalCache) * 100) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-pixel text-xl text-[#1e293b] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#4e97fe]" /> GOD VIEW
          </h1>
          <p className="font-retro text-[11px] text-[#64748b]">Live cluster telemetry · refreshing every second</p>
        </div>
        <button
          onClick={() => setPaused((p) => !p)}
          className="px-3 py-1.5 rounded-lg bg-[#4e97fe] hover:bg-[#307fef] text-white text-[10px] font-pixel"
        >
          {paused ? 'RESUME' : 'PAUSE'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Users} label="Live users" value={m.live.sockets} sub="open realtime connections" />
        <Stat icon={Zap} label="Requests / sec" value={m.live.requestsPerSecond} sub={`peak ${m.live.peakRps ?? 0}/s · ${m.totals.requests.toLocaleString()} total`} />
        <Stat
          icon={Database}
          label="Cache hit rate"
          value={hitRate === null ? '—' : `${hitRate}%`}
          sub={lifetimeHitRate === null ? 'no traffic yet' : `${lifetimeHitRate}% since boot`}
          tone={hitRate === null ? 'normal' : hitRate >= 90 ? 'good' : hitRate >= 70 ? 'warn' : 'bad'}
        />
        <Stat
          icon={Timer}
          label="Latency p95"
          value={`${m.latency.p95}ms`}
          sub={`p50 ${m.latency.p50}ms · p99 ${m.latency.p99}ms`}
          tone={m.latency.p95 < 500 ? 'good' : m.latency.p95 < 2000 ? 'warn' : 'bad'}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border-2 border-[#bad6fc] p-4">
          <div className="text-[10px] font-pixel uppercase text-[#64748b] mb-2">Traffic — last 90s</div>
          <Spark points={rps} label="requests / sec" />
        </div>
        <div className="bg-white rounded-2xl border-2 border-[#bad6fc] p-4">
          <div className="text-[10px] font-pixel uppercase text-[#64748b] mb-2">Cache</div>
          <Spark points={hitSeries} color="#15803d" label="hits / sec" />
          <div className="mt-2"><Spark points={missSeries} color="#a4640c" label="misses / sec (database reads)" /></div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Stat
          icon={AlertTriangle}
          label="Server errors"
          value={m.totals.errors}
          sub="5xx since boot"
          tone={m.totals.errors === 0 ? 'good' : 'bad'}
        />
        <Stat icon={ShieldAlert} label="Throttled" value={m.totals.throttled} sub="429s — rate limiter working" tone={m.totals.throttled > 0 ? 'warn' : 'good'} />
        <div className="bg-white rounded-2xl border-2 border-[#bad6fc] p-4">
          <div className="text-[10px] font-pixel uppercase text-[#64748b] mb-2">Errors + throttles / sec</div>
          <Spark points={errSeries} color="#b91c1c" height={36} label="last 90s" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-[#bad6fc] p-4">
        <div className="text-[10px] font-pixel uppercase text-[#64748b] mb-3 flex items-center gap-2">
          <Server className="w-3.5 h-3.5" /> Replicas
        </div>
        <div className="space-y-2">
          {m.replicas.map((r) => (
            <div key={r.instance} className="flex items-center justify-between text-[11px] font-retro border-b border-[#eef4ff] pb-2 last:border-0">
              <span className="font-pixel text-[#1e293b] flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${r.stale ? 'bg-[#b91c1c]' : 'bg-[#22c55e]'}`} />
                {r.instance}
              </span>
              <span className="text-[#64748b]">{r.sockets} sockets</span>
              <span className="text-[#64748b]">{r.memoryMb} MB</span>
              <span className="text-[#64748b]">p95 {r.p95}ms</span>
              <span className="text-[#94a3b8]">up {Math.floor(r.uptimeSeconds / 60)}m</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-[#bad6fc] p-4">
        <div className="text-[10px] font-pixel uppercase text-[#64748b] mb-3">Busiest routes</div>
        <div className="space-y-1.5">
          {m.routes.map((r) => (
            <div key={r.route} className="flex items-center justify-between text-[11px] font-retro">
              <span className="text-[#1e293b] truncate mr-3">{r.route}</span>
              <span className="flex gap-4 shrink-0 text-[#64748b]">
                <span>{r.n.toLocaleString()}</span>
                <span className={r.avgMs > 1000 ? 'text-[#b91c1c]' : ''}>{r.avgMs}ms avg</span>
                {r.errors > 0 && <span className="text-[#b91c1c]">{r.errors} err</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
