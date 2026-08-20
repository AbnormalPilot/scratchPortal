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

export default function MissionControl({ onNavigateLeaderboard, onNavigateTeams }) {
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
  const [r2DurationMinutes, setR2DurationMinutes] = useState(60);
  const [r2ScheduledTime, setR2ScheduledTime] = useState('');

  const handleConfigureSchedule = async (startNow = false) => {
    setActionLoading(startNow ? 'launch_r1_now' : 'save_schedule');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/schedule', {
        targetRound: 1,
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

  const handleConfigureR2Schedule = async (startR2Now = false) => {
    setActionLoading(startR2Now ? 'launch_r2_now' : 'save_r2_schedule');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/schedule', {
        targetRound: 2,
        r2StartTime: startR2Now ? null : r2ScheduledTime ? new Date(r2ScheduledTime).toISOString() : null,
        r2DurationMinutes: Number(r2DurationMinutes) || 60,
        startR2Now,
      });

      setActionMessage({ type: 'success', text: res.message });
      await refreshSession();
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update Round 2 schedule.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleSetQuickR2Start = (offsetMinutes) => {
    const target = new Date(Date.now() + offsetMinutes * 60 * 1000);
    const tzOffset = target.getTimezoneOffset() * 60000;
    const localISOTime = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16);
    setR2ScheduledTime(localISOTime);
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
      setR2ScheduledTime('');
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
      setR2ScheduledTime('');
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
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f6ab3c] to-[#e69828] text-white flex items-center justify-center font-bold shadow-[3px_3px_0px_#a4640c] text-2xl border-2 border-white shrink-0">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                ORGANIZER MISSION CONTROL
              </h1>
              <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] font-bold">
                COMMAND
              </span>
            </div>
            <p className="text-xs font-retro text-[#64748b] mt-0.5">
              Tournament Stage: <span className="font-bold font-pixel text-[#4e97fe] text-[11px]">{formatStageLabel(stage)}</span>
            </p>
          </div>
        </div>

        {/* Action button & Quick Stats */}
        <div className="flex flex-wrap items-center gap-3">
          {onNavigateTeams && (
            <button
              onClick={onNavigateTeams}
              className="px-4 py-2.5 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel font-bold flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#2463bf] cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>SQUADS & SUBMISSIONS ({overview?.telemetry?.totalTeams || 0}) ↗</span>
            </button>
          )}

          {overview?.telemetry && (
            <div className="flex items-center gap-2 text-xs">
              <div
                onClick={onNavigateTeams}
                className="text-center px-3 py-1 bg-[#f0f7ff] hover:bg-[#e0efff] rounded-xl border border-[#bad6fc] cursor-pointer transition-colors"
                title="Click to view all squad details"
              >
                <span className="text-[9px] text-[#64748b] block font-pixel">SUBMITTED</span>
                <span className="font-bold text-emerald-700 font-pixel text-xs">
                  {overview.telemetry.r1Submissions?.submitted ?? 0}
                </span>
              </div>
              <div
                onClick={onNavigateTeams}
                className="text-center px-3 py-1 bg-[#f0f7ff] hover:bg-[#e0efff] rounded-xl border border-[#bad6fc] cursor-pointer transition-colors"
                title="Click to view all squad details"
              >
                <span className="text-[9px] text-[#64748b] block font-pixel">DRAFTS</span>
                <span className="font-bold text-amber-700 font-pixel text-xs">
                  {overview.telemetry.r1Submissions?.draft ?? 0}
                </span>
              </div>
            </div>
          )}
        </div>
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

        {/* Step 2: Finalists & Round 2 Live Presentations Duration & Schedule */}
        <div className="bg-white rounded-xl p-5 border-2 border-[#bad6fc] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#f6ab3c] text-white text-[11px] font-bold flex items-center justify-center">2</span>
              Round 2 Finalists & Live Stage
            </h3>
            <span className={`text-[10px] font-pixel px-2 py-0.5 rounded font-black ${
              stage === 'ROUND2_LIVE'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : stage === 'ROUND2_PREP'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              {stage === 'ROUND2_LIVE' ? '🎤 STAGE LIVE' : stage === 'ROUND2_PREP' ? '⏱️ SCHEDULED' : 'MANUAL SELECTION'}
            </span>
          </div>

          {/* Quick link to squads directory to nominate finalists */}
          {onNavigateTeams && (
            <button
              type="button"
              onClick={onNavigateTeams}
              className="w-full py-2 px-3 rounded-xl text-xs font-pixel font-bold bg-[#f6ab3c] hover:bg-[#e69828] text-white transition-all flex items-center justify-between shadow-xs cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5" /> Nominate Finalists in Squads Directory ↗
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Round 2 Duration & Start Scheduler Panel */}
          <div className="p-3.5 bg-amber-50/70 border-2 border-amber-200 rounded-xl space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] text-[#1e293b] flex items-center gap-1.5 uppercase font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Round 2 Presentation Duration:
              </span>
              <span className="font-pixel text-xs text-amber-800 font-black">
                {r2DurationMinutes} Mins ({r2DurationMinutes >= 60 ? `${(r2DurationMinutes / 60).toFixed(1)} hrs` : `${r2DurationMinutes}m`})
              </span>
            </div>

            {/* Quick Duration Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: '30m', mins: 30 },
                { label: '45m', mins: 45 },
                { label: '1 Hour', mins: 60 },
                { label: '1.5 Hours', mins: 90 },
                { label: '2 Hours', mins: 120 },
              ].map((preset) => (
                <button
                  key={preset.mins}
                  type="button"
                  onClick={() => setR2DurationMinutes(preset.mins)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-pixel transition-all cursor-pointer border ${
                    Number(r2DurationMinutes) === preset.mins
                      ? 'bg-[#f6ab3c] text-white border-[#d98516] shadow-xs'
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
                  value={r2DurationMinutes}
                  onChange={(e) => setR2DurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono text-center text-[#1e293b]"
                />
                <span className="text-[10px] text-[#64748b] font-retro">min</span>
              </div>
            </div>

            {/* When Will Round 2 Start */}
            <div className="pt-2 border-t border-amber-200/80 space-y-2">
              <span className="font-pixel text-[10px] text-[#1e293b] block uppercase font-bold">
                📅 Schedule Round 2 Start Time (Countdown Timer):
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '+5 Mins', mins: 5 },
                  { label: '+10 Mins', mins: 10 },
                  { label: '+15 Mins', mins: 15 },
                  { label: '+30 Mins', mins: 30 },
                  { label: '+1 Hour', mins: 60 },
                ].map((s) => (
                  <button
                    key={s.mins}
                    type="button"
                    onClick={() => handleSetQuickR2Start(s.mins)}
                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-[#475569] border border-slate-300 text-[10px] font-pixel transition-all cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={r2ScheduledTime}
                  onChange={(e) => setR2ScheduledTime(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-[#1e293b]"
                />
                {r2ScheduledTime && (
                  <button
                    type="button"
                    onClick={() => setR2ScheduledTime('')}
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
                onClick={() => handleConfigureR2Schedule(true)}
                disabled={actionLoading !== ''}
                className="w-full sm:w-1/2 py-2.5 px-3 rounded-lg text-xs font-pixel bg-[#10b981] hover:bg-[#059669] text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer font-bold disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>START ROUND 2 NOW</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfigureR2Schedule(false)}
                disabled={actionLoading !== ''}
                className="w-full sm:w-1/2 py-2.5 px-3 rounded-lg text-xs font-pixel bg-[#f6ab3c] hover:bg-[#e69828] text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer font-bold disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>SAVE R2 SCHEDULE</span>
              </button>
            </div>

            {/* Reset Round 2 Schedule / Timer back to standby */}
            {(eventConfig?.r2StartTime || eventConfig?.r2EndTime || stage === 'ROUND2_LIVE' || stage === 'ROUND2_PREP') && (
              <div className="pt-2 text-center border-t border-amber-200/80">
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

          {/* Active Round 2 Live Controls */}
          {stage === 'ROUND2_LIVE' && (
            <div className="pt-2 space-y-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1e293b] font-pixel text-[10px]">EXTEND LIVE ROUND 2:</span>
                <div className="flex items-center gap-1">
                  {[5, 10, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleExtendTimer(mins, 2)}
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

          {/* Publish Final Leaderboard Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => handlePublishLeaderboard(true)}
              disabled={actionLoading !== ''}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-pixel font-bold bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] transition-all flex items-center justify-between shadow-xs cursor-pointer border border-amber-500"
            >
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#141720]" /> Publish Final Leaderboard
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

    </div>
  );
}
