import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import socketClient from '../../lib/socket.js';
import Round1RubricModal from './Round1RubricModal.jsx';
import Round2RubricModal from './Round2RubricModal.jsx';
import {
  Award,
  Gamepad2,
  ExternalLink,
  CheckCircle2,
  Search,
  Filter,
  Layers,
  Sparkles,
  Presentation,
  Clock,
  AlertCircle,
  FileText,
  FileVideo,
  Save,
  Users,
  Film,
} from 'lucide-react';

export default function JudgeDashboard() {
  const { user, eventConfig } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [modalRound, setModalRound] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedChallengeFilter, setSelectedChallengeFilter] = useState('ALL');

  const stage = eventConfig?.currentStage || 'ROUND1_JUDGING';
  const isRound2 = stage === 'ROUND2_PREP' || stage === 'ROUND2_LIVE' || stage === 'ROUND2_JUDGING';

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const fetchTeams = async () => {
    try {
      const data = await api.get('/judge/teams');
      setTeams(data.teams || []);
    } catch (err) {
      console.error('Failed to load judge teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();

    socketClient.connect();

    const handleSubmissionUpdate = (data) => {
      fetchTeams();
    };
    const handleScoreUpdate = (data) => {
      fetchTeams();
    };
    const handleStageUpdate = (data) => {
      fetchTeams();
    };

    socketClient.on('submission:updated', handleSubmissionUpdate);
    socketClient.on('score:updated', handleScoreUpdate);
    socketClient.on('stage:changed', handleStageUpdate);

    return () => {
      socketClient.off('submission:updated', handleSubmissionUpdate);
      socketClient.off('score:updated', handleScoreUpdate);
      socketClient.off('stage:changed', handleStageUpdate);
    };
  }, []);

  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNGRADED' | 'GRADED'

  const openEvaluation = (team, roundNum) => {
    setSelectedTeam(team);
    setModalRound(roundNum);
  };

  // Telemetry Calculations
  const activeCohort = isRound2 ? teams.filter((t) => t.isFinalist) : teams;
  const totalSquads = activeCohort.length;
  const gradedSquadsCount = activeCohort.filter((t) => Boolean(isRound2 ? t.myR2Score : t.myR1Score)).length;
  const remainingSquadsCount = Math.max(0, totalSquads - gradedSquadsCount);
  const progressPercent = totalSquads > 0 ? Math.round((gradedSquadsCount / totalSquads) * 100) : 0;
  const submittedSquadsCount = activeCohort.filter((t) => {
    const sub = isRound2 ? t.r2Submission : t.r1Submission;
    return sub && (sub.status === 'SUBMITTED' || sub.status === 'LATE');
  }).length;

  const filteredTeams = teams.filter((t) => {
    if (isRound2 && !t.isFinalist) return false;
    const isGraded = Boolean(isRound2 ? t.myR2Score : t.myR1Score);

    // Grading status filter
    if (statusFilter === 'UNGRADED' && isGraded) return false;
    if (statusFilter === 'GRADED' && !isGraded) return false;

    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.challenge?.title?.toLowerCase().includes(search.toLowerCase());
    const matchesChallenge =
      selectedChallengeFilter === 'ALL' || t.challenge?.title === selectedChallengeFilter;
    return matchesSearch && matchesChallenge;
  });

  const uniqueChallenges = Array.from(new Set(teams.map((t) => t.challenge?.title).filter(Boolean)));

  return (
    <div className="space-y-6">
      
      {/* Top Header Card with Telemetry */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#4e97fe] shadow-[6px_6px_0px_#bad6fc] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4e97fe] to-[#307fef] text-white flex items-center justify-center text-2xl shadow-[3px_3px_0px_#2463bf] shrink-0 border-2 border-white">
              ⚖️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                  JUDGE EVALUATION STUDIO
                </h1>
                <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-[#ffbe00] text-[#141720] font-black">
                  {isRound2 ? 'ROUND 2 FINALISTS' : 'ROUND 1 COHORT'}
                </span>
              </div>
              <p className="text-xs font-retro text-[#64748b] mt-0.5">
                Official Judge: <span className="font-bold text-[#1e293b] font-pixel text-[11px]">{user?.fullName || 'Senior Judge'}</span>
              </p>
            </div>
          </div>

          {/* Quick Refresh */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-pixel px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-bold">
              {progressPercent === 100 ? '🎉 ALL SQUADS GRADED' : `${progressPercent}% COMPLETED`}
            </span>
          </div>
        </div>

        {/* Progress Bar & KPI Metrics Bar */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          
          {/* Visual Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-retro">
              <span className="font-bold text-[#64748b] font-pixel text-[10px] uppercase flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#4e97fe]" />
                Grading Progress ({gradedSquadsCount} of {totalSquads} squads completed)
              </span>
              <span className="font-pixel text-xs text-[#4e97fe] font-bold">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4e97fe] to-emerald-500 transition-all duration-500 shadow-inner"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* KPI Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-[#f0f7ff] border border-[#bad6fc] text-center">
              <span className="text-[10px] font-pixel text-[#64748b] block">TOTAL COHORT</span>
              <span className="text-lg sm:text-xl font-bold font-pixel text-[#1e293b]">{totalSquads}</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] font-pixel text-emerald-700 block">GRADED BY YOU</span>
              <span className="text-lg sm:text-xl font-bold font-pixel text-emerald-800 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {gradedSquadsCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-[10px] font-pixel text-amber-700 block">REMAINING TO GRADE</span>
              <span className="text-lg sm:text-xl font-bold font-pixel text-amber-800 flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-amber-600" />
                {remainingSquadsCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center">
              <span className="text-[10px] font-pixel text-purple-700 block">FINAL SUBMISSIONS</span>
              <span className="text-lg sm:text-xl font-bold font-pixel text-purple-800">
                {submittedSquadsCount} / {totalSquads}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Live Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search squad name or quest..."
            className="w-full pl-10 pr-3 py-2 rounded-xl border-2 border-slate-200 text-xs sm:text-sm font-retro text-[#1e293b] focus:border-[#4e97fe] outline-none shadow-inner"
          />
        </div>

        {/* Right: Challenge selector + Status Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {uniqueChallenges.length > 0 && (
            <select
              value={selectedChallengeFilter}
              onChange={(e) => setSelectedChallengeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-retro text-[#1e293b] focus:border-[#4e97fe] outline-none bg-white cursor-pointer"
            >
              <option value="ALL">All Problem Statements ({teams.length})</option>
              {uniqueChallenges.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Quick Grading Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-pixel">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                statusFilter === 'ALL'
                  ? 'bg-[#4e97fe] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalSquads})
            </button>
            <button
              onClick={() => setStatusFilter('UNGRADED')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 ${
                statusFilter === 'UNGRADED'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              Remaining ({remainingSquadsCount})
            </button>
            <button
              onClick={() => setStatusFilter('GRADED')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 ${
                statusFilter === 'GRADED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              Graded ({gradedSquadsCount})
            </button>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-white/70 animate-pulse border-2 border-[#bad6fc]" />
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border-4 border-[#bad6fc] text-center shadow-sm max-w-md mx-auto my-6 space-y-2">
          <Gamepad2 className="w-10 h-10 text-[#64748b] mx-auto" />
          <h3 className="text-sm font-bold font-pixel text-[#1e293b]">NO SQUADS MATCHED</h3>
          <p className="text-xs font-retro text-[#64748b]">Try clearing your search or filter parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((t) => {
            const r1Sub = t.r1Submission || t.submissions?.find((s) => s.roundNumber === 1);
            const r2Sub = t.r2Submission || t.submissions?.find((s) => s.roundNumber === 2);
            const myR1Score = t.myR1Score || t.round1Scores?.find((sc) => sc.judgeId === user?.id);
            const myR2Score = t.myR2Score || t.round2Scores?.find((sc) => sc.judgeId === user?.id);
            const activeSub = isRound2 ? r2Sub : r1Sub;
            const currentScore = isRound2 ? myR2Score : myR1Score;
            const isFinalSubmitted = activeSub?.status === 'SUBMITTED' || activeSub?.status === 'LATE';
            const isDraft = activeSub?.status === 'DRAFT';
            const isGraded = Boolean(currentScore);
            const saveTime = formatTimestamp(activeSub?.submittedAt || activeSub?.createdAt);
            const scoreTime = formatTimestamp(currentScore?.updatedAt || currentScore?.createdAt);

            return (
              <div
                key={t.id}
                className={`rounded-2xl p-5 sm:p-6 border-4 transition-all duration-300 flex flex-col justify-between ${
                  isGraded
                    ? 'bg-slate-50/75 border-slate-300/80 shadow-[2px_2px_0px_#cbd5e1] opacity-60 hover:opacity-100 hover:bg-white hover:border-[#bad6fc] hover:shadow-[6px_6px_0px_#bad6fc] hover:-translate-y-1'
                    : 'bg-white border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#bad6fc]'
                }`}
              >
                <div>
                  
                  {/* Top Meta: Challenge Pill + Finalist Badge + Graded Pill */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase font-bold truncate max-w-[150px]">
                      {t.challenge?.title || 'Unassigned'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isGraded && (
                        <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          GRADED
                        </span>
                      )}
                      {t.isFinalist && (
                        <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-[#ffbe00] text-[#141720] font-black shrink-0">
                          FINALIST
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Team Name & Members */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b] leading-tight">
                        {t.name}
                      </h3>
                      <span className="text-xs font-retro text-[#64748b] font-bold block mt-0.5">
                        CODE: {t.accessCode || t.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    {t.members?.length > 0 && (
                      <span className="text-[10px] font-retro text-[#64748b] bg-slate-100 px-2 py-0.5 rounded-lg font-medium shrink-0 flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        {t.members.length} {t.members.length === 1 ? 'member' : 'members'}
                      </span>
                    )}
                  </div>

                  {/* Rich Submission Details Box */}
                  <div className="mt-3.5 p-3 rounded-xl bg-[#f8fbff] border border-slate-200 space-y-2.5">
                    
                    {/* Header line: Submission state + Save timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-retro text-[#64748b] font-bold">Submission Status:</span>
                      {activeSub ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-pixel px-2 py-0.5 rounded font-bold uppercase ${
                              isFinalSubmitted
                                ? activeSub.status === 'LATE'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {isFinalSubmitted
                              ? activeSub.status === 'LATE'
                                ? '⚠️ LATE SUBMITTED'
                                : '✅ FINAL SUBMITTED'
                              : '💾 DRAFT SAVED'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-retro text-amber-700 italic">
                          Pending upload
                        </span>
                      )}
                    </div>

                    {/* Timestamp details */}
                    {activeSub && saveTime && (
                      <div className="flex items-center justify-between text-[11px] font-retro text-[#64748b] pt-1 border-t border-slate-200/60">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#4e97fe]" />
                          {isFinalSubmitted ? 'Finalized at:' : 'Draft saved at:'}
                        </span>
                        <span className="font-bold text-[#1e293b] font-mono">{saveTime}</span>
                      </div>
                    )}

                    {/* Short Description / Story Pitch Preview */}
                    {activeSub?.shortDescription && (
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-xs font-retro text-[#334155] leading-relaxed line-clamp-2">
                        <span className="font-pixel text-[9px] text-[#4e97fe] block uppercase mb-0.5">
                          STORY PITCH:
                        </span>
                        {activeSub.shortDescription}
                      </div>
                    )}

                    {/* Links & Video Badges Row */}
                    {activeSub && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                        {activeSub.scratchUrl && (
                          <a
                            href={activeSub.scratchUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-pixel text-[#4e97fe] hover:underline flex items-center gap-1 font-bold bg-white px-2 py-0.5 rounded border border-[#bad6fc]"
                          >
                            <ExternalLink className="w-3 h-3" /> Scratch Link ↗
                          </a>
                        )}
                        {activeSub.videoUrl && (
                          <span className="text-[10px] font-pixel text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-bold flex items-center gap-1">
                            <FileVideo className="w-3 h-3" />
                            {activeSub.videoFileName ? 'Video Clip Attached' : 'Video Link Attached'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Score Status & Action Button */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-3">
                  
                  {/* My Score Badge & Timestamp */}
                  <div className="flex items-center justify-between text-xs font-retro">
                    <span className="text-[#64748b]">Your Evaluation:</span>
                    {currentScore ? (
                      <div className="text-right">
                        <span className="font-pixel text-xs text-emerald-700 font-bold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {currentScore.totalScore} / 100 PTS
                        </span>
                        {scoreTime && (
                          <span className="text-[10px] font-retro text-[#64748b] block mt-0.5">
                            Scored at {scoreTime}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-pixel text-[10px] text-amber-600 font-bold">
                        ⏳ NOT SCORED
                      </span>
                    )}
                  </div>

                  {/* Button */}
                  {isRound2 && t.isFinalist ? (
                    <button
                      onClick={() => openEvaluation(t, 2)}
                      className="w-full py-2.5 rounded-xl bg-[#f6ab3c] hover:bg-[#e69828] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#a4640c] flex items-center justify-center gap-1.5 cursor-pointer font-black"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{myR2Score ? 'UPDATE ROUND 2 SCORE' : 'EVALUATE ROUND 2'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openEvaluation(t, 1)}
                      className="w-full py-2.5 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#2463bf] flex items-center justify-center gap-1.5 cursor-pointer font-black"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{myR1Score ? 'UPDATE ROUND 1 SCORE' : 'EVALUATE ROUND 1'}</span>
                    </button>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selectedTeam && modalRound === 1 && (
        <Round1RubricModal
          team={selectedTeam}
          existingScore={selectedTeam.myR1Score || selectedTeam.round1Scores?.find((s) => s.judgeId === user?.id)}
          onClose={() => setSelectedTeam(null)}
          onScoreSaved={fetchTeams}
        />
      )}

      {selectedTeam && modalRound === 2 && (
        <Round2RubricModal
          team={selectedTeam}
          existingScore={selectedTeam.myR2Score || selectedTeam.round2Scores?.find((s) => s.judgeId === user?.id)}
          onClose={() => setSelectedTeam(null)}
          onScoreSaved={fetchTeams}
        />
      )}

    </div>
  );
}
