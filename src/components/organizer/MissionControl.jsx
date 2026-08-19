import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { socketClient } from '../../lib/socket.js';
import { formatStageLabel } from '../../lib/utils.js';
import ServerTimer from '../layout/ServerTimer.jsx';
import {
  Shield,
  PlayCircle,
  Clock,
  PlusCircle,
  Users,
  Trophy,
  Award,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Radio,
  FileText,
} from 'lucide-react';

const EVENT_STAGES = [
  'REGISTRATION',
  'WAITING_CHALLENGES',
  'CHALLENGE_SELECTION',
  'ROUND1_BUILDING',
  'ROUND1_JUDGING',
  'ROUND2_PREP',
  'ROUND2_LIVE',
  'ROUND2_JUDGING',
  'COMPLETED',
];

export default function MissionControl({ onNavigateLeaderboard }) {
  const { eventConfig, refreshSession } = useAuth();
  const [overview, setOverview] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [finalistsSummary, setFinalistsSummary] = useState(null);

  const stage = eventConfig?.currentStage || 'REGISTRATION';

  const fetchOverview = async () => {
    try {
      const [ovData, logs] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/audit-logs'),
      ]);
      setOverview(ovData);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();

    // Listen to real-time events to refresh telemetry
    const handleRefresh = () => fetchOverview();

    socketClient.on('stage:changed', handleRefresh);
    socketClient.on('challenge:seat_updated', handleRefresh);
    socketClient.on('submission:updated', handleRefresh);
    socketClient.on('score:updated', handleRefresh);
    socketClient.on('timer:adjusted', handleRefresh);
    socketClient.on('leaderboard:published', handleRefresh);

    return () => {
      socketClient.off('stage:changed', handleRefresh);
      socketClient.off('challenge:seat_updated', handleRefresh);
      socketClient.off('submission:updated', handleRefresh);
      socketClient.off('score:updated', handleRefresh);
      socketClient.off('timer:adjusted', handleRefresh);
      socketClient.off('leaderboard:published', handleRefresh);
    };
  }, []);

  const handleStageChange = async (targetStage) => {
    setActionLoading(`stage_${targetStage}`);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/event-stage', { stage: targetStage });
      setActionMessage({ type: 'success', text: `Event transitioned to ${formatStageLabel(targetStage)}!` });
      await refreshSession();
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update stage.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleExtendTimer = async (minutes, roundNumber) => {
    setActionLoading(`timer_${minutes}`);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/timer/extend', { minutes, roundNumber });
      setActionMessage({ type: 'success', text: res.message });
      await refreshSession();
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to extend timer.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleComputeFinalists = async () => {
    setActionLoading('compute_finalists');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/finalists/compute', {});
      setFinalistsSummary(res.finalists);
      setActionMessage({ type: 'success', text: res.message });
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to compute finalists.' });
    } finally {
      setActionLoading('');
    }
  };

  const handlePublishLeaderboard = async (publish = true) => {
    setActionLoading('publish_leaderboard');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/leaderboard/publish', { publish });
      setActionMessage({ type: 'success', text: res.message });
      await refreshSession();
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to publish leaderboard.' });
    } finally {
      setActionLoading('');
    }
  };

  const t = overview?.telemetry;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-slate-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-amber-400 animate-ping" /> Live Operations Control
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
                Organizer Mission Control
              </h2>
              <p className="text-xs text-slate-400">
                Full competition state machine, real-time telemetry, and automated judging engines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchOverview}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Telemetry
            </button>
          </div>
        </div>
      </div>

      {actionMessage.text && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Live Timer if Active */}
      <ServerTimer />

      {/* Telemetry Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Teams Tile */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Registered Teams</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-100">
            {t?.totalTeams ?? '--'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {t?.totalUsers ?? '--'} Total Students
          </span>
        </div>

        {/* Seat Allocation Tile */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Seat Capacity Claimed</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-300">
            {t?.claimedSeats ?? '--'} <span className="text-xs text-slate-500 font-normal">/ {t?.totalSeats ?? '--'}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {t?.seatsRemaining ?? '--'} Seats Open across 12 Challenges
          </span>
        </div>

        {/* Submissions Tile */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Round 1 Submissions</span>
            <Send className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            {t?.r1Submissions?.submitted ?? '--'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {t?.r1Submissions?.draft ?? 0} Drafts • {t?.r1Submissions?.notStarted ?? 0} Not Started
          </span>
        </div>

        {/* Judging Scores Tile */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Scores Submitted</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
            {t?.judging?.r1ScoresCount ?? '--'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            R1 & R2 Score Entries in System
          </span>
        </div>

      </div>

      {/* Main Mission Control Hub (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Stage Machine & Timer Extender (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Stage Progression Controller */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-amber-400" /> Global Event State Progression
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Advance the competition lifecycle. Connected participants and judges receive immediate UI updates via Socket.IO.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EVENT_STAGES.map((s) => {
                const isActive = stage === s;
                const isProcessing = actionLoading === `stage_${s}`;

                return (
                  <button
                    key={s}
                    onClick={() => handleStageChange(s)}
                    disabled={isProcessing}
                    className={`p-3 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                    }`}
                  >
                    <span className="text-[10px] font-mono opacity-75 uppercase">
                      {isActive ? 'CURRENT STAGE' : 'ADVANCE TO'}
                    </span>
                    <span className="font-semibold mt-1 truncate">{formatStageLabel(s)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emergency Timer Extender */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" /> Emergency Round Timer Extender
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Instantly broadcast extra build or demo time to all participants with drift correction.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleExtendTimer(mins, stage.includes('ROUND2') ? 2 : 1)}
                  disabled={Boolean(actionLoading)}
                  className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> +{mins} Minutes
                </button>
              ))}
            </div>
          </div>

          {/* Live Activity Ticker */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" /> Real-time Platform Audit Ticker
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {auditLogs.slice(0, 15).map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-cyan-400 font-bold uppercase text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800/40">
                      {log.eventType}
                    </span>
                    <span className="text-slate-300 truncate">
                      {log.team?.name ? `Team "${log.team.name}"` : log.user?.fullName || 'System Event'}
                    </span>
                  </div>
                  <span className="font-mono text-slate-500 text-[10px] shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Automated Engines & Problem Statements Grid (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Automated Finalist & Publishing Center */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Automated Competition Engines
            </h3>

            {/* 1. Auto Finalist Button */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <h5 className="font-bold text-slate-200 text-xs mb-1">
                Automated Finalist Selection Engine
              </h5>
              <p className="text-[11px] text-slate-400 mb-3">
                Scans all 12 problem statements, picks highest Round 1 score per challenge, and assigns Round 2 queue slots.
              </p>
              <button
                onClick={handleComputeFinalists}
                disabled={actionLoading === 'compute_finalists'}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading === 'compute_finalists' ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Compute & Lock Finalists
                  </>
                )}
              </button>
            </div>

            {/* 2. Publish Leaderboard Button */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <h5 className="font-bold text-slate-200 text-xs mb-1">
                Publish Public Leaderboard
              </h5>
              <p className="text-[11px] text-slate-400 mb-3">
                Calculates final weighted scores (R1 × 0.40 + R2 × 0.60) and releases transparent public rankings.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePublishLeaderboard(true)}
                  disabled={actionLoading === 'publish_leaderboard'}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5" /> Publish Rankings
                </button>
                <button
                  onClick={onNavigateLeaderboard}
                  className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> View Board
                </button>
              </div>
            </div>
          </div>

          {/* Seat Capacity Overview across 12 Challenges */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Problem Statements Capacity Allocation
            </h4>
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {overview?.challenges?.map((c) => {
                const isFull = c.claimedCount >= c.maxCapacity;
                return (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-200 truncate mr-2">{c.title}</span>
                    <span
                      className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                        isFull
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/40'
                          : 'bg-slate-950 text-emerald-400 border border-slate-800'
                      }`}
                    >
                      {c.claimedCount} / {c.maxCapacity} {isFull ? 'FULL' : 'SEATS'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Computed Finalists Modal Summary */}
      {finalistsSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl glass-panel rounded-2xl border border-purple-500/50 p-6 sm:p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Round 2 Finalists Selected ({finalistsSummary.length})
            </h3>
            
            <div className="space-y-2 max-h-72 overflow-y-auto mb-6 pr-1">
              {finalistsSummary.map((f, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-cyan-300 text-sm block">{f.finalistTeamName}</span>
                    <span className="text-[11px] text-slate-400">Challenge: {f.challengeTitle}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-400 block">
                      R1 Score: {f.round1Score} / 100
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Beat {f.competingTeamsCount} teams in challenge
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setFinalistsSummary(null)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              Close Summary & Proceed to Round 2
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
