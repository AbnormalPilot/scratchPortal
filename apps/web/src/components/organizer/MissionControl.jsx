import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import socketClient from '../../lib/socket.js';
import { formatStageLabel } from '../../lib/utils.js';
import {
  Shield,
  Clock,
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
  Trash2,
  Edit3,
  Radio,
  Plus,
  EyeOff,
  X,
  Wrench,
  Calendar,
} from 'lucide-react';

export default function MissionControl({ activeModule: propModule, onNavigateLeaderboard, onNavigateTeams, onNavigateChallenges }) {
  const { eventConfig, refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active module from prop or path
  const getActiveModule = () => {
    if (propModule) return propModule;
    const path = location.pathname;
    if (path.includes('/round1')) return 'round1';
    if (path.includes('/round2')) return 'round2';
    if (path.includes('/twists')) return 'twists';
    if (path.includes('/system')) return 'system';
    return 'overview';
  };

  const activeModule = getActiveModule();

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

  const handleSetStage = async (targetStage) => {
    setActionLoading(`stage_${targetStage}`);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/event-stage', { stage: targetStage });
      setActionMessage({ type: 'success', text: `Tournament stage switched to ${formatStageLabel(targetStage)}` });
      await refreshSession();
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update stage.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleExtendTimer = async (minutes, roundNumber = 1) => {
    setActionLoading(`extend_${minutes}`);
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

  const handlePublishR1Leaderboard = async (publish = true) => {
    setActionLoading('publish_r1_leaderboard');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/leaderboard/publish-r1', { publish });
      setActionMessage({
        type: 'success',
        text: publish ? 'Round 1 Leaderboard is now PUBLISHED!' : 'Round 1 Leaderboard is now hidden.',
      });
      await refreshSession();
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update Round 1 leaderboard status.' });
    } finally {
      setActionLoading('');
    }
  };

  const handlePublishLeaderboard = async (publish = true) => {
    setActionLoading('publish_leaderboard');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/leaderboard/publish', { publish });
      setActionMessage({
        type: 'success',
        text: publish ? 'Final Grand Champions Leaderboard is now PUBLISHED!' : 'Final Leaderboard is now hidden.',
      });
      await refreshSession();
      await fetchOverview();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update leaderboard status.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleResetTimers = async () => {
    if (!window.confirm('Reset all sprint timers and return event to standby? Active deadlines will be cleared.')) {
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
    if (!window.confirm('⚠️ FACTORY RESET TEST DATA?\n\nThis will unassign all challenges, delete student submissions, and clear judge evaluations for testing.\n\nProceed?')) {
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
      
      {/* Toast Notification */}
      {actionMessage.text && (
        <div
          className={`p-4 rounded-2xl text-xs font-pixel flex items-center justify-between gap-3 border-3 shadow-lg animate-fadeIn ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
              : 'bg-rose-500 text-white border-rose-400 shadow-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-white shrink-0" />
            )}
            <span className="font-bold text-sm">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage({ type: '', text: '' })}
            className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: ADMIN OVERVIEW (HOME DASHBOARD)                                  */}
      {/* ========================================================================= */}
      {activeModule === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Top Hero Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f6ab3c] to-[#e69828] text-white flex items-center justify-center font-bold shadow-[3px_3px_0px_#a4640c] border-2 border-white shrink-0">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold font-pixel text-[#1e293b] tracking-tight">
                    MISSION CONTROL CENTER
                  </h1>
                  <span className="text-[10px] font-pixel px-2 py-0.5 rounded-md bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] font-bold">
                    LIVE
                  </span>
                </div>
                <p className="text-xs font-retro text-[#64748b] mt-1">
                  Master event telemetry, tournament lifecycle scheduling, real-time modifiers, and live standings.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchOverview();
                  fetchTwists();
                }}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-pixel transition-all flex items-center gap-2 cursor-pointer border border-slate-300 font-bold disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>REFRESH TELEMETRY</span>
              </button>
            </div>
          </div>

          {/* Quick Telemetry KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <Link
              to="/admin/teams"
              className="p-4 rounded-2xl bg-white border-3 border-[#bad6fc] shadow-[3px_3px_0px_#bad6fc] hover:shadow-[5px_5px_0px_#bad6fc] transition-all text-center group cursor-pointer block"
            >
              <span className="text-[10px] font-pixel text-[#64748b] block uppercase font-bold">TOTAL SQUADS</span>
              <span className="text-xl sm:text-2xl font-bold font-pixel text-[#1e293b] group-hover:text-[#4e97fe] transition-colors">
                {overview?.telemetry?.totalTeams || 0}
              </span>
            </Link>

            <Link
              to="/admin/teams"
              className="p-4 rounded-2xl bg-white border-3 border-emerald-300 shadow-[3px_3px_0px_#a7f3d0] hover:shadow-[5px_5px_0px_#a7f3d0] transition-all text-center group cursor-pointer block"
            >
              <span className="text-[10px] font-pixel text-emerald-700 block uppercase font-bold">FINAL SUBMITTED</span>
              <span className="text-xl sm:text-2xl font-bold font-pixel text-emerald-800">
                {overview?.telemetry?.r1Submissions?.submitted || 0}
              </span>
            </Link>

            <Link
              to="/admin/teams"
              className="p-4 rounded-2xl bg-white border-3 border-amber-300 shadow-[3px_3px_0px_#fde68a] hover:shadow-[5px_5px_0px_#fde68a] transition-all text-center group cursor-pointer block"
            >
              <span className="text-[10px] font-pixel text-amber-700 block uppercase font-bold">ACTIVE DRAFTS</span>
              <span className="text-xl sm:text-2xl font-bold font-pixel text-amber-800">
                {overview?.telemetry?.r1Submissions?.draft || 0}
              </span>
            </Link>

            <Link
              to="/admin/twists"
              className="p-4 rounded-2xl bg-white border-3 border-purple-300 shadow-[3px_3px_0px_#e9d5ff] hover:shadow-[5px_5px_0px_#e9d5ff] transition-all text-center group cursor-pointer block"
            >
              <span className="text-[10px] font-pixel text-purple-700 block uppercase font-bold">LIVE TWISTS</span>
              <span className="text-xl sm:text-2xl font-bold font-pixel text-purple-800">
                {twists.filter((t) => t.isReleased).length} / {twists.length}
              </span>
            </Link>

            <Link
              to="/admin/themes"
              className="p-4 rounded-2xl bg-white border-3 border-sky-300 shadow-[3px_3px_0px_#bae6fd] hover:shadow-[5px_5px_0px_#bae6fd] transition-all text-center group cursor-pointer block"
            >
              <span className="text-[10px] font-pixel text-sky-700 block uppercase font-bold">QUEST THEMES</span>
              <span className="text-xl sm:text-2xl font-bold font-pixel text-sky-800">
                {overview?.challenges?.length || 0}
              </span>
            </Link>

            <Link
              to="/admin/system"
              className="p-4 rounded-2xl bg-white border-3 border-rose-300 shadow-[3px_3px_0px_#fecdd3] hover:shadow-[5px_5px_0px_#fecdd3] transition-all text-center group cursor-pointer block"
            >
              <span className="text-[10px] font-pixel text-rose-700 block uppercase font-bold">SYSTEM TOOLS</span>
              <span className="text-xl sm:text-2xl font-bold font-pixel text-rose-800 flex items-center justify-center">
                <Wrench className="w-5 h-5 mx-auto" />
              </span>
            </Link>
          </div>

          {/* Quick Leaderboards Live Publishing Deck */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#ffbe00] shadow-[6px_6px_0px_#fde68a] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#ffbe00] text-[#141720] flex items-center justify-center font-black shadow-xs">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-pixel text-[#1e293b]">
                    LEADERBOARDS & STANDINGS PUBLISHING CENTER
                  </h3>
                  <p className="text-xs font-retro text-[#64748b]">
                    Toggle live visibility of scores, rankings, and award positions on the public leaderboard.
                  </p>
                </div>
              </div>

              <a
                href="/leaderboard"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-pixel font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto border border-slate-300 shadow-2xs"
              >
                <span>OPEN PUBLIC VIEW ↗</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Box 1: Round 1 Sprint Standings */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border-2 border-[#bad6fc] flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-xs text-[#1e293b] font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#4e97fe]" />
                      Round 1 Sprint Standings
                    </span>
                    <span className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                      eventConfig?.isR1LeaderboardPublished
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {eventConfig?.isR1LeaderboardPublished ? 'LIVE ON LEADERBOARD' : 'HIDDEN'}
                    </span>
                  </div>
                  <p className="text-xs font-retro text-[#64748b]">
                    Displays R1 judge evaluation grades, story pitch, and rankings for all squads.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#bad6fc]/60">
                  {eventConfig?.isR1LeaderboardPublished ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePublishR1Leaderboard(true)}
                        disabled={actionLoading !== ''}
                        className="flex-1 py-2 px-3 rounded-xl text-[10px] font-pixel font-bold bg-[#4e97fe] hover:bg-[#3c86ee] text-white shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trophy className="w-3 h-3" />
                        <span>SYNC SCORES</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublishR1Leaderboard(false)}
                        disabled={actionLoading !== ''}
                        className="py-2 px-3 rounded-xl text-[10px] font-pixel text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer font-bold"
                      >
                        UNPUBLISH
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePublishR1Leaderboard(true)}
                      disabled={actionLoading !== ''}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-pixel font-bold bg-[#4e97fe] hover:bg-[#3c86ee] text-white shadow-xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>PUBLISH ROUND 1 LEADERBOARD</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Box 2: Grand Finale Final Standings */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-300 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-xs text-[#1e293b] font-bold flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-[#f6ab3c]" />
                      Grand Finale Final Standings
                    </span>
                    <span className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                      eventConfig?.isLeaderboardPublished
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {eventConfig?.isLeaderboardPublished ? 'LIVE ON LEADERBOARD' : 'HIDDEN'}
                    </span>
                  </div>
                  <p className="text-xs font-retro text-[#64748b]">
                    Displays Round 2 finalist presentation scores and crowns tournament champions.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-amber-300/60">
                  {eventConfig?.isLeaderboardPublished ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePublishLeaderboard(true)}
                        disabled={actionLoading !== ''}
                        className="flex-1 py-2 px-3 rounded-xl text-[10px] font-pixel font-black bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] shadow-xs cursor-pointer flex items-center justify-center gap-1.5 border border-amber-500"
                      >
                        <Crown className="w-3 h-3" />
                        <span>SYNC FINAL SCORES</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublishLeaderboard(false)}
                        disabled={actionLoading !== ''}
                        className="py-2 px-3 rounded-xl text-[10px] font-pixel text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer font-bold"
                      >
                        UNPUBLISH
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePublishLeaderboard(true)}
                      disabled={actionLoading !== ''}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-pixel font-black bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] shadow-xs cursor-pointer flex items-center justify-center gap-2 border border-amber-500"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>PUBLISH GRAND FINALE LEADERBOARD</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Quick Command Modules Deck */}
          <div className="space-y-3">
            <h3 className="text-xs font-pixel font-bold text-slate-500 uppercase tracking-wider">
              COMMAND DECKS & WORKSPACES
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Card 1: Round 1 Sprint */}
              <div className="bg-white rounded-3xl p-6 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] hover:shadow-[6px_6px_0px_#bad6fc] transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border-2 border-blue-200 text-[#4e97fe] flex items-center justify-center font-bold">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                      stage === 'ROUND1_BUILDING' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {stage === 'ROUND1_BUILDING' ? 'SPRINT LIVE' : 'STANDBY'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold font-pixel text-[#1e293b]">
                    Round 1 Sprint & Timer
                  </h4>
                  <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                    Set duration, schedule automatic countdowns, extend live sprint minutes, and publish Round 1 standings.
                  </p>
                </div>
                <Link
                  to="/admin/round1"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel font-bold flex items-center justify-between shadow-[2px_2px_0px_#2463bf] transition-all"
                >
                  <span>MANAGE ROUND 1</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Card 2: Round 2 Finale */}
              <div className="bg-white rounded-3xl p-6 border-4 border-[#ffbe00] shadow-[4px_4px_0px_#fde68a] hover:shadow-[6px_6px_0px_#fde68a] transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border-2 border-amber-200 text-[#f6ab3c] flex items-center justify-center font-bold">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <span className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                      stage === 'ROUND2_LIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {stage === 'ROUND2_LIVE' ? 'STAGE LIVE' : 'STANDBY'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold font-pixel text-[#1e293b]">
                    Round 2 Live Presentations
                  </h4>
                  <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                    Finalist pitch timing, live presentation timers, and Grand Finale championship leaderboard publishing.
                  </p>
                </div>
                <Link
                  to="/admin/round2"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] text-xs font-pixel font-black flex items-center justify-between shadow-[2px_2px_0px_#a4640c] transition-all"
                >
                  <span>MANAGE ROUND 2</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Card 3: Surprise Twists */}
              <div className="bg-white rounded-3xl p-6 border-4 border-amber-300 shadow-[4px_4px_0px_#fde68a] hover:shadow-[6px_6px_0px_#fde68a] transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center font-bold">
                      <Zap className="w-5 h-5 fill-amber-500" />
                    </div>
                    <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                      {twists.filter((t) => t.isReleased).length} Live Broadcasts
                    </span>
                  </div>
                  <h4 className="text-base font-bold font-pixel text-[#1e293b]">
                    Surprise Twists Vault
                  </h4>
                  <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                    Mid-sprint modifiers, 1-click preset templates, custom bonus criteria, and instant broadcasts.
                  </p>
                </div>
                <Link
                  to="/admin/twists"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#141720] hover:bg-[#1e293b] text-[#ffbe00] text-xs font-pixel font-bold flex items-center justify-between shadow-[2px_2px_0px_#000] transition-all"
                >
                  <span>OPEN TWISTS VAULT</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Card 4: Squads & Submissions */}
              <div className="bg-white rounded-3xl p-6 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] hover:shadow-[6px_6px_0px_#bad6fc] transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border-2 border-blue-200 text-[#4e97fe] flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] font-bold border border-[#bad6fc]">
                      {overview?.telemetry?.totalTeams || 0} Registered
                    </span>
                  </div>
                  <h4 className="text-base font-bold font-pixel text-[#1e293b]">
                    Squads & Submissions
                  </h4>
                  <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                    Filter and sort squads by grades, review Scratch project demos, inspect judge evaluations, and nominate finalists.
                  </p>
                </div>
                <Link
                  to="/admin/teams"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel font-bold flex items-center justify-between shadow-[2px_2px_0px_#2463bf] transition-all"
                >
                  <span>VIEW SQUADS ROSTER</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Card 5: Themes Matrix */}
              <div className="bg-white rounded-3xl p-6 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] hover:shadow-[6px_6px_0px_#bad6fc] transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border-2 border-blue-200 text-[#4e97fe] flex items-center justify-center font-bold">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] font-bold border border-[#bad6fc]">
                      {overview?.challenges?.length || 0} Quests
                    </span>
                  </div>
                  <h4 className="text-base font-bold font-pixel text-[#1e293b]">
                    Creative Themes Matrix
                  </h4>
                  <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                    View 4-seat capacity quotas per theme, create or edit problem statements, and manage squad allocations.
                  </p>
                </div>
                <Link
                  to="/admin/themes"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel font-bold flex items-center justify-between shadow-[2px_2px_0px_#2463bf] transition-all"
                >
                  <span>MANAGE THEMES</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Card 6: System Controls */}
              <div className="bg-white rounded-3xl p-6 border-4 border-rose-300 shadow-[4px_4px_0px_#fecdd3] hover:shadow-[6px_6px_0px_#fecdd3] transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center font-bold">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-bold border border-rose-300">
                      EMERGENCY
                    </span>
                  </div>
                  <h4 className="text-base font-bold font-pixel text-[#1e293b]">
                    System & Emergency Tools
                  </h4>
                  <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                    Instant +5m/+10m timer extensions, schedule resets back to standby, and test data reset tools.
                  </p>
                </div>
                <Link
                  to="/admin/system"
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-pixel font-bold flex items-center justify-between shadow-[2px_2px_0px_#9f1239] transition-all"
                >
                  <span>OPEN SYSTEM TOOLS</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: ROUND 1 SPRINT CONTROLS                                          */}
      {/* ========================================================================= */}
      {activeModule === 'round1' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4e97fe] to-[#307fef] text-white flex items-center justify-center font-bold shadow-[3px_3px_0px_#2463bf] border-2 border-white shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                    ROUND 1 SPRINT COMMAND & TIMER
                  </h1>
                  <span className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                    stage === 'ROUND1_BUILDING'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}>
                    {stage === 'ROUND1_BUILDING' ? 'SPRINT LIVE' : 'CONFIGURATION'}
                  </span>
                </div>
                <p className="text-xs font-retro text-[#64748b] mt-0.5">
                  Configure sprint duration, schedule automated start times, extend active sprint, and publish standings.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/admin/teams"
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-pixel transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300 font-bold"
              >
                <Users className="w-3.5 h-3.5" />
                <span>VIEW SUBMISSIONS ({overview?.telemetry?.r1Submissions?.submitted || 0}) ↗</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Scheduler & Duration (8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] space-y-5">
              
              {/* Duration Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-xs text-[#1e293b] flex items-center gap-2 uppercase font-bold">
                    <Clock className="w-4 h-4 text-[#4e97fe]" />
                    Round 1 Sprint Duration:
                  </span>
                  <span className="font-pixel text-sm text-[#4e97fe] font-black">
                    {r1DurationMinutes} Mins ({r1DurationMinutes >= 60 ? `${(r1DurationMinutes / 60).toFixed(1)} hrs` : `${r1DurationMinutes}m`})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                      className={`px-4 py-2 rounded-xl text-xs font-pixel transition-all cursor-pointer border-2 ${
                        Number(r1DurationMinutes) === preset.mins
                          ? 'bg-[#4e97fe] text-white border-[#307fef] shadow-[2px_2px_0px_#2463bf] font-bold'
                          : 'bg-white text-[#475569] border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}

                  <div className="flex items-center gap-1.5 ml-auto bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={r1DurationMinutes}
                      onChange={(e) => setR1DurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center text-[#1e293b] font-bold outline-none"
                    />
                    <span className="text-xs text-[#64748b] font-retro font-bold">minutes</span>
                  </div>
                </div>
              </div>

              {/* Start Time Scheduler */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="font-pixel text-xs text-[#1e293b] uppercase font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#4e97fe]" />
                  Schedule Start Time (Optional Countdown):
                </span>

                <div className="flex flex-wrap items-center gap-2">
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
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] border border-slate-300 text-xs font-pixel transition-all cursor-pointer font-bold"
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
                    className="flex-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-mono text-[#1e293b] font-bold focus:border-[#4e97fe] outline-none"
                  />
                  {r1ScheduledTime && (
                    <button
                      type="button"
                      onClick={() => setR1ScheduledTime('')}
                      className="px-3 py-2 text-xs font-pixel text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 cursor-pointer font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleConfigureSchedule(true)}
                  disabled={actionLoading !== ''}
                  className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs font-pixel bg-[#10b981] hover:bg-[#059669] text-white shadow-[2px_2px_0px_#065f46] flex items-center justify-center gap-2 cursor-pointer font-bold disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>START SPRINT NOW</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfigureSchedule(false)}
                  disabled={actionLoading !== ''}
                  className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs font-pixel bg-[#4e97fe] hover:bg-[#3c86ee] text-white shadow-[2px_2px_0px_#2463bf] flex items-center justify-center gap-2 cursor-pointer font-bold disabled:opacity-50"
                >
                  <Clock className="w-4 h-4" />
                  <span>SAVE SCHEDULE</span>
                </button>
              </div>

              {/* Reset Schedule back to standby */}
              {(eventConfig?.r1StartTime || eventConfig?.r1EndTime || stage === 'ROUND1_BUILDING') && (
                <div className="pt-2 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleResetTimers}
                    disabled={actionLoading !== ''}
                    className="text-xs font-pixel text-rose-600 hover:text-rose-800 underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Schedule & Timers (Back to Standby)
                  </button>
                </div>
              )}

            </div>

            {/* Right: Live Extension & Leaderboard Standings (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              
              {/* Active Sprint Live Controls */}
              {stage === 'ROUND1_BUILDING' && (
                <div className="bg-white rounded-3xl p-6 border-4 border-emerald-300 shadow-[4px_4px_0px_#a7f3d0] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1e293b] font-pixel text-xs flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-emerald-600 animate-bounce" /> EXTEND ACTIVE SPRINT:
                    </span>
                    <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs font-retro text-[#64748b]">
                    Instantly add extra sprint time for all ~60 squads in real time.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 15, 30].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => handleExtendTimer(mins, 1)}
                        disabled={actionLoading !== ''}
                        className="py-2 rounded-xl bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] text-xs font-pixel transition-all cursor-pointer font-black shadow-xs"
                      >
                        +{mins}m
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Round 1 Standings Publishing Box */}
              <div className="bg-white rounded-3xl p-6 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-xs text-[#1e293b] uppercase font-bold flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#4e97fe]" />
                    Round 1 Standings:
                  </span>
                  <span className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                    eventConfig?.isR1LeaderboardPublished
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {eventConfig?.isR1LeaderboardPublished ? 'PUBLISHED' : 'UNPUBLISHED'}
                  </span>
                </div>

                <p className="text-xs font-retro text-[#64748b]">
                  When published, participants and public viewers can inspect live Round 1 scores and rankings.
                </p>

                {eventConfig?.isR1LeaderboardPublished ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handlePublishR1Leaderboard(true)}
                      disabled={actionLoading !== ''}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-pixel font-bold bg-[#4e97fe] hover:bg-[#3c86ee] text-white transition-all shadow-[2px_2px_0px_#2463bf] cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>SYNC & RE-PUBLISH R1 LEADERBOARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePublishR1Leaderboard(false)}
                      disabled={actionLoading !== ''}
                      className="w-full py-2 px-3 rounded-xl text-xs font-pixel text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer font-bold"
                    >
                      UNPUBLISH
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePublishR1Leaderboard(true)}
                    disabled={actionLoading !== ''}
                    className="w-full py-3 px-4 rounded-xl text-xs font-pixel font-bold bg-[#4e97fe] hover:bg-[#3c86ee] text-white transition-all flex items-center justify-between shadow-[2px_2px_0px_#2463bf] cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-white" /> Publish Round 1 Standings
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: ROUND 2 FINALE CONTROLS                                          */}
      {/* ========================================================================= */}
      {activeModule === 'round2' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#ffbe00] shadow-[6px_6px_0px_#fde68a] flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ffbe00] to-[#f59e0b] text-[#141720] flex items-center justify-center font-bold shadow-[3px_3px_0px_#a4640c] border-2 border-white shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                    ROUND 2 FINALISTS & LIVE PRESENTATIONS
                  </h1>
                  <span className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                    stage === 'ROUND2_LIVE'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                      : stage === 'ROUND2_PREP'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}>
                    {stage === 'ROUND2_LIVE' ? 'STAGE LIVE' : stage === 'ROUND2_PREP' ? 'SCHEDULED' : 'STANDBY'}
                  </span>
                </div>
                <p className="text-xs font-retro text-[#64748b] mt-0.5">
                  Schedule live finalist presentations, manage presentation timers, and publish the Grand Finale leaderboard.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/admin/teams"
                className="px-3.5 py-2 rounded-xl bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] text-xs font-pixel transition-all flex items-center gap-1.5 cursor-pointer font-black shadow-xs"
              >
                <Award className="w-3.5 h-3.5" />
                <span>NOMINATE FINALISTS IN SQUADS ↗</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Scheduler & Duration (8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border-4 border-amber-300 shadow-[4px_4px_0px_#fde68a] space-y-5">
              
              {/* Duration Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-xs text-[#1e293b] flex items-center gap-2 uppercase font-bold">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Round 2 Presentation Duration:
                  </span>
                  <span className="font-pixel text-sm text-amber-800 font-black">
                    {r2DurationMinutes} Mins ({r2DurationMinutes >= 60 ? `${(r2DurationMinutes / 60).toFixed(1)} hrs` : `${r2DurationMinutes}m`})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                      className={`px-4 py-2 rounded-xl text-xs font-pixel transition-all cursor-pointer border-2 ${
                        Number(r2DurationMinutes) === preset.mins
                          ? 'bg-[#f6ab3c] text-white border-[#d98516] shadow-[2px_2px_0px_#a4640c] font-bold'
                          : 'bg-white text-[#475569] border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}

                  <div className="flex items-center gap-1.5 ml-auto bg-amber-50/70 px-3 py-1.5 rounded-xl border border-amber-200">
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={r2DurationMinutes}
                      onChange={(e) => setR2DurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center text-[#1e293b] font-bold outline-none"
                    />
                    <span className="text-xs text-[#64748b] font-retro font-bold">minutes</span>
                  </div>
                </div>
              </div>

              {/* Start Time Scheduler */}
              <div className="pt-4 border-t border-amber-200/80 space-y-3">
                <span className="font-pixel text-xs text-[#1e293b] uppercase font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Schedule Round 2 Start Time (Countdown Timer):
                </span>

                <div className="flex flex-wrap items-center gap-2">
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
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] border border-slate-300 text-xs font-pixel transition-all cursor-pointer font-bold"
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
                    className="flex-1 px-4 py-2.5 bg-white border-2 border-amber-200 rounded-xl text-xs font-mono text-[#1e293b] font-bold focus:border-[#f6ab3c] outline-none"
                  />
                  {r2ScheduledTime && (
                    <button
                      type="button"
                      onClick={() => setR2ScheduledTime('')}
                      className="px-3 py-2 text-xs font-pixel text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 cursor-pointer font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-amber-200/80 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleConfigureR2Schedule(true)}
                  disabled={actionLoading !== ''}
                  className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs font-pixel bg-[#10b981] hover:bg-[#059669] text-white shadow-[2px_2px_0px_#065f46] flex items-center justify-center gap-2 cursor-pointer font-bold disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>START ROUND 2 NOW</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfigureR2Schedule(false)}
                  disabled={actionLoading !== ''}
                  className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs font-pixel bg-[#f6ab3c] hover:bg-[#e69828] text-white shadow-[2px_2px_0px_#a4640c] flex items-center justify-center gap-2 cursor-pointer font-bold disabled:opacity-50"
                >
                  <Clock className="w-4 h-4" />
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
                    className="text-xs font-pixel text-rose-600 hover:text-rose-800 underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Schedule & Timers (Back to Standby)
                  </button>
                </div>
              )}

            </div>

            {/* Right: Live Extension & Grand Finale Leaderboard (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              
              {/* Active Round 2 Live Controls */}
              {stage === 'ROUND2_LIVE' && (
                <div className="bg-white rounded-3xl p-6 border-4 border-amber-300 shadow-[4px_4px_0px_#fde68a] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1e293b] font-pixel text-xs flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-600 animate-bounce" /> EXTEND LIVE ROUND 2:
                    </span>
                    <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                      STAGE LIVE
                    </span>
                  </div>
                  <p className="text-xs font-retro text-[#64748b]">
                    Add presentation time in real time for judging.
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 10, 15, 30].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => handleExtendTimer(mins, 2)}
                        disabled={actionLoading !== ''}
                        className="py-2 rounded-xl bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] text-xs font-pixel transition-all cursor-pointer font-black shadow-xs"
                      >
                        +{mins}m
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grand Finale Final Standings Leaderboard Box */}
              <div className="bg-white rounded-3xl p-6 border-4 border-[#ffbe00] shadow-[4px_4px_0px_#fde68a] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-xs text-[#1e293b] uppercase font-bold flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#f6ab3c]" />
                    Grand Finale Standings:
                  </span>
                  <span className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                    eventConfig?.isLeaderboardPublished
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {eventConfig?.isLeaderboardPublished ? 'PUBLISHED' : 'UNPUBLISHED'}
                  </span>
                </div>

                <p className="text-xs font-retro text-[#64748b]">
                  Publish the final scores, rankings, and award winners to the public tournament leaderboard.
                </p>

                {eventConfig?.isLeaderboardPublished ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handlePublishLeaderboard(true)}
                      disabled={actionLoading !== ''}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-pixel font-black bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] transition-all shadow-[2px_2px_0px_#a4640c] cursor-pointer flex items-center justify-center gap-2 border border-amber-500"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>SYNC & RE-PUBLISH FINAL STANDINGS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePublishLeaderboard(false)}
                      disabled={actionLoading !== ''}
                      className="w-full py-2 px-3 rounded-xl text-xs font-pixel text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer font-bold"
                    >
                      UNPUBLISH
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePublishLeaderboard(true)}
                    disabled={actionLoading !== ''}
                    className="w-full py-3 px-4 rounded-xl text-xs font-pixel font-black bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] transition-all flex items-center justify-between shadow-[2px_2px_0px_#a4640c] cursor-pointer border border-amber-500"
                  >
                    <span className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-[#141720]" /> Publish Grand Finale Standings
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: SURPRISE TWISTS VAULT                                             */}
      {/* ========================================================================= */}
      {activeModule === 'twists' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#ffbe00] shadow-[6px_6px_0px_#fde68a] flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ffbe00] via-[#f59e0b] to-[#d97706] text-[#141720] flex items-center justify-center font-black shadow-[3px_3px_0px_#b45309] border-2 border-white shrink-0">
                <Zap className="w-6 h-6 fill-[#141720]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                    MID-SPRINT SURPRISE TWISTS & MODIFIERS
                  </h1>
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
                className="px-4 py-2.5 rounded-xl bg-[#141720] hover:bg-[#1e293b] text-[#ffbe00] text-xs font-pixel font-bold flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#000] cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>NEW CUSTOM TWIST</span>
              </button>
            </div>
          </div>

          {/* Quick 1-Click Preset Vault */}
          <div className="bg-white rounded-3xl p-6 border-4 border-amber-200 shadow-[4px_4px_0px_#fef3c7] space-y-3">
            <span className="text-xs font-pixel text-[#1e293b] uppercase tracking-wider font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              1-Click Preset Quick Templates (Adds to Draft Vault):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PRESET_TWISTS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickAddPreset(preset)}
                  disabled={actionLoading !== ''}
                  className="p-4 rounded-2xl bg-gradient-to-b from-[#fffdf5] to-[#fef8e7] border-2 border-amber-200 hover:border-amber-400 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group disabled:opacity-50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[9px] font-pixel font-black px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                        +{preset.bonusPoints} PTS
                      </span>
                      <Plus className="w-4 h-4 text-amber-700 group-hover:scale-125 transition-transform" />
                    </div>
                    <h5 className="text-xs font-bold text-[#1e293b] font-pixel line-clamp-1 group-hover:text-amber-800">
                      {preset.title}
                    </h5>
                    <p className="text-[11px] font-retro text-[#64748b] line-clamp-2 mt-1.5 leading-snug">
                      {preset.description}
                    </p>
                  </div>
                  <span className="text-[10px] font-pixel text-amber-800 font-bold mt-2 group-hover:underline">
                    + Add Preset
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Twists List (Drafts & Live Released) */}
          <div className="bg-white rounded-3xl p-6 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-pixel text-[#1e293b] uppercase tracking-wider font-bold flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#4e97fe]" />
                Configured Tournament Twists ({twists.length}):
              </span>
              <span className="text-xs font-pixel text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold">
                {twists.filter((t) => t.isReleased).length} Live / {twists.filter((t) => !t.isReleased).length} Drafts
              </span>
            </div>

            {twists.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-pixel text-slate-600">NO TWISTS IN VAULT YET</p>
                <p className="text-xs font-retro text-slate-500 max-w-md mx-auto">
                  Click any preset template above or "New Custom Twist" to prepare surprise modifiers for your tournament sprint.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {twists.map((twist) => (
                  <div
                    key={twist.id}
                    className={`p-5 rounded-2xl border-3 transition-all flex flex-col justify-between gap-4 shadow-xs ${
                      twist.isReleased
                        ? 'bg-gradient-to-br from-emerald-50/70 to-emerald-100/40 border-emerald-400 shadow-[4px_4px_0px_#a7f3d0]'
                        : 'bg-gradient-to-br from-slate-50 to-white border-slate-300 shadow-[3px_3px_0px_#cbd5e1]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <span
                          className={`text-[9px] font-pixel px-2.5 py-0.5 rounded-full font-black uppercase flex items-center gap-1.5 ${
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

                      <h4 className="text-sm font-bold font-pixel text-[#1e293b] pt-0.5">
                        {twist.title}
                      </h4>
                      <p className="text-xs font-retro text-[#475569] mt-1.5 leading-relaxed">
                        {twist.description}
                      </p>

                      {twist.isReleased && twist.releasedAt && (
                        <p className="text-[10px] font-retro text-emerald-700 mt-2.5 font-bold">
                          Broadcasted at {new Date(twist.releasedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(twist)}
                          disabled={actionLoading !== ''}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-pixel transition-all cursor-pointer flex items-center gap-1 font-bold"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTwist(twist)}
                          disabled={actionLoading !== ''}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-pixel transition-all cursor-pointer flex items-center gap-1 font-bold"
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
                          className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-pixel font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <EyeOff className="w-3 h-3" />
                          <span>Recall Draft</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReleaseTwist(twist)}
                          disabled={actionLoading !== ''}
                          className="px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-[10px] font-pixel font-black shadow-[2px_2px_0px_#065f46] transition-all cursor-pointer flex items-center gap-1.5"
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
      )}

      {/* ========================================================================= */}
      {/* VIEW 5: SYSTEM & EMERGENCY TOOLS                                          */}
      {/* ========================================================================= */}
      {activeModule === 'system' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-rose-300 shadow-[6px_6px_0px_#fecdd3] flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-[3px_3px_0px_#9f1239] border-2 border-white shrink-0">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                    SYSTEM & EMERGENCY TOOLS
                  </h1>
                  <span className="text-[9px] font-pixel px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 font-bold">
                    DANGER ZONE
                  </span>
                </div>
                <p className="text-xs font-retro text-[#64748b] mt-0.5">
                  Real-time timer extensions, emergency deadline resets, and testing data wipe commands.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Real-time Timer Extender */}
            <div className="bg-white rounded-3xl p-6 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border-2 border-blue-200 text-[#4e97fe] flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-pixel text-[#1e293b]">Sprint Timer Extender</h3>
                  <p className="text-xs font-retro text-[#64748b]">Adds extra sprint minutes in real time</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <button
                  onClick={() => handleExtendTimer(5, stage === 'ROUND2_LIVE' ? 2 : 1)}
                  disabled={actionLoading !== ''}
                  className="py-2.5 rounded-xl bg-[#f0f7ff] hover:bg-[#e0efff] text-[#4e97fe] border-2 border-[#bad6fc] text-xs font-pixel font-bold transition-all cursor-pointer text-center"
                >
                  +5 MINS
                </button>
                <button
                  onClick={() => handleExtendTimer(10, stage === 'ROUND2_LIVE' ? 2 : 1)}
                  disabled={actionLoading !== ''}
                  className="py-2.5 rounded-xl bg-[#f0f7ff] hover:bg-[#e0efff] text-[#4e97fe] border-2 border-[#bad6fc] text-xs font-pixel font-bold transition-all cursor-pointer text-center"
                >
                  +10 MINS
                </button>
                <button
                  onClick={() => handleExtendTimer(15, stage === 'ROUND2_LIVE' ? 2 : 1)}
                  disabled={actionLoading !== ''}
                  className="py-2.5 rounded-xl bg-[#f0f7ff] hover:bg-[#e0efff] text-[#4e97fe] border-2 border-[#bad6fc] text-xs font-pixel font-bold transition-all cursor-pointer text-center"
                >
                  +15 MINS
                </button>
              </div>
            </div>

            {/* Card 2: Standby Timer Reset */}
            <div className="bg-white rounded-3xl p-6 border-4 border-amber-300 shadow-[4px_4px_0px_#fde68a] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border-2 border-amber-200 text-[#f6ab3c] flex items-center justify-center font-bold">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-pixel text-[#1e293b]">Reset Schedule to Standby</h3>
                  <p className="text-xs font-retro text-[#64748b]">Clears active sprint timers and returns to standby</p>
                </div>
              </div>

              <button
                onClick={handleResetTimers}
                disabled={actionLoading !== ''}
                className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border-2 border-amber-300 text-xs font-pixel font-bold transition-all cursor-pointer"
              >
                RESET TIMERS BACK TO STANDBY
              </button>
            </div>

            {/* Card 3: Dev Test Data Reset (Full Width) */}
            <div className="md:col-span-2 bg-white rounded-3xl p-6 border-4 border-rose-300 shadow-[4px_4px_0px_#fecdd3] space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center font-bold">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-pixel text-[#1e293b]">Factory Reset Test Data</h3>
                    <p className="text-xs font-retro text-[#64748b]">
                      Wipes problem statement claims, student submissions, and judge scores for fresh tournament dry-runs.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDevResetAll}
                  disabled={actionLoading !== ''}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-pixel font-bold transition-all cursor-pointer shadow-[2px_2px_0px_#9f1239] flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>RESET TEST DATA</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

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
                  className="px-4 py-2 rounded-xl text-xs font-pixel text-slate-600 hover:bg-slate-100 cursor-pointer font-bold"
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

    </div>
  );
}
