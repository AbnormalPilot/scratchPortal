import React, { useState, useEffect } from 'react';
import api from '../../lib/api.js';
import socketClient from '../../lib/socket.js';
import { fireConfetti } from '../../lib/utils.js';
import {
  Trophy,
  Crown,
  Sparkles,
  ExternalLink,
  Award,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Gamepad2,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function PublicLeaderboard() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'FINALISTS' | 'NON_FINALISTS'

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
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
    socketClient.on('score:updated', handlePublish);
    socketClient.on('stage:changed', handlePublish);

    return () => {
      socketClient.off('leaderboard:published', handlePublish);
      socketClient.off('score:updated', handlePublish);
      socketClient.off('stage:changed', handlePublish);
    };
  }, []);

  const rankings = leaderboard?.rankings || [];
  const finalists = rankings.filter((r) => r.isFinalist);
  const top1 = finalists[0] || rankings[0];
  const top2 = finalists[1] || rankings[1];
  const top3 = finalists[2] || rankings[2];

  const filteredRankings = rankings.filter((r) => {
    if (filterMode === 'FINALISTS' && !r.isFinalist) return false;
    if (filterMode === 'NON_FINALISTS' && r.isFinalist) return false;

    const matchesSearch =
      r.teamName?.toLowerCase().includes(search.toLowerCase()) ||
      r.accessCode?.toLowerCase().includes(search.toLowerCase()) ||
      r.challengeTitle?.toLowerCase().includes(search.toLowerCase()) ||
      r.members?.some((m) => m.toLowerCase().includes(search.toLowerCase()));

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] text-center space-y-3 max-w-md mx-auto my-8">
        <Trophy className="w-10 h-10 text-[#ffbe00] mx-auto animate-bounce" />
        <h3 className="text-sm font-bold font-pixel text-[#1e293b]">LOADING LEADERBOARD STANDINGS...</h3>
        <p className="text-xs font-retro text-[#64748b]">Fetching verified scores from the judging panel.</p>
      </div>
    );
  }

  if (!leaderboard?.isPublished && rankings.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 sm:p-14 border-4 border-[#bad6fc] shadow-[8px_8px_0px_#bad6fc] text-center max-w-lg mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#fff9e6] border-3 border-[#ffbe00] shadow-[3px_3px_0px_#a4640c] flex items-center justify-center mx-auto text-[#ffbe00] text-3xl">
          🏆
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-[#1e293b] font-pixel tracking-tight">
          TOURNAMENT HALL OF FAME STANDING BY
        </h2>
        <p className="text-xs font-retro text-[#64748b] max-w-sm mx-auto leading-relaxed">
          Official rankings, Round 1 grades, and Round 2 qualification results will be revealed once organizers publish the leaderboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#4e97fe] shadow-[6px_6px_0px_#bad6fc] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ffbe00] to-[#f6ab3c] text-white flex items-center justify-center text-2xl shadow-[3px_3px_0px_#a4640c] shrink-0 border-2 border-white">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                  OFFICIAL TOURNAMENT STANDINGS
                </h1>
                <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                  PUBLISHED
                </span>
              </div>
              <p className="text-xs font-retro text-[#64748b] mt-0.5">
                Official tournament standings and verified grades from the judging panel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="text-center px-3 py-1.5 bg-[#f0f7ff] rounded-xl border border-[#bad6fc]">
              <span className="text-[9px] text-[#64748b] block font-pixel">TOTAL SQUADS</span>
              <span className="font-bold text-[#1e293b] font-pixel text-xs">{rankings.length}</span>
            </div>
            <div className="text-center px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[9px] text-amber-800 block font-pixel">FINALISTS</span>
              <span className="font-bold text-amber-900 font-pixel text-xs">{finalists.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Finalists Podium (If Finalists exist) */}
      {top1 && top1.isFinalist && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
          
          {/* 2nd Place Finalist */}
          {top2 && top2.isFinalist ? (
            <div className="bg-white rounded-2xl p-5 border-4 border-slate-300 shadow-[4px_4px_0px_#cbd5e1] text-center order-2 md:order-1 space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-xl shadow-xs">
                🥈
              </div>
              <span className="text-[9px] font-pixel uppercase text-slate-500 font-bold block">
                2ND PLACE FINALIST
              </span>
              <h3 className="text-base font-bold font-pixel text-[#1e293b] truncate">
                {top2.teamName}
              </h3>
              <span className="text-[11px] font-retro text-[#4e97fe] font-bold block truncate">
                {top2.challengeTitle}
              </span>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-retro">
                <span className="text-[10px] text-[#64748b] block font-pixel">R1 SCORE: {top2.round1Score} pts</span>
                <span className="text-lg font-bold font-pixel text-[#1e293b]">
                  {top2.finalScore} PTS
                </span>
              </div>
            </div>
          ) : <div className="hidden md:block" />}

          {/* 1st Place Champion */}
          <div className="bg-gradient-to-b from-[#fffdf5] to-white rounded-3xl p-6 sm:p-7 border-4 border-[#ffbe00] shadow-[6px_6px_0px_#f59e0b] text-center order-1 md:order-2 space-y-2.5 relative">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#fff5cc] border-2 border-[#ffbe00] flex items-center justify-center text-2xl shadow-sm animate-pulse">
              👑
            </div>
            <span className="text-[10px] font-pixel uppercase text-[#b45309] font-black tracking-wider block">
              TOURNAMENT CHAMPION
            </span>
            <h3 className="text-lg sm:text-xl font-black font-pixel text-[#1e293b] truncate">
              {top1.teamName}
            </h3>
            <span className="text-xs font-retro text-[#4e97fe] font-bold block truncate">
              {top1.challengeTitle}
            </span>
            <div className="p-3 rounded-2xl bg-[#fff9e6] border-2 border-[#ffbe00] text-xs font-retro space-y-1 shadow-inner">
              <span className="text-[10px] text-[#b45309] block font-pixel">
                Round 1: {top1.round1Score} PTS • Round 2 Pitch: {top1.round2Score ?? 'Pending'}
              </span>
              <div className="text-2xl sm:text-3xl font-black font-pixel text-[#b45309]">
                {top1.finalScore} PTS
              </div>
            </div>
          </div>

          {/* 3rd Place Finalist */}
          {top3 && top3.isFinalist ? (
            <div className="bg-white rounded-2xl p-5 border-4 border-amber-300 shadow-[4px_4px_0px_#fcd34d] text-center order-3 space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-50 flex items-center justify-center text-xl shadow-xs">
                🥉
              </div>
              <span className="text-[9px] font-pixel uppercase text-amber-700 font-bold block">
                3RD PLACE FINALIST
              </span>
              <h3 className="text-base font-bold font-pixel text-[#1e293b] truncate">
                {top3.teamName}
              </h3>
              <span className="text-[11px] font-retro text-[#4e97fe] font-bold block truncate">
                {top3.challengeTitle}
              </span>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-retro">
                <span className="text-[10px] text-[#64748b] block font-pixel">R1 SCORE: {top3.round1Score} pts</span>
                <span className="text-lg font-bold font-pixel text-[#1e293b]">
                  {top3.finalScore} PTS
                </span>
              </div>
            </div>
          ) : <div className="hidden md:block" />}

        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by team name, access code, or challenge..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-slate-200 text-xs sm:text-sm font-retro text-[#1e293b] focus:border-[#4e97fe] outline-none shadow-inner"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-pixel">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              filterMode === 'ALL'
                ? 'bg-[#4e97fe] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Squads ({rankings.length})
          </button>
          <button
            onClick={() => setFilterMode('FINALISTS')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 ${
              filterMode === 'FINALISTS'
                ? 'bg-[#ffbe00] text-[#141720] shadow-xs'
                : 'text-amber-800 hover:text-amber-950'
            }`}
          >
            <Trophy className="w-3 h-3 text-[#141720]" />
            Qualified Finalists ({finalists.length})
          </button>
          <button
            onClick={() => setFilterMode('NON_FINALISTS')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              filterMode === 'NON_FINALISTS'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Round 1 Cohort ({rankings.length - finalists.length})
          </button>
        </div>
      </div>

      {/* Complete Rankings & Grades Table */}
      <div className="bg-white rounded-2xl border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f0f7ff] border-b-2 border-[#bad6fc] text-[#475569] uppercase font-bold text-[10px] font-pixel">
              <tr>
                <th className="py-3.5 px-4 text-center w-16">Rank</th>
                <th className="py-3.5 px-4 min-w-[200px]">Squad Name & Code</th>
                <th className="py-3.5 px-4 min-w-[180px]">Problem Statement</th>
                <th className="py-3.5 px-4 text-center min-w-[140px]">Round 1 Grade</th>
                <th className="py-3.5 px-4 text-center min-w-[170px]">Qualification Status</th>
                <th className="py-3.5 px-4 text-center min-w-[140px]">Round 2 Pitch</th>
                <th className="py-3.5 px-4 text-right min-w-[120px]">Grand Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-[#1e293b]">
              {filteredRankings.map((r, idx) => {
                const isTop1 = r.rank === 1 && r.isFinalist;
                const isTop2 = r.rank === 2 && r.isFinalist;
                const isTop3 = r.rank === 3 && r.isFinalist;

                return (
                  <tr
                    key={r.teamId}
                    className={`hover:bg-[#f8fbff] transition-colors ${
                      r.isFinalist ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-4 px-4 text-center font-bold">
                      {isTop1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ffbe00] text-[#141720] font-black text-xs shadow-xs">
                          🥇 1
                        </span>
                      ) : isTop2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-black text-xs shadow-xs">
                          🥈 2
                        </span>
                      ) : isTop3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-200 text-amber-900 font-black text-xs shadow-xs">
                          🥉 3
                        </span>
                      ) : (
                        <span className="font-pixel text-xs text-[#64748b]">#{r.rank}</span>
                      )}
                    </td>

                    {/* Squad Name & Members */}
                    <td className="py-4 px-4">
                      <div>
                        <span className="font-pixel text-sm font-bold text-[#1e293b] block">
                          👾 {r.teamName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-[#4e97fe] font-bold">
                            CODE: {r.accessCode}
                          </span>
                          {r.members && r.members.length > 0 && (
                            <span className="text-[10px] font-retro text-[#64748b]">
                              ({r.members.join(', ')})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Problem Statement */}
                    <td className="py-4 px-4">
                      <div>
                        <span className="font-retro text-xs font-bold text-[#1e293b] block line-clamp-1">
                          {r.challengeTitle}
                        </span>
                        {r.category && (
                          <span className="text-[9px] font-pixel px-1.5 py-0.2 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase font-bold inline-block mt-0.5">
                            {r.category}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Round 1 Grade */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-block px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="font-pixel text-xs font-bold text-emerald-800 block">
                          {r.round1Score} / 100
                        </span>
                        <span className="text-[9px] font-retro text-[#64748b] block">
                          {r.round1JudgesCount > 0
                            ? `${r.round1JudgesCount} ${r.round1JudgesCount === 1 ? 'judge grade' : 'judge grades'}`
                            : 'Evaluated'}
                        </span>
                      </div>
                    </td>

                    {/* Qualification Status */}
                    <td className="py-4 px-4 text-center">
                      {r.isFinalist ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#ffbe00] text-[#141720] border-2 border-amber-400 font-pixel text-[10px] font-black shadow-xs">
                          <Trophy className="w-3 h-3 text-[#141720]" />
                          QUALIFIED (FINALIST)
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 font-pixel text-[9px] font-bold">
                          ROUND 1 PARTICIPANT
                        </span>
                      )}
                    </td>

                    {/* Round 2 Pitch Score */}
                    <td className="py-4 px-4 text-center">
                      {r.isFinalist ? (
                        r.round2Score !== null && r.round2Score !== undefined ? (
                          <div className="inline-block px-3 py-1 rounded-xl bg-amber-50 border border-amber-200">
                            <span className="font-pixel text-xs font-bold text-amber-900 block">
                              {r.round2Score} / 100
                            </span>
                            <span className="text-[9px] font-retro text-amber-700 block">
                              Presentation Score
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-pixel text-amber-700 italic font-bold">
                            ⏳ PENDING PITCH
                          </span>
                        )
                      ) : (
                        <span className="text-xs font-retro text-slate-400 font-mono">—</span>
                      )}
                    </td>

                    {/* Final Grand Score */}
                    <td className="py-4 px-4 text-right">
                      <div className="font-pixel text-sm sm:text-base font-black text-[#4e97fe]">
                        {r.finalScore} PTS
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
