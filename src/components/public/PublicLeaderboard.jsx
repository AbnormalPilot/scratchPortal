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
  Mic,
  Lock,
} from 'lucide-react';

export default function PublicLeaderboard() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'FINALISTS' | 'NON_FINALISTS'
  const [activeTab, setActiveTab] = useState('FINAL'); // 'R1' | 'FINAL'

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await api.get('/public/leaderboard');
      setLeaderboard(data);

      // Smart default tab selection
      if (data.isFinalPublished) {
        setActiveTab('FINAL');
        fireConfetti();
      } else if (data.isR1Published) {
        setActiveTab('R1');
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

  const isR1Published = Boolean(leaderboard?.isR1Published);
  const isFinalPublished = Boolean(leaderboard?.isFinalPublished);

  const r1Rankings = leaderboard?.r1Rankings || [];
  const finalRankings = leaderboard?.finalRankings || [];

  const currentRankings = activeTab === 'FINAL' ? finalRankings : r1Rankings;
  const isCurrentTabPublished = activeTab === 'FINAL' ? isFinalPublished : isR1Published;

  // Podium computation for Final Leaderboard
  const podiumList = finalRankings.filter((r) => r.isFinalist);
  const top1 = podiumList[0] || finalRankings[0];
  const top2 = podiumList[1] || finalRankings[1];
  const top3 = podiumList[2] || finalRankings[2];

  const filteredRankings = currentRankings.filter((r) => {
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
        <p className="text-xs font-retro text-[#64748b]">Fetching verified scores from tournament servers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Brand Icon & Titles */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ffbe00] to-[#f6ab3c] text-white flex items-center justify-center shadow-[3px_3px_0px_#b87515] shrink-0 border-2 border-white">
              <Trophy className="w-6 h-6 text-white drop-shadow-xs" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                  TOURNAMENT STANDINGS
                </h1>
                {isCurrentTabPublished ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-pixel text-[9px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    VERIFIED SCORES
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-pixel text-[9px] font-bold">
                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                    EVALUATION IN PROGRESS
                  </span>
                )}
              </div>
              <p className="text-xs font-retro text-[#64748b] mt-0.5">
                Verified tournament rankings and official grades from the judging panel.
              </p>
            </div>
          </div>

          {/* Right: Tactile Segmented Round Switcher */}
          <div className="flex items-center p-1.5 bg-[#f0f7ff] border-2 border-[#bad6fc] rounded-xl shadow-xs gap-1.5 self-start lg:self-center">
            <button
              onClick={() => setActiveTab('R1')}
              className={`px-4 py-2 rounded-lg text-xs font-pixel transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'R1'
                  ? 'bg-[#4e97fe] text-white shadow-[0_2px_0_#2463bf] font-bold scale-[1.02]'
                  : 'text-[#475569] hover:bg-[#e0efff]'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>ROUND 1 SPRINT</span>
              {isR1Published && (
                <span className="w-2 h-2 rounded-full bg-emerald-300" title="Published" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('FINAL')}
              className={`px-4 py-2 rounded-lg text-xs font-pixel transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'FINAL'
                  ? 'bg-[#ffbe00] text-[#141720] shadow-[0_2px_0_#b87515] font-black scale-[1.02]'
                  : 'text-[#475569] hover:bg-[#e0efff]'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-[#141720]" />
              <span>GRAND FINALE</span>
              {isFinalPublished && (
                <span className="w-2 h-2 rounded-full bg-emerald-600" title="Published" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* UNPUBLISHED STANDBY SCREEN (When currently selected tab is not yet published) */}
      {!isCurrentTabPublished ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 border-4 border-[#bad6fc] shadow-[8px_8px_0px_#bad6fc] text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#fff9e6] border-3 border-[#ffbe00] shadow-[3px_3px_0px_#a4640c] flex items-center justify-center mx-auto">
            {activeTab === 'FINAL' ? (
              <Crown className="w-8 h-8 text-[#f6ab3c]" />
            ) : (
              <Gamepad2 className="w-8 h-8 text-[#4e97fe]" />
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1e293b] font-pixel tracking-tight">
            {activeTab === 'FINAL'
              ? 'GRAND FINALE STANDINGS STANDING BY'
              : 'ROUND 1 SPRINT STANDINGS STANDING BY'}
          </h2>
          <p className="text-xs font-retro text-[#64748b] max-w-sm mx-auto leading-relaxed">
            {activeTab === 'FINAL'
              ? 'Official Grand Champion rankings will be revealed once judges complete Round 2 pitch evaluations and organizers publish the final results.'
              : 'Round 1 Code Sprint submissions are currently being evaluated by the judging panel. Official Round 1 grades and Finalist qualifiers will be revealed soon!'}
          </p>
          {activeTab === 'FINAL' && isR1Published && (
            <button
              onClick={() => setActiveTab('R1')}
              className="mt-2 px-4 py-2 rounded-xl bg-[#4e97fe] text-white text-xs font-pixel font-bold shadow-[2px_2px_0px_#2463bf] cursor-pointer hover:bg-[#3c86ee]"
            >
              VIEW PUBLISHED ROUND 1 STANDINGS ↗
            </button>
          )}
        </div>
      ) : (
        /* PUBLISHED LEADERBOARD VIEW */
        <div className="space-y-6">

          {/* Grand Finale Podium (Only shown on Grand Finale tab if published) */}
          {activeTab === 'FINAL' && top1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
              
              {/* 2nd Place Runner Up */}
              {top2 ? (
                <div className="bg-white rounded-2xl p-5 border-4 border-slate-300 shadow-[4px_4px_0px_#cbd5e1] text-center order-2 md:order-1 space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center shadow-xs text-slate-500">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-pixel uppercase text-slate-500 font-bold block">
                    2ND PLACE • RUNNER UP
                  </span>
                  <h3 className="font-bold font-pixel text-base text-[#1e293b] truncate">
                    {top2.teamName}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-black font-pixel text-slate-700">
                      {top2.finalScore}
                    </span>
                    <span className="text-xs font-pixel text-slate-400">/ 100</span>
                  </div>
                  <span className="text-[10px] font-retro text-[#64748b] block truncate">
                    {top2.challengeTitle}
                  </span>
                </div>
              ) : null}

              {/* 1st Place Grand Champion */}
              <div className="bg-gradient-to-b from-[#fffdf5] to-amber-50 rounded-2xl p-6 border-4 border-[#ffbe00] shadow-[6px_6px_0px_#a4640c] text-center order-1 md:order-2 space-y-2.5 relative transform md:-translate-y-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ffbe00] text-[#141720] px-3 py-0.5 rounded-full text-[9px] font-pixel font-black shadow-xs flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> GRAND CHAMPION
                </div>
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center shadow-sm mt-1 text-[#f6ab3c]">
                  <Trophy className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-pixel uppercase text-[#a4640c] font-black block">
                  1ST PLACE WINNER
                </span>
                <h3 className="font-black font-pixel text-lg sm:text-xl text-[#1e293b] truncate">
                  {top1.teamName}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl sm:text-4xl font-black font-pixel text-[#f6ab3c]">
                    {top1.finalScore}
                  </span>
                  <span className="text-xs font-pixel text-amber-700">/ 100</span>
                </div>
                <span className="text-xs font-retro text-[#1e293b] font-bold block truncate">
                  {top1.challengeTitle}
                </span>
              </div>

              {/* 3rd Place Bronze */}
              {top3 ? (
                <div className="bg-white rounded-2xl p-5 border-4 border-amber-700/40 shadow-[4px_4px_0px_#d97706]/30 text-center order-3 space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-amber-50 flex items-center justify-center shadow-xs text-amber-800">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-pixel uppercase text-amber-800 font-bold block">
                    3RD PLACE • BRONZE
                  </span>
                  <h3 className="font-bold font-pixel text-base text-[#1e293b] truncate">
                    {top3.teamName}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-black font-pixel text-amber-900">
                      {top3.finalScore}
                    </span>
                    <span className="text-xs font-pixel text-amber-700/60">/ 100</span>
                  </div>
                  <span className="text-[10px] font-retro text-[#64748b] block truncate">
                    {top3.challengeTitle}
                  </span>
                </div>
              ) : null}

            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search squad name, member, or challenge..."
                className="w-full pl-10 pr-3 py-2 rounded-xl border-2 border-slate-200 text-xs sm:text-sm font-retro text-[#1e293b] focus:border-[#4e97fe] outline-none shadow-inner"
              />
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-pixel">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  filterMode === 'ALL'
                    ? 'bg-[#4e97fe] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Squads ({currentRankings.length})
              </button>
              <button
                onClick={() => setFilterMode('FINALISTS')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 ${
                  filterMode === 'FINALISTS'
                    ? 'bg-[#ffbe00] text-[#141720] shadow-xs'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                <Crown className="w-2.5 h-2.5 text-[#141720]" />
                Finalists Only ({currentRankings.filter((r) => r.isFinalist).length})
              </button>
            </div>
          </div>

          {/* Leaderboard Table Card */}
          <div className="bg-white rounded-2xl border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] overflow-hidden">
            
            {/* Table Header Banner */}
            <div className="bg-[#f0f7ff] px-6 py-3.5 border-b-2 border-[#bad6fc] flex items-center justify-between">
              <span className="font-pixel text-xs text-[#1e293b] font-bold uppercase flex items-center gap-2">
                {activeTab === 'FINAL' ? (
                  <>
                    <Crown className="w-4 h-4 text-[#ffbe00]" />
                    GRAND CHAMPIONSHIP FINAL STANDINGS
                  </>
                ) : (
                  <>
                    <Gamepad2 className="w-4 h-4 text-[#4e97fe]" />
                    ROUND 1 SPRINT STANDINGS & QUALIFIERS
                  </>
                )}
              </span>
              <span className="text-[10px] font-pixel text-[#64748b]">
                {filteredRankings.length} {filteredRankings.length === 1 ? 'Squad' : 'Squads'} Listed
              </span>
            </div>

            {filteredRankings.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Gamepad2 className="w-8 h-8 text-[#64748b] mx-auto" />
                <p className="text-xs font-pixel text-[#1e293b] font-bold">NO SQUADS MATCHED SEARCH</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-retro">
                  <thead className="bg-slate-50 text-[10px] font-pixel text-[#64748b] uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-center w-14">RANK</th>
                      <th className="px-4 py-3">SQUAD / TEAM</th>
                      <th className="px-4 py-3">GAME THEME</th>
                      {activeTab === 'FINAL' ? (
                        <>
                          <th className="px-4 py-3 text-center">R1 SPRINT</th>
                          <th className="px-4 py-3 text-center">R2 PITCH</th>
                          <th className="px-4 py-3 text-center font-bold text-[#f6ab3c]">FINAL SCORE</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-center font-bold text-[#4e97fe]">R1 SCORE</th>
                          <th className="px-4 py-3 text-center">QUALIFICATION</th>
                        </>
                      )}
                      <th className="px-4 py-3 text-right">PROJECT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRankings.map((r, idx) => {
                      const isTop3 = idx < 3;
                      const isChampion = idx === 0 && activeTab === 'FINAL';

                      return (
                        <tr
                          key={r.teamId}
                          className={`hover:bg-[#f8fbff] transition-colors ${
                            r.isFinalist ? 'bg-amber-50/20 font-medium' : ''
                          }`}
                        >
                          {/* Rank Column */}
                          <td className="px-4 py-3.5 text-center font-pixel">
                            {idx === 0 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                                <Trophy className="w-3.5 h-3.5 text-amber-700" />
                              </span>
                            ) : idx === 1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300">
                                <Award className="w-3.5 h-3.5 text-slate-700" />
                              </span>
                            ) : idx === 2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200">
                                <Award className="w-3.5 h-3.5 text-amber-800" />
                              </span>
                            ) : (
                              <span className="text-[#64748b] font-bold text-xs">#{idx + 1}</span>
                            )}
                          </td>

                          {/* Squad Name & Members */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold font-pixel text-xs text-[#1e293b]">
                                {r.teamName}
                              </span>
                              {r.isFinalist && (
                                <span className="text-[9px] font-pixel px-1.5 py-0.5 rounded bg-[#ffbe00] text-[#141720] font-black shrink-0">
                                  FINALIST
                                </span>
                              )}
                            </div>
                            {r.members?.length > 0 && (
                              <span className="text-[11px] font-retro text-[#64748b] block mt-0.5">
                                {r.members.join(', ')}
                              </span>
                            )}
                          </td>

                          {/* Challenge Problem Statement */}
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-xs text-[#1e293b] block">
                              {r.challengeTitle}
                            </span>
                            {r.category && (
                              <span className="text-[10px] font-retro text-[#64748b]">
                                {r.category}
                              </span>
                            )}
                          </td>

                          {/* Scores Columns */}
                          {activeTab === 'FINAL' ? (
                            <>
                              <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-600">
                                {r.round1Score ?? 0}
                              </td>
                              <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-600">
                                {r.round2Score !== null ? r.round2Score : '—'}
                              </td>
                              <td className="px-4 py-3.5 text-center font-mono font-bold text-sm text-[#f6ab3c]">
                                {r.finalScore ?? r.round1Score ?? 0}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3.5 text-center font-mono font-bold text-sm text-[#4e97fe]">
                                {r.round1Score ?? 0} / 100
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {r.isFinalist ? (
                                  <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold inline-flex items-center gap-1">
                                    <Trophy className="w-2.5 h-2.5 text-emerald-600" />
                                    ADVANCED
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-retro text-slate-400">
                                    Participant
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {/* Project Links */}
                          <td className="px-4 py-3.5 text-right">
                            {r.scratchUrl ? (
                              <a
                                href={r.scratchUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-pixel text-[#4e97fe] hover:underline font-bold px-2 py-1 bg-white rounded border border-[#bad6fc]"
                              >
                                Scratch ↗
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-retro">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
