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

  const handleDevResetAll = async () => {
    if (!window.confirm('Reset all team claims, submissions, and scores back to clean state?')) {
      return;
    }

    setActionLoading('dev_reset');
    setActionMessage({ type: '', text: '' });

    try {
      const res = await api.post('/admin/dev-reset-all', {});
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
        
        {/* Step 1: Release & Round 1 */}
        <div className="bg-white rounded-xl p-5 border-2 border-[#bad6fc] shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#4e97fe] text-white text-[11px] font-bold flex items-center justify-center">1</span>
            Problem Statements & Round 1 Build
          </h3>

          <div className="space-y-2 pt-1">
            <button
              onClick={() => handleStageChange('CHALLENGE_SELECTION')}
              disabled={actionLoading !== ''}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                stage === 'CHALLENGE_SELECTION'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#4e97fe] hover:bg-[#3c86ee] text-white shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5" /> Release Problem Statements (Start FCFS)
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleStageChange('ROUND1_BUILDING')}
              disabled={actionLoading !== ''}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                stage === 'ROUND1_BUILDING'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#4e97fe] hover:bg-[#3c86ee] text-white shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5" /> Start Round 1 (4-Hour Sprint)
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleStageChange('ROUND1_JUDGING')}
              disabled={actionLoading !== ''}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                stage === 'ROUND1_JUDGING'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-[#334155]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5" /> Lock Submissions & Open R1 Judging
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
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

    </div>
  );
}
