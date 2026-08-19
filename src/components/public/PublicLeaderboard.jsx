import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { socketClient } from '../../lib/socket.js';
import { fireConfetti } from '../../lib/utils.js';
import {
  Trophy,
  Award,
  Crown,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Users,
  ShieldCheck,
} from 'lucide-react';

export default function PublicLeaderboard() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuditoriumMode, setIsAuditoriumMode] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const data = await api.get('/public/leaderboard');
      setLeaderboard(data);
      if (data.isPublished && data.rankings?.length > 0) {
        fireConfetti();
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    const handlePublish = () => {
      fetchLeaderboard();
    };

    socketClient.on('leaderboard:published', handlePublish);
    return () => {
      socketClient.off('leaderboard:published', handlePublish);
    };
  }, []);

  const rankings = leaderboard?.rankings || [];
  const top1 = rankings[0];
  const top2 = rankings[1];
  const top3 = rankings[2];

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-12 border border-slate-800 text-center animate-pulse">
        <Trophy className="w-12 h-12 text-amber-500/40 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-300">Loading Leaderboard...</h3>
      </div>
    );
  }

  if (!leaderboard?.isPublished && rankings.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-10 sm:p-16 border border-slate-800 text-center max-w-2xl mx-auto my-8 relative overflow-hidden bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 text-amber-400">
          <Trophy className="w-10 h-10" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mb-3">
          Leaderboard Standing By
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Final scores and rankings will be officially published by the organizers once Round 2 evaluations conclude.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${isAuditoriumMode ? 'p-6 bg-slate-950 min-h-screen' : ''}`}>
      
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Official Tournament Standings
                </span>
                <span className="text-xs font-mono text-slate-400">Formula: R1 × 40% + R2 × 60%</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 mt-1">
                Scratch Hackathon Leaderboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAuditoriumMode(!isAuditoriumMode)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              {isAuditoriumMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {isAuditoriumMode ? 'Exit Fullscreen' : 'Auditorium Mode'}
            </button>
            <button
              onClick={fetchLeaderboard}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Champions Podium */}
      {top1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4 pb-2">
          
          {/* 2nd Place (Silver) */}
          {top2 && (
            <div className="order-2 md:order-1 glass-panel rounded-2xl p-6 border border-slate-700/80 bg-slate-900/60 text-center relative">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center mx-auto -mt-12 mb-3 text-slate-200 font-black text-base shadow-lg">
                2
              </div>
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">1st Runner Up</span>
              <h3 className="text-lg font-bold text-slate-100 mt-1">{top2.teamName}</h3>
              <span className="text-xs text-cyan-400 font-medium block mt-0.5">{top2.challengeTitle}</span>
              
              <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-2xl font-black font-mono text-slate-200">{top2.finalScore}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Final Weighted Score</span>
              </div>
            </div>
          )}

          {/* 1st Place Champion (Gold) */}
          <div className="order-1 md:order-2 glass-panel rounded-3xl p-8 border border-amber-500/60 bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-950 text-center relative shadow-2xl shadow-amber-950/50 -translate-y-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center mx-auto -mt-16 mb-4 text-slate-950 shadow-xl shadow-amber-500/40">
              <Crown className="w-9 h-9 animate-bounce" />
            </div>
            <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950 inline-block shadow-md">
              TOURNAMENT CHAMPION
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 mt-2">{top1.teamName}</h2>
            <span className="text-xs sm:text-sm text-cyan-300 font-semibold block mt-1">{top1.challengeTitle}</span>
            
            <div className="mt-5 p-4 rounded-2xl bg-slate-950/90 border border-amber-500/40">
              <span className="text-3xl sm:text-4xl font-black font-mono text-amber-300">{top1.finalScore}</span>
              <span className="text-[11px] text-slate-400 block mt-1">Final Score (R1: {top1.round1Score} • R2: {top1.round2Score})</span>
            </div>
          </div>

          {/* 3rd Place (Bronze) */}
          {top3 && (
            <div className="order-3 glass-panel rounded-2xl p-6 border border-amber-900/60 bg-slate-900/60 text-center relative">
              <div className="w-12 h-12 rounded-full bg-amber-950 border border-amber-800 flex items-center justify-center mx-auto -mt-12 mb-3 text-amber-400 font-black text-base shadow-lg">
                3
              </div>
              <span className="text-[10px] font-mono uppercase text-amber-500 font-bold block">2nd Runner Up</span>
              <h3 className="text-lg font-bold text-slate-100 mt-1">{top3.teamName}</h3>
              <span className="text-xs text-cyan-400 font-medium block mt-0.5">{top3.challengeTitle}</span>
              
              <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-2xl font-black font-mono text-amber-400">{top3.finalScore}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Final Weighted Score</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Full Standings Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">Complete Tournament Rankings</h3>
          <span className="text-xs text-slate-400">{rankings.length} Teams Scored</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Rank</th>
                <th className="py-3.5 px-4">Team Name</th>
                <th className="py-3.5 px-4">Problem Statement</th>
                <th className="py-3.5 px-4 text-center">Round 1 (40%)</th>
                <th className="py-3.5 px-4 text-center">Round 2 (60%)</th>
                <th className="py-3.5 px-4 text-right">Final Score</th>
                <th className="py-3.5 px-4 text-center">Project</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rankings.map((r) => (
                <tr key={r.teamId} className="hover:bg-slate-900/40 transition-all">
                  <td className="py-4 px-4 sm:px-6 font-mono font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs ${
                        r.rank === 1
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : r.rank === 2
                          ? 'bg-slate-300 text-slate-950 font-black'
                          : r.rank === 3
                          ? 'bg-amber-900 text-amber-200 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{r.rank}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-100">
                    {r.teamName}
                    <div className="text-[10px] font-normal text-slate-400 font-sans">
                      {r.members?.join(', ')}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-slate-300">
                    <span className="font-semibold">{r.challengeTitle}</span>
                    {r.category && <span className="text-[10px] text-slate-500 block">{r.category}</span>}
                  </td>
                  <td className="py-4 px-4 text-center font-mono font-bold text-cyan-400">
                    {r.round1Score ?? '--'}
                  </td>
                  <td className="py-4 px-4 text-center font-mono font-bold text-purple-400">
                    {r.round2Score ?? '--'}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-black text-base text-amber-300">
                    {r.finalScore ?? '--'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {r.scratchUrl ? (
                      <a
                        href={r.scratchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline font-semibold bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/40"
                      >
                        <ExternalLink className="w-3 h-3" /> Scratch
                      </a>
                    ) : (
                      <span className="text-slate-600 font-mono text-[10px]">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
