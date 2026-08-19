import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import socketClient from '../../lib/socket.js';
import { formatStageLabel } from '../../lib/utils.js';
import {
  Shield,
  Clock,
  PlusCircle,
  Trophy,
  Award,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Flame,
  Gamepad2,
  Users,
} from 'lucide-react';

export default function MissionControl({ onNavigateLeaderboard }) {
  const { eventConfig, refreshSession } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  const stage = eventConfig?.currentStage || 'REGISTRATION';

  const fetchOverview = async () => {
    try {
      const data = await api.get('/admin/overview');
      setOverview(data);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();

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

  const [r1DurationMinutes, setR1DurationMinutes] = useState(120);
  const [r1ScheduledTime, setR1ScheduledTime] = useState('');

  const handleConfigureSchedule = async (startNow = false) => {
    setActionLoading(startNow ? 'launch_r1_now' : 'save_schedule');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/schedule', {
        r1StartTime: startNow ? null : r1ScheduledTime ? new Date(r1ScheduledTime).toISOString() : null,
        r1DurationMinutes: Number(r1DurationMinutes) || 120,
        startNow,
      });

      setActionMessage({ type: 'success', text: res.message });
      await refreshSession();
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update schedule.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleSetQuickStart = (offsetMinutes) => {
    const target = new Date(Date.now() + offsetMinutes * 60 * 1000);
    const tzOffset = target.getTimezoneOffset() * 60000;
    const localISOTime = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16);
    setR1ScheduledTime(localISOTime);
  };

  const handleStageChange = async (targetStage) => {
    setActionLoading(`stage_${targetStage}`);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/event-stage', { stage: targetStage });
      setActionMessage({ type: 'success', text: `Tournament stage updated to ${formatStageLabel(targetStage)}!` });
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
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to publish leaderboard.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleResetTimers = async () => {
    if (!window.confirm('Reset all active timers and cancel any scheduled sprint?')) {
      return;
    }

    setActionLoading('reset_timers');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/timer/reset', {});
      setR1ScheduledTime('');
      setActionMessage({ type: 'success', text: res.message });
      await refreshSession();
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to reset timers.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleDevResetAll = async () => {
    if (!window.confirm('Reset all team claims, submissions, and scores back to clean state?')) {
      return;
    }

    setActionLoading('dev_reset');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/dev-reset-all', {});
      setR1ScheduledTime('');
      setActionMessage({ type: 'success', text: res.message });
      await refreshSession();
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to reset test data.' });
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-xl p-5 border-2 border-[#bad6fc] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f6ab3c] text-white flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1e293b]">Organizer Mission Control</h2>
            <p className="text-xs text-[#64748b]">Tournament Stage: <span className="font-bold text-[#4e97fe]">{formatStageLabel(stage)}</span></p>
          </div>
        </div>

        {/* Quick Stats */}
        {overview?.telemetry && (
          <div className="flex items-center gap-3 text-xs">
            <div className="text-center px-3 py-1 bg-[#f0f7ff] rounded-lg border border-[#bad6fc]">
              <span className="text-[10px] text-[#64748b] block font-pixel">TEAMS</span>
              <span className="font-bold text-[#1e293b] font-pixel text-xs">{overview.telemetry.totalTeams}</span>
            </div>
            <div className="text-center px-3 py-1 bg-[#f0f7ff] rounded-lg border border-[#bad6fc]">
              <span className="text-[10px] text-[#64748b] block font-pixel">SUBMISSIONS</span>
              <span className="font-bold text-[#1e293b] font-pixel text-xs">{overview.telemetry.r1Submissions?.submitted ?? 0}</span>
            </div>
            <div className="text-center px-3 py-1 bg-[#f0f7ff] rounded-lg border border-[#bad6fc]">
              <span className="text-[10px] text-[#64748b] block font-pixel">SEATS CLAIMED</span>
              <span className="font-bold text-[#1e293b] font-pixel text-xs">{overview.telemetry.claimedSeats} / {overview.telemetry.totalSeats}</span>
            </div>
          </div>
        )}
      </div>

      {actionMessage.text && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Main Flow Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Step 1: Problem Statements & Round 1 Duration & Schedule */}
        <div className="bg-white rounded-xl p-5 border-2 border-[#bad6fc] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#4e97fe] text-white text-[11px] font-bold flex items-center justify-center">1</span>
              Problem Statements & Round 1 Sprints
            </h3>
            <span className={`text-[10px] font-pixel px-2 py-0.5 rounded font-black ${
              stage === 'ROUND1_BUILDING'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              {stage === 'ROUND1_BUILDING' ? '⚡ SPRINT LIVE' : 'CONFIGURATION'}
            </span>
          </div>

          {/* Round 1 Duration & Start Scheduler Panel */}
          <div className="p-3.5 bg-[#f0f7ff] border-2 border-[#bad6fc] rounded-xl space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] text-[#1e293b] flex items-center gap-1.5 uppercase font-bold">
                <Clock className="w-3.5 h-3.5 text-[#4e97fe]" />
                Round 1 Sprint Duration:
              </span>
              <span className="font-pixel text-xs text-[#4e97fe] font-black">
                {r1DurationMinutes} Mins ({r1DurationMinutes >= 60 ? `${(r1DurationMinutes / 60).toFixed(1)} hrs` : `${r1DurationMinutes}m`})
              </span>
            </div>

            {/* Quick Duration Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: '30m', mins: 30 },
                { label: '1 Hour', mins: 60 },
                { label: '2 Hours', mins: 120 },
                { label: '3 Hours', mins: 180 },
                { label: '4 Hours', mins: 240 },
              ].map((preset) => (
                <button
                  key={preset.mins}
                  type="button"
                  onClick={() => setR1DurationMinutes(preset.mins)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-pixel transition-all cursor-pointer border ${
                    Number(r1DurationMinutes) === preset.mins
                      ? 'bg-[#4e97fe] text-white border-[#307fef] shadow-xs'
                      : 'bg-white text-[#475569] border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              
              {/* Custom Minutes Input */}
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={r1DurationMinutes}
                  onChange={(e) => setR1DurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono text-center text-[#1e293b]"
                />
                <span className="text-[10px] text-[#64748b] font-retro">min</span>
              </div>
            </div>

            {/* When Will Round 1 Start */}
            <div className="pt-2 border-t border-[#bad6fc] space-y-2">
              <span className="font-pixel text-[10px] text-[#1e293b] block uppercase font-bold">
                📅 Schedule Event Start Time (Optional):
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '+5 Mins', mins: 5 },
                  { label: '+15 Mins', mins: 15 },
                  { label: '+30 Mins', mins: 30 },
                  { label: '+1 Hour', mins: 60 },
                ].map((s) => (
                  <button
                    key={s.mins}
                    type="button"
                    onClick={() => handleSetQuickStart(s.mins)}
                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-[#475569] border border-slate-300 text-[10px] font-pixel transition-all cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={r1ScheduledTime}
                  onChange={(e) => setR1ScheduledTime(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-[#1e293b]"
                />
                {r1ScheduledTime && (
                  <button
                    type="button"
                    onClick={() => setR1ScheduledTime('')}
                    className="text-[10px] font-pixel text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Launch & Schedule Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => handleConfigureSchedule(true)}
                disabled={actionLoading !== ''}
                className="w-full sm:w-1/2 py-2.5 px-3 rounded-lg text-xs font-pixel bg-[#10b981] hover:bg-[#059669] text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer font-bold disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>START SPRINT NOW</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfigureSchedule(false)}
                disabled={actionLoading !== ''}
                className="w-full sm:w-1/2 py-2.5 px-3 rounded-lg text-xs font-pixel bg-[#4e97fe] hover:bg-[#3c86ee] text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer font-bold disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>SAVE SCHEDULE</span>
              </button>
            </div>

            {/* Reset Schedule / Timer back to standby */}
            {(eventConfig?.r1StartTime || eventConfig?.r1EndTime || stage === 'ROUND1_BUILDING') && (
              <div className="pt-2 text-center border-t border-[#bad6fc]/60">
                <button
                  type="button"
                  onClick={handleResetTimers}
                  disabled={actionLoading !== ''}
                  className="text-[10px] font-pixel text-rose-600 hover:text-rose-800 underline cursor-pointer disabled:opacity-50"
                >
                  🔄 Reset Schedule & Timers (Back to Standby)
                </button>
              </div>
            )}
          </div>

          {/* Active Sprint Live Controls */}
          {stage === 'ROUND1_BUILDING' && (
            <div className="pt-2 space-y-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1e293b] font-pixel text-[10px]">EXTEND ACTIVE SPRINT:</span>
                <div className="flex items-center gap-1">
                  {[10, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleExtendTimer(mins, 1)}
                      disabled={actionLoading !== ''}
                      className="px-2 py-1 rounded bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] text-[10px] font-pixel transition-all cursor-pointer font-bold"
                    >
                      +{mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Finalists & Round 2 */}
        <div className="bg-white rounded-xl p-5 border-2 border-[#bad6fc] shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#f6ab3c] text-white text-[11px] font-bold flex items-center justify-center">2</span>
            Finalists & Leaderboard
          </h3>

          <div className="space-y-2 pt-1">
            <button
              onClick={handleComputeFinalists}
              disabled={actionLoading !== ''}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-[#f6ab3c] hover:bg-[#e69828] text-white transition-all flex items-center justify-between shadow-sm cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5" /> Compute & Lock Finalists (Top 1 / Challenge)
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleStageChange('ROUND2_LIVE')}
              disabled={actionLoading !== ''}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                stage === 'ROUND2_LIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#4e97fe] hover:bg-[#3c86ee] text-white shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5" /> Start Round 2 (Live Presentations)
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handlePublishLeaderboard(true)}
              disabled={actionLoading !== ''}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] transition-all flex items-center justify-between shadow-sm cursor-pointer"
            >
              <span className="flex items-center gap-2 font-bold">
                <Trophy className="w-3.5 h-3.5 text-[#141720]" /> Publish Final Leaderboard
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Emergency Timer Extender & Testing Reset Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        
        {/* Timer Box (8 cols) */}
        <div className="md:col-span-8 bg-white rounded-xl p-4 border-2 border-[#bad6fc] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#4e97fe]" />
            <div>
              <h4 className="text-xs font-bold text-[#1e293b]">Timer Extender</h4>
              <p className="text-[10px] text-[#64748b]">Adds extra sprint minutes in real time</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleExtendTimer(5, stage === 'ROUND2_LIVE' ? 2 : 1)}
              disabled={actionLoading !== ''}
              className="px-2.5 py-1.5 rounded-lg bg-[#f0f7ff] hover:bg-[#e0efff] text-[#4e97fe] border border-[#bad6fc] text-xs font-bold transition-all cursor-pointer"
            >
              +5m
            </button>
            <button
              onClick={() => handleExtendTimer(10, stage === 'ROUND2_LIVE' ? 2 : 1)}
              disabled={actionLoading !== ''}
              className="px-2.5 py-1.5 rounded-lg bg-[#f0f7ff] hover:bg-[#e0efff] text-[#4e97fe] border border-[#bad6fc] text-xs font-bold transition-all cursor-pointer"
            >
              +10m
            </button>
            <button
              onClick={() => handleExtendTimer(15, stage === 'ROUND2_LIVE' ? 2 : 1)}
              disabled={actionLoading !== ''}
              className="px-2.5 py-1.5 rounded-lg bg-[#f0f7ff] hover:bg-[#e0efff] text-[#4e97fe] border border-[#bad6fc] text-xs font-bold transition-all cursor-pointer"
            >
              +15m
            </button>
          </div>
        </div>

        {/* 1-Click Dev Test Reset Button (4 cols) */}
        <div className="md:col-span-4 bg-white rounded-xl p-4 border-2 border-rose-200 shadow-sm flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-[#1e293b]">Reset Test Data</h4>
            <p className="text-[10px] text-[#64748b]">Clear claims & scores</p>
          </div>

          <button
            onClick={handleDevResetAll}
            disabled={actionLoading !== ''}
            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-pixel transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>🔄 RESET</span>
          </button>
        </div>

      </div>

      {/* Live Challenge Claim Breakdown Matrix */}
      <div className="bg-white rounded-2xl p-6 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4e97fe] text-white flex items-center justify-center font-bold">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-pixel text-[#1e293b]">
                LIVE CHALLENGE SQUAD ASSIGNMENTS
              </h3>
              <p className="text-xs font-retro text-[#64748b]">
                Real-time breakdown of which teams selected which problem statement.
              </p>
            </div>
          </div>

          <span className="text-xs font-pixel text-[#4e97fe] px-3 py-1 rounded-lg bg-[#f0f7ff] border border-[#bad6fc]">
            {overview?.challenges?.reduce((acc, c) => acc + (c.teams?.length || 0), 0) || 0} TOTAL SQUADS CLAIMED
          </span>
        </div>

        {overview?.challenges && overview.challenges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview.challenges.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border-2 border-[#bad6fc] bg-[#f8fbff] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase font-bold">
                      {c.category}
                    </span>
                    <span className="text-[10px] font-pixel text-[#1e293b] font-bold">
                      {c.teams?.length || c.claimedCount} / {c.maxCapacity} SQUADS
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold font-pixel text-[#1e293b] line-clamp-1">
                    {c.title}
                  </h4>
                </div>

                {/* Claimed Teams List */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                  <span className="text-[9px] font-pixel text-[#64748b] uppercase block">
                    ASSIGNED SQUADS:
                  </span>

                  {c.teams && c.teams.length > 0 ? (
                    <div className="space-y-1">
                      {c.teams.map((t) => (
                        <div
                          key={t.id}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-[#bad6fc] text-xs flex items-center justify-between gap-2 shadow-xs"
                        >
                          <span className="font-pixel text-[10px] text-[#1e293b] font-bold truncate">
                            👾 {t.name}
                          </span>
                          <span className="font-retro text-[11px] text-[#4e97fe] font-bold shrink-0">
                            {t.accessCode}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-2.5 py-1.5 rounded-lg bg-white/60 border border-dashed border-slate-300 text-[11px] font-retro text-[#94a3b8] italic text-center">
                      No squads have claimed this quest yet
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs font-retro text-[#64748b]">
            No problem statements found.
          </div>
        )}
      </div>

    </div>
  );
}
