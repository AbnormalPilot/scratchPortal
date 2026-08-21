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
  Crown,
  Award,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Flame,
  Gamepad2,
  Users,
  RotateCcw,
  Sparkles,
  Zap,
  Music,
  Trash2,
  Edit3,
  Radio,
  Plus,
  Eye,
  EyeOff,
  Check,
  X,
  Layers,
  UserMinus,
} from 'lucide-react';

export default function MissionControl({ onNavigateLeaderboard, onNavigateTeams, onNavigateChallenges }) {
  const { eventConfig, refreshSession } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Twists & Modifiers state
  const [twists, setTwists] = useState([]);
  const [showTwistModal, setShowTwistModal] = useState(false);
  const [editingTwistId, setEditingTwistId] = useState(null);
  const [twistTitle, setTwistTitle] = useState('');
  const [twistDesc, setTwistDesc] = useState('');
  const [twistPoints, setTwistPoints] = useState(5);

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

  const fetchTwists = async () => {
    try {
      const res = await api.get('/twists');
      if (res.twists) {
        setTwists(res.twists);
      }
    } catch (err) {
      console.error('Failed to fetch twists:', err);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchTwists();

    const handleRefresh = () => fetchOverview();
    socketClient.on('stage:changed', handleRefresh);
    socketClient.on('challenge:list_updated', handleRefresh);
    socketClient.on('challenge:seat_updated', handleRefresh);
    socketClient.on('submission:updated', handleRefresh);
    socketClient.on('score:updated', handleRefresh);
    socketClient.on('timer:adjusted', handleRefresh);
    socketClient.on('leaderboard:published', handleRefresh);
    socketClient.on('twist:updated', fetchTwists);
    socketClient.on('twist:released', fetchTwists);

    return () => {
      socketClient.off('stage:changed', handleRefresh);
      socketClient.off('challenge:list_updated', handleRefresh);
      socketClient.off('challenge:seat_updated', handleRefresh);
      socketClient.off('submission:updated', handleRefresh);
      socketClient.off('score:updated', handleRefresh);
      socketClient.off('timer:adjusted', handleRefresh);
      socketClient.off('leaderboard:published', handleRefresh);
      socketClient.off('twist:updated', fetchTwists);
      socketClient.off('twist:released', fetchTwists);
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

  const handlePublishR1Leaderboard = async (publish = true) => {
    setActionLoading('publish_r1_leaderboard');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/leaderboard/publish-r1', { publish });
      setActionMessage({ type: 'success', text: res.message });
      await refreshSession();
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update Round 1 leaderboard.' });
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

  const PRESET_TWISTS = [
    {
      title: 'Add Background Music & Sound Effects',
      description: 'Integrate an atmospheric background music loop with interactive sound effects for player jumps, hits, scoring, or item pickups.',
      bonusPoints: 5,
    },
    {
      title: 'Add Countdown Timer & Score Multipliers',
      description: 'Implement a dynamic time-attack survival clock with streak multipliers for consecutive successes and game-over trigger on expiry.',
      bonusPoints: 8,
    },
    {
      title: 'Add Secret Easter Egg / Hidden Combo Code',
      description: 'Add a secret key combo (e.g. Up-Up-Down-Down or specific click area) that unlocks a special sprite skin, turbo mode, or hidden developer message.',
      bonusPoints: 5,
    },
    {
      title: 'Add Difficulty Selection & Custom Skins',
      description: 'Build an interactive opening menu allowing players to choose between Easy / Hard modes or select between multiple playable character costumes with distinct speeds.',
      bonusPoints: 8,
    },
  ];

  const handleQuickAddPreset = async (preset) => {
    setActionLoading(`preset_${preset.title}`);
    setActionMessage({ type: '', text: '' });
    try {
      const res = await api.post('/twists', {
        title: preset.title,
        description: preset.description,
        bonusPoints: preset.bonusPoints,
        isReleased: false,
      });
      setActionMessage({ type: 'success', text: `Draft twist "${preset.title}" added to vault! Ready to release when you choose.` });
      await fetchTwists();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to add preset twist.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTwistId(null);
    setTwistTitle('');
    setTwistDesc('');
    setTwistPoints(5);
    setShowTwistModal(true);
  };

  const handleOpenEditModal = (twist) => {
    setEditingTwistId(twist.id);
    setTwistTitle(twist.title);
    setTwistDesc(twist.description);
    setTwistPoints(twist.bonusPoints || 5);
    setShowTwistModal(true);
  };

  const handleSaveTwist = async (e) => {
    e.preventDefault();
    if (!twistTitle.trim() || !twistDesc.trim()) {
      setActionMessage({ type: 'error', text: 'Please fill in both title and description for the twist.' });
      return;
    }

    setActionLoading('save_twist');
    setActionMessage({ type: '', text: '' });

    try {
      if (editingTwistId) {
        await api.put(`/twists/${editingTwistId}`, {
          title: twistTitle.trim(),
          description: twistDesc.trim(),
          bonusPoints: Number(twistPoints) || 5,
        });
        setActionMessage({ type: 'success', text: 'Twist updated successfully!' });
      } else {
        await api.post('/twists', {
          title: twistTitle.trim(),
          description: twistDesc.trim(),
          bonusPoints: Number(twistPoints) || 5,
          isReleased: false,
        });
        setActionMessage({ type: 'success', text: 'New draft twist saved to vault! Click "RELEASE" when you want all squads to receive it.' });
      }
      setShowTwistModal(false);
      await fetchTwists();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to save twist.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleReleaseTwist = async (twist) => {
    if (!window.confirm(`⚡ BROADCAST TO ALL TEAMS?\n\nAre you sure you want to release "${twist.title}" (+${twist.bonusPoints} PTS) to ALL squads in real time now?`)) {
      return;
    }

    setActionLoading(`release_${twist.id}`);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.patch(`/twists/${twist.id}/release`, {});
      setActionMessage({ type: 'success', text: `🚨 BROADCASTED! "${twist.title}" is now LIVE on all teams' screens!` });
      await fetchTwists();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to release twist.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleUnreleaseTwist = async (twist) => {
    if (!window.confirm(`Recall "${twist.title}" back to draft vault? Squads will no longer see it.`)) {
      return;
    }

    setActionLoading(`unrelease_${twist.id}`);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.patch(`/twists/${twist.id}/unrelease`, {});
      setActionMessage({ type: 'success', text: `Twist "${twist.title}" recalled to drafts.` });
      await fetchTwists();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to recall twist.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleReleaseAllTwists = async () => {
    const unreleasedCount = twists.filter((t) => !t.isReleased).length;
    if (unreleasedCount === 0) {
      setActionMessage({ type: 'error', text: 'No draft twists in the vault to release. Create some twists first!' });
      return;
    }

    if (!window.confirm(`⚡ RELEASE ALL TWISTS AT ONCE?\n\nAre you sure you want to broadcast all ${unreleasedCount} draft twists to ALL ~60 squads simultaneously in real time?`)) {
      return;
    }

    setActionLoading('release_all_twists');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/twists/release-all', {});
      setActionMessage({ type: 'success', text: `🚨 ALL TWISTS BROADCASTED! All squads have received the surprise modifiers!` });
      await fetchTwists();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to bulk release twists.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleUnreleaseAllTwists = async () => {
    if (!window.confirm(`Recall ALL twists back to draft vault? Squads will no longer see any twists.`)) {
      return;
    }

    setActionLoading('unrelease_all_twists');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/twists/unrelease-all', {});
      setActionMessage({ type: 'success', text: 'All twists have been recalled back to the vault.' });
      await fetchTwists();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to bulk recall twists.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleDeleteTwist = async (twist) => {
    if (!window.confirm(`Permanently delete "${twist.title}"?`)) {
      return;
    }

    setActionLoading(`delete_${twist.id}`);
    setActionMessage({ type: '', text: '' });

    try {
      await api.delete(`/twists/${twist.id}`);
      setActionMessage({ type: 'success', text: `Twist "${twist.title}" deleted.` });
      await fetchTwists();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete twist.' });
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f6ab3c] to-[#e69828] text-white flex items-center justify-center font-bold shadow-[3px_3px_0px_#a4640c] border-2 border-white shrink-0">
            <Shield className="w-6 h-6" />
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
        
        {/* Step 1: Round 1 Sprint Controls & Timer */}
        <div className="bg-white rounded-xl p-5 border-2 border-[#bad6fc] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#4e97fe] text-white text-[11px] font-bold flex items-center justify-center">1</span>
              Round 1 Sprint Controls & Timer
            </h3>
            <span className={`text-[10px] font-pixel px-2 py-0.5 rounded font-black ${
              stage === 'ROUND1_BUILDING'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              {stage === 'ROUND1_BUILDING' ? 'SPRINT LIVE' : 'CONFIGURATION'}
            </span>
          </div>

          {/* Quick link banner to creative themes catalog */}
          <div className="p-3 bg-[#fbfdff] border-2 border-[#bad6fc] rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Gamepad2 className="w-4 h-4 text-[#4e97fe] shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#1e293b] block truncate">
                  Game Themes ({overview?.challenges?.length || 0})
                </span>
                <span className="text-[10px] font-retro text-[#64748b] block truncate">
                  Creative themes & live quotas configured on Themes page
                </span>
              </div>
            </div>

            <a
              href="/challenges"
              className="px-3 py-1.5 rounded-lg bg-[#f0f7ff] hover:bg-[#e0efff] text-[#4e97fe] border border-[#bad6fc] text-[10px] font-pixel transition-all flex items-center gap-1 font-bold shrink-0 shadow-2xs"
            >
              <span>THEMES CATALOG ↗</span>
            </a>
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
              <span className="font-pixel text-[10px] text-[#1e293b] uppercase font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#4e97fe]" />
                Schedule Event Start Time (Optional):
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
                  className="text-[10px] font-pixel text-rose-600 hover:text-rose-800 underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Schedule & Timers (Back to Standby)
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

          {/* Round 1 Leaderboard Publishing Box */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] text-[#1e293b] uppercase font-bold flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#4e97fe]" />
                Round 1 Sprint Standings:
              </span>
              <span className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                eventConfig?.isR1LeaderboardPublished
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {eventConfig?.isR1LeaderboardPublished ? 'PUBLISHED' : 'UNPUBLISHED'}
              </span>
            </div>

            {eventConfig?.isR1LeaderboardPublished ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePublishR1Leaderboard(true)}
                  disabled={actionLoading !== ''}
                  className="flex-1 py-2 px-3 rounded-lg text-[10px] font-pixel font-bold bg-[#4e97fe] hover:bg-[#3c86ee] text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trophy className="w-3 h-3" />
                  <span>SYNC & RE-PUBLISH R1 LEADERBOARD</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePublishR1Leaderboard(false)}
                  disabled={actionLoading !== ''}
                  className="py-2 px-3 rounded-lg text-[10px] font-pixel text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer font-bold"
                >
                  UNPUBLISH
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handlePublishR1Leaderboard(true)}
                disabled={actionLoading !== ''}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-pixel font-bold bg-[#4e97fe] hover:bg-[#3c86ee] text-white transition-all flex items-center justify-between shadow-xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-white" /> Publish Round 1 Leaderboard
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
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
              {stage === 'ROUND2_LIVE' ? 'STAGE LIVE' : stage === 'ROUND2_PREP' ? 'SCHEDULED' : 'MANUAL SELECTION'}
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
              <span className="font-pixel text-[10px] text-[#1e293b] uppercase font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Schedule Round 2 Start Time (Countdown Timer):
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
                  className="text-[10px] font-pixel text-rose-600 hover:text-rose-800 underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Schedule & Timers (Back to Standby)
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

          {/* Publish Final Grand Champion Leaderboard Button */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] text-[#1e293b] uppercase font-bold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#f6ab3c]" />
                Grand Finale Final Standings:
              </span>
              <span className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                eventConfig?.isLeaderboardPublished
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {eventConfig?.isLeaderboardPublished ? 'PUBLISHED' : 'UNPUBLISHED'}
              </span>
            </div>

            {eventConfig?.isLeaderboardPublished ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePublishLeaderboard(true)}
                  disabled={actionLoading !== ''}
                  className="flex-1 py-2 px-3 rounded-lg text-[10px] font-pixel font-bold bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 border border-amber-500"
                >
                  <Crown className="w-3 h-3" />
                  <span>SYNC & RE-PUBLISH FINAL LEADERBOARD</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePublishLeaderboard(false)}
                  disabled={actionLoading !== ''}
                  className="py-2 px-3 rounded-lg text-[10px] font-pixel text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer font-bold"
                >
                  UNPUBLISH
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handlePublishLeaderboard(true)}
                disabled={actionLoading !== ''}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-pixel font-bold bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] transition-all flex items-center justify-between shadow-xs cursor-pointer border border-amber-500"
              >
                <span className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-[#141720]" /> Publish Grand Finale Leaderboard
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* MID-SPRINT SURPRISE TWISTS & MYSTERY MODIFIERS COMMAND ARENA */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#ffbe00] shadow-[6px_6px_0px_#fde68a] space-y-5 relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-200/70 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ffbe00] via-[#f59e0b] to-[#d97706] text-[#141720] flex items-center justify-center font-black shadow-[3px_3px_0px_#b45309] border-2 border-white shrink-0">
              <Zap className="w-6 h-6 fill-[#141720]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold font-pixel text-[#1e293b] tracking-tight">
                  MID-SPRINT SURPRISE TWISTS & MODIFIERS
                </h3>
                <span className="text-[9px] font-pixel px-2 py-0.5 rounded-md bg-[#ffbe00]/20 text-[#b45309] border border-[#f59e0b]/40 font-black">
                  LIVE VAULT
                </span>
              </div>
              <p className="text-xs font-retro text-[#64748b] mt-0.5">
                Release unexpected bonus criteria in the middle of Round 1 • Broadcasts to all ~60 squads in real-time.
              </p>
            </div>
          </div>

          {/* Action Buttons (Master Release & Custom Twist) */}
          <div className="flex items-center gap-2 flex-wrap">
            {twists.some((t) => !t.isReleased) ? (
              <button
                type="button"
                onClick={handleReleaseAllTwists}
                disabled={actionLoading !== ''}
                className="px-4 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-pixel font-black flex items-center gap-2 transition-all shadow-[2px_2px_0px_#065f46] cursor-pointer animate-pulse disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>⚡ RELEASE ALL TWISTS AT ONCE ({twists.filter((t) => !t.isReleased).length}) ↗</span>
              </button>
            ) : twists.length > 0 ? (
              <button
                type="button"
                onClick={handleUnreleaseAllTwists}
                disabled={actionLoading !== ''}
                className="px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-pixel font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>RECALL ALL TO VAULT</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2.5 rounded-xl bg-[#141720] hover:bg-[#1e293b] text-[#ffbe00] text-xs font-pixel font-bold flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#000] cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW CUSTOM TWIST</span>
            </button>
          </div>
        </div>

        {/* Quick 1-Click Preset Vault */}
        <div className="space-y-2">
          <span className="text-[10px] font-pixel text-[#64748b] uppercase tracking-wider font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            1-Click Preset Quick Templates (Adds to Draft Vault):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {PRESET_TWISTS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickAddPreset(preset)}
                disabled={actionLoading !== ''}
                className="p-3 rounded-2xl bg-gradient-to-b from-[#fffdf5] to-[#fef8e7] border-2 border-amber-200 hover:border-amber-400 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group disabled:opacity-50"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[9px] font-pixel font-black px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                    +{preset.bonusPoints} PTS
                  </span>
                  <Plus className="w-3.5 h-3.5 text-amber-700 group-hover:scale-125 transition-transform" />
                </div>
                <h5 className="text-xs font-bold text-[#1e293b] font-pixel line-clamp-1 group-hover:text-amber-800">
                  {preset.title}
                </h5>
                <p className="text-[11px] font-retro text-[#64748b] line-clamp-2 mt-1 leading-snug">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Active Twists List (Drafts & Live Released) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-pixel text-[#1e293b] uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#4e97fe]" />
              Configured Tournament Twists ({twists.length}):
            </span>
            <span className="text-[10px] font-pixel text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
              {twists.filter((t) => t.isReleased).length} Live / {twists.filter((t) => !t.isReleased).length} Drafts
            </span>
          </div>

          {twists.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-pixel text-slate-600">NO TWISTS IN VAULT YET</p>
              <p className="text-xs font-retro text-slate-500 max-w-md mx-auto">
                Click any preset above or "New Custom Twist" to prepare surprise modifiers for your tournament sprint.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {twists.map((twist) => (
                <div
                  key={twist.id}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 shadow-xs ${
                    twist.isReleased
                      ? 'bg-gradient-to-br from-emerald-50/70 to-emerald-100/40 border-emerald-400 shadow-[3px_3px_0px_#a7f3d0]'
                      : 'bg-gradient-to-br from-slate-50 to-white border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`text-[9px] font-pixel px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 ${
                          twist.isReleased
                            ? 'bg-emerald-600 text-white animate-pulse'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${twist.isReleased ? 'bg-white' : 'bg-slate-400'}`} />
                        {twist.isReleased ? 'LIVE ON ALL SCREENS' : 'DRAFT IN VAULT'}
                      </span>

                      <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-black">
                        +{twist.bonusPoints} BONUS PTS
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold font-pixel text-[#1e293b] pt-0.5">
                      {twist.title}
                    </h4>
                    <p className="text-xs font-retro text-[#475569] mt-1 leading-relaxed">
                      {twist.description}
                    </p>

                    {twist.isReleased && twist.releasedAt && (
                      <p className="text-[10px] font-retro text-emerald-700 mt-2 font-bold">
                        Broadcasted at {new Date(twist.releasedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(twist)}
                        disabled={actionLoading !== ''}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-pixel transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTwist(twist)}
                        disabled={actionLoading !== ''}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-pixel transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>

                    {twist.isReleased ? (
                      <button
                        type="button"
                        onClick={() => handleUnreleaseTwist(twist)}
                        disabled={actionLoading !== ''}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-pixel font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <EyeOff className="w-3 h-3" />
                        <span>Recall Draft</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReleaseTwist(twist)}
                        disabled={actionLoading !== ''}
                        className="px-3.5 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-[10px] font-pixel font-black shadow-[2px_2px_0px_#065f46] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        <span>RELEASE TO ALL NOW ↗</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Twist Create / Edit Modal */}
      {showTwistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[8px_8px_0px_#bad6fc] max-w-lg w-full space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#141720] flex items-center justify-center font-bold shadow-xs">
                  <Zap className="w-5 h-5 fill-[#141720]" />
                </div>
                <h3 className="text-sm sm:text-base font-bold font-pixel text-[#1e293b]">
                  {editingTwistId ? 'EDIT SURPRISE TWIST' : 'CREATE SURPRISE TWIST'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTwistModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTwist} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-pixel text-[#1e293b] uppercase font-bold mb-1">
                  Twist Objective Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Add Background Music & Custom SFX"
                  value={twistTitle}
                  onChange={(e) => setTwistTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-retro text-[#1e293b] focus:bg-white focus:border-[#4e97fe]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-pixel text-[#1e293b] uppercase font-bold mb-1">
                  Instructions / Requirements for Squads:
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe what extra game mechanic or sound students must add to their Scratch project..."
                  value={twistDesc}
                  onChange={(e) => setTwistDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-retro text-[#1e293b] focus:bg-white focus:border-[#4e97fe]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-pixel text-[#1e293b] uppercase font-bold mb-1">
                  Suggested Bonus Points (Informational for Judges):
                </label>
                <div className="flex items-center gap-2">
                  {[3, 5, 8, 10, 15].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setTwistPoints(pts)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-pixel font-bold cursor-pointer border transition-all ${
                        Number(twistPoints) === pts
                          ? 'bg-[#ffbe00] text-[#141720] border-amber-600 shadow-xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      +{pts} PTS
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTwistModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-pixel text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== ''}
                  className="px-5 py-2 rounded-xl bg-[#4e97fe] hover:bg-[#307fef] text-white text-xs font-pixel font-bold shadow-[2px_2px_0px_#2463bf] cursor-pointer"
                >
                  {editingTwistId ? 'SAVE CHANGES' : 'SAVE DRAFT TO VAULT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>

      </div>

    </div>
  );
}
