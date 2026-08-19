import React, { useState, useEffect } from 'react';
import api from '../../lib/api.js';
import socketClient from '../../lib/socket.js';
import { fireConfetti } from '../../lib/utils.js';
import {
  Trophy,
  Crown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function PublicLeaderboard() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);

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

    const handlePublish = () => fetchLeaderboard();
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
      <div className="bg-white rounded-xl p-10 border-2 border-[#bad6fc] text-center">
        <Trophy className="w-8 h-8 text-[#ffbe00] mx-auto mb-2 animate-bounce" />
        <h3 className="text-sm font-bold text-[#1e293b]">Loading Leaderboard...</h3>
      </div>
    );
  }

  if (!leaderboard?.isPublished && rankings.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 sm:p-14 border-2 border-[#bad6fc] text-center max-w-lg mx-auto my-8 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#fff9e6] border-2 border-[#ffbe00] flex items-center justify-center mx-auto mb-4 text-[#ffbe00]">
          <Trophy className="w-7 h-7" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-[#1e293b] font-pixel">
          HALL OF FAME STANDING BY
        </h2>
        <p className="text-xs text-[#64748b] mt-2 max-w-sm mx-auto leading-relaxed">
          Official rankings will be revealed once the judging panel completes all Round 2 evaluations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 border-2 border-[#bad6fc] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#ffbe00] text-[#141720] flex items-center justify-center font-bold">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#1e293b]">Tournament Standings</h1>
            <p className="text-xs text-[#64748b]">
              Formula: <span className="font-bold text-[#4e97fe]">R1 × 40% + R2 × 60%</span>
            </p>
          </div>
        </div>
      </div>

      {/* Podium Top 3 */}
      {top1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
          
          {/* 2nd Place */}
          {top2 ? (
            <div className="bg-white rounded-xl p-5 border-2 border-slate-300 text-center shadow-sm order-2 md:order-1">
              <span className="text-2xl">🥈</span>
              <span className="text-[10px] font-bold uppercase text-slate-500 block mt-1">2nd Place</span>
              <h3 className="text-base font-bold text-[#1e293b] mt-0.5">{top2.name}</h3>
              <span className="text-xs text-[#64748b]">{top2.challengeTitle}</span>
              <div className="text-xl font-black text-[#4e97fe] mt-3">{top2.finalScore} pts</div>
            </div>
          ) : <div className="hidden md:block" />}

          {/* 1st Place Champion */}
          <div className="bg-white rounded-2xl p-6 border-4 border-[#ffbe00] text-center shadow-md order-1 md:order-2 relative bg-gradient-to-b from-[#fffdf5] to-white">
            <span className="text-3xl">👑</span>
            <span className="text-xs font-bold uppercase text-[#ffbe00] block mt-1 font-pixel">CHAMPION</span>
            <h3 className="text-lg font-black text-[#1e293b] mt-1">{top1.name}</h3>
            <span className="text-xs font-semibold text-[#4e97fe]">{top1.challengeTitle}</span>
            <div className="text-3xl font-black text-[#ffbe00] mt-3">{top1.finalScore} pts</div>
          </div>

          {/* 3rd Place */}
          {top3 ? (
            <div className="bg-white rounded-xl p-5 border-2 border-amber-300 text-center shadow-sm order-3">
              <span className="text-2xl">🥉</span>
              <span className="text-[10px] font-bold uppercase text-amber-700 block mt-1">3rd Place</span>
              <h3 className="text-base font-bold text-[#1e293b] mt-0.5">{top3.name}</h3>
              <span className="text-xs text-[#64748b]">{top3.challengeTitle}</span>
              <div className="text-xl font-black text-[#4e97fe] mt-3">{top3.finalScore} pts</div>
            </div>
          ) : <div className="hidden md:block" />}

        </div>
      )}

      {/* Rankings Table */}
      <div className="bg-white rounded-xl border-2 border-[#bad6fc] shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f0f7ff] border-b border-[#bad6fc] text-[#475569] uppercase font-bold text-[10px]">
            <tr>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Squad Name</th>
              <th className="py-3 px-4">Challenge</th>
              <th className="py-3 px-4 text-center">Round 1 (40%)</th>
              <th className="py-3 px-4 text-center">Round 2 (60%)</th>
              <th className="py-3 px-4 text-right">Final Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-[#1e293b]">
            {rankings.map((r) => (
              <tr key={r.teamId} className="hover:bg-[#f8fbff] transition-colors">
                <td className="py-3.5 px-4 font-bold">#{r.rank}</td>
                <td className="py-3.5 px-4 font-bold">{r.name}</td>
                <td className="py-3.5 px-4 text-[#64748b]">{r.challengeTitle}</td>
                <td className="py-3.5 px-4 text-center font-mono">{r.r1Score ?? '--'}</td>
                <td className="py-3.5 px-4 text-center font-mono">{r.r2Score ?? '--'}</td>
                <td className="py-3.5 px-4 text-right font-black text-[#4e97fe] text-sm">
                  {r.finalScore ?? '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
