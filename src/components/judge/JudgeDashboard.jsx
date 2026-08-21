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
  AlertTriangle,
  FileText,
  FileVideo,
  Save,
  Users,
  Film,
  Trophy,
  Mic,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export default function JudgeDashboard() {
  const { user, eventConfig } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [modalRound, setModalRound] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedChallengeFilter, setSelectedChallengeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNGRADED' | 'DRAFT' | 'GRADED'
  const [showRubricGuide, setShowRubricGuide] = useState(true);

  const stage = eventConfig?.currentStage || 'ROUND1_JUDGING';
  const isStageRound2 = stage === 'ROUND2_PREP' || stage === 'ROUND2_LIVE' || stage === 'ROUND2_JUDGING';

  // Allow judge to freely toggle between Round 1 and Round 2 views
  const [activeRoundTab, setActiveRoundTab] = useState(isStageRound2 ? 2 : 1);

  // Sync tab with stage initially or when stage changes to Round 2
  useEffect(() => {
    if (isStageRound2) {
      setActiveRoundTab(2);
    }
  }, [stage]);

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

    const handleSubmissionUpdate = () => fetchTeams();
    const handleScoreUpdate = () => fetchTeams();
    const handleStageUpdate = () => fetchTeams();
    const handleFinalistUpdate = () => fetchTeams();

    socketClient.on('submission:updated', handleSubmissionUpdate);
    socketClient.on('score:updated', handleScoreUpdate);
    socketClient.on('stage:changed', handleStageUpdate);
    socketClient.on('team:finalist_updated', handleFinalistUpdate);

    return () => {
      socketClient.off('submission:updated', handleSubmissionUpdate);
      socketClient.off('score:updated', handleScoreUpdate);
      socketClient.off('stage:changed', handleStageUpdate);
      socketClient.off('team:finalist_updated', handleFinalistUpdate);
    };
  }, []);

  const openEvaluation = (team, roundNum) => {
    setSelectedTeam(team);
    setModalRound(roundNum);
  };

  // Telemetry Calculations for currently active round tab
  const isViewingRound2 = activeRoundTab === 2;
  const activeCohort = isViewingRound2 ? teams.filter((t) => t.isFinalist) : teams;
  const totalSquads = activeCohort.length;

  // STRICT FINAL CHECK: A squad is only GRADED if isFinal === true
  const gradedSquadsCount = activeCohort.filter((t) => {
    const sc = isViewingRound2 ? t.myR2Score : t.myR1Score;
    return Boolean(sc && sc.isFinal);
  }).length;

  const draftSquadsCount = activeCohort.filter((t) => {
    const sc = isViewingRound2 ? t.myR2Score : t.myR1Score;
    return Boolean(sc && !sc.isFinal);
  }).length;

  const remainingSquadsCount = Math.max(0, totalSquads - gradedSquadsCount);
  const progressPercent = totalSquads > 0 ? Math.round((gradedSquadsCount / totalSquads) * 100) : 0;
  const submittedSquadsCount = activeCohort.filter((t) => {
    const sub = isViewingRound2 ? t.r2Submission : t.r1Submission;
    return sub && (sub.status === 'SUBMITTED' || sub.status === 'LATE');
  }).length;

  // Filtered Squads
  const filteredTeams = activeCohort
    .filter((t) => {
      const currentScore = isViewingRound2 ? t.myR2Score : t.myR1Score;
      const isGraded = Boolean(currentScore && currentScore.isFinal);
      const isDraftScore = Boolean(currentScore && !currentScore.isFinal);

      if (statusFilter === 'UNGRADED' && isGraded) return false;
      if (statusFilter === 'DRAFT' && !isDraftScore) return false;
      if (statusFilter === 'GRADED' && !isGraded) return false;

      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.challenge?.title?.toLowerCase().includes(search.toLowerCase()) ||
        (t.accessCode && t.accessCode.toLowerCase().includes(search.toLowerCase()));

      const matchesChallenge =
        selectedChallengeFilter === 'ALL' || t.challenge?.title === selectedChallengeFilter;

      return matchesSearch && matchesChallenge;
    })
    .sort((a, b) => {
      if (isViewingRound2) {
        // Sort by presentation slot first
        return (a.r2PresentationSlot || 99) - (b.r2PresentationSlot || 99);
      }
      return a.name.localeCompare(b.name);
    });

  const uniqueChallenges = Array.from(new Set(teams.map((t) => t.challenge?.title).filter(Boolean)));
  const totalFinalistsCount = teams.filter((t) => t.isFinalist).length;

  return (
    <div className="space-y-6">
      
      {/* Top Header Card with Round Switcher & Telemetry */}
      <div className={`bg-white rounded-3xl p-6 sm:p-7 border-4 transition-all duration-300 space-y-6 ${
        isViewingRound2
          ? 'border-[#f6ab3c] shadow-[6px_6px_0px_#fde68a]'
          : 'border-[#4e97fe] shadow-[6px_6px_0px_#bad6fc]'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center shrink-0 border-2 border-white transition-all shadow-[3px_3px_0px_rgba(0,0,0,0.15)] ${
              isViewingRound2
                ? 'bg-gradient-to-tr from-[#f6ab3c] via-[#ffbe00] to-[#f59e0b] shadow-[3px_3px_0px_#a4640c]'
                : 'bg-gradient-to-tr from-[#4e97fe] via-[#3b82f6] to-[#2563eb] shadow-[3px_3px_0px_#2463bf]'
            }`}>
              {isViewingRound2 ? <Mic className="w-7 h-7" /> : <Award className="w-7 h-7" />}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                  JUDGE EVALUATION STUDIO
                </h1>
                <span className={`text-[9px] font-pixel px-2.5 py-1 rounded-full font-black uppercase flex items-center gap-1.5 ${
                  isViewingRound2
                    ? 'bg-[#ffbe00] text-[#141720] shadow-xs'
                    : 'bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    isViewingRound2 ? 'bg-[#141720]' : 'bg-[#4e97fe]'
                  }`} />
                  {isViewingRound2 ? 'ROUND 2 • LIVE PITCHES' : 'ROUND 1 • BUILD SPRINT'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-retro text-[#64748b]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[#475569] text-[11px] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#4e97fe]" />
                  <span>Official Judge:</span>
                  <strong className="font-pixel text-[#1e293b] text-[11px] ml-0.5">{user?.fullName || 'Senior Judge'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Sleek Segmented Round Mode Switcher */}
          <div className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl border-2 border-slate-200 shadow-inner self-start lg:self-auto">
            <button
              onClick={() => {
                setActiveRoundTab(1);
                setStatusFilter('ALL');
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-pixel transition-all cursor-pointer flex items-center gap-2 font-bold ${
                activeRoundTab === 1
                  ? 'bg-[#4e97fe] text-white shadow-[2px_2px_0px_#2463bf]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>ROUND 1</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                activeRoundTab === 1 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {teams.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveRoundTab(2);
                setStatusFilter('ALL');
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-pixel transition-all cursor-pointer flex items-center gap-2 font-black ${
                activeRoundTab === 2
                  ? 'bg-[#f6ab3c] text-white shadow-[2px_2px_0px_#a4640c]'
                  : 'text-amber-900 hover:text-amber-950 hover:bg-white/50'
              }`}
            >
              <Trophy className={`w-3.5 h-3.5 ${activeRoundTab === 2 ? 'text-white' : 'text-[#f6ab3c]'}`} />
              <span>ROUND 2 FINALISTS</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                activeRoundTab === 2 ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
              }`}>
                {totalFinalistsCount}
              </span>
            </button>
          </div>
        </div>

        {/* Progress Bar & KPI Metrics */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          
          {/* Visual Progress Bar Section */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#475569] font-pixel text-[11px] uppercase flex items-center gap-1.5">
                <Award className={`w-4 h-4 ${isViewingRound2 ? 'text-[#f6ab3c]' : 'text-[#4e97fe]'}`} />
                <span>
                  {isViewingRound2 ? 'Round 2 Finalist Evaluations' : 'Round 1 Code Sprint Evaluations'}
                </span>
                <span className="text-[#64748b] font-retro text-xs font-normal">
                  ({gradedSquadsCount} of {totalSquads} squads finalized)
                </span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-md font-pixel text-xs font-bold ${
                isViewingRound2
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc]'
              }`}>
                {progressPercent}% COMPLETED
              </span>
            </div>
            
            <div className="w-full bg-slate-200/80 h-3.5 rounded-full overflow-hidden border border-slate-300 p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 shadow-sm ${
                  isViewingRound2
                    ? 'bg-gradient-to-r from-[#f6ab3c] to-[#ffbe00]'
                    : 'bg-gradient-to-r from-[#4e97fe] via-[#38bdf8] to-[#10b981]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* 4 Interactive Tactical KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
            
            {/* 1. Total Cohort */}
            <div className="p-4 rounded-2xl bg-[#f8fbff] hover:bg-[#f0f7ff] border-2 border-[#bad6fc] shadow-[3px_3px_0px_#bad6fc] transition-all flex items-center justify-between gap-3 group">
              <div>
                <span className="text-[10px] font-pixel text-[#64748b] uppercase tracking-wider block font-bold">
                  {isViewingRound2 ? 'FINALIST SQUADS' : 'TOTAL COHORT'}
                </span>
                <span className="text-2xl sm:text-3xl font-black font-pixel text-[#1e293b] mt-0.5 block">
                  {totalSquads}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white border border-[#bad6fc] text-[#4e97fe] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* 2. Final Graded */}
            <div className="p-4 rounded-2xl bg-[#f0fdf4] hover:bg-[#dcfce7] border-2 border-emerald-300 shadow-[3px_3px_0px_#86efac] transition-all flex items-center justify-between gap-3 group">
              <div>
                <span className="text-[10px] font-pixel text-emerald-700 uppercase tracking-wider block font-bold">
                  FINAL GRADED
                </span>
                <span className="text-2xl sm:text-3xl font-black font-pixel text-emerald-800 mt-0.5 block">
                  {gradedSquadsCount}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white border border-emerald-300 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* 3. Remaining / Pending */}
            <div className="p-4 rounded-2xl bg-[#fffdf2] hover:bg-[#fef9c3] border-2 border-amber-300 shadow-[3px_3px_0px_#fde047] transition-all flex items-center justify-between gap-3 group">
              <div>
                <span className="text-[10px] font-pixel text-amber-700 uppercase tracking-wider block font-bold">
                  PENDING REVIEW
                </span>
                <span className="text-2xl sm:text-3xl font-black font-pixel text-amber-800 mt-0.5 block">
                  {remainingSquadsCount}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white border border-amber-300 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* 4. Submissions Ready */}
            <div className="p-4 rounded-2xl bg-[#faf5ff] hover:bg-[#f3e8ff] border-2 border-purple-300 shadow-[3px_3px_0px_#d8b4fe] transition-all flex items-center justify-between gap-3 group">
              <div>
                <span className="text-[10px] font-pixel text-purple-700 uppercase tracking-wider block font-bold">
                  SUBMISSIONS READY
                </span>
                <span className="text-2xl sm:text-3xl font-black font-pixel text-purple-900 mt-0.5 block">
                  {submittedSquadsCount} <span className="text-sm font-retro text-purple-600 font-normal">/ {totalSquads}</span>
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white border border-purple-300 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Round 2 Live Presentation Lineup Notice */}
      {isViewingRound2 && totalFinalistsCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-100/50 to-transparent p-4 rounded-2xl border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ffbe00] text-[#141720] flex items-center justify-center shrink-0 shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-pixel text-amber-950">
                ROUND 2 FINALIST PRESENTATION STAGE
              </h3>
              <p className="text-[11px] font-retro text-amber-800">
                Evaluate finalists on their live pitch, Scratch code walkthrough, technical Q&A, and squad dynamics (100 PTS total).
              </p>
            </div>
          </div>
          <span className="text-[10px] font-pixel px-2.5 py-1 rounded-lg bg-amber-200/80 text-amber-900 border border-amber-300 font-bold shrink-0">
            {totalFinalistsCount} Finalist Squads Qualified
          </span>
        </div>
      )}

      {/* Round 1 Official Rubric Reference Card */}
      {!isViewingRound2 && (
        <div className="bg-[#0f172a] text-white rounded-3xl border-2 border-emerald-500/40 p-5 sm:p-6 shadow-xl space-y-4 transition-all">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold font-pixel text-white tracking-wide">
                  ROUND 1 RUBRIC
                </h2>
                <p className="text-xs font-retro text-emerald-400">
                  Build Challenge — 100 Points Total
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRubricGuide(!showRubricGuide)}
              className="text-xs font-retro text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showRubricGuide ? 'Hide Details' : 'Show Details'}</span>
              {showRubricGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showRubricGuide && (
            <div className="space-y-3 pt-1 animate-fadeIn">
              
              {/* Criterion 1 */}
              <div className="bg-[#1e293b]/70 border border-slate-700/80 p-4 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold font-pixel text-white tracking-tight">
                    BASIC GAME WORKING
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-pixel text-[#fb7185]">
                    40%
                  </span>
                </div>
                <p className="text-xs font-retro text-slate-400 leading-relaxed">
                  Core gameplay, controls, win/lose state, required mechanics, stability
                </p>
              </div>

              {/* Criterion 2 */}
              <div className="bg-[#1e293b]/70 border border-slate-700/80 p-4 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold font-pixel text-white tracking-tight">
                    SPRITES & VISUAL IMPLEMENTATION
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-pixel text-[#f472b6]">
                    25%
                  </span>
                </div>
                <p className="text-xs font-retro text-slate-400 leading-relaxed">
                  Appropriate sprites, backgrounds, sound, readability, animation and use of Scratch assets
                </p>
              </div>

              {/* Criterion 3 */}
              <div className="bg-[#1e293b]/70 border border-slate-700/80 p-4 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold font-pixel text-white tracking-tight">
                    CREATIVITY & GAME DESIGN
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-pixel text-[#facc15]">
                    35%
                  </span>
                </div>
                <p className="text-xs font-retro text-slate-400 leading-relaxed">
                  Originality, engagement, clever mechanics, challenge balance and interpretation of the statement
                </p>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Live Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isViewingRound2 ? "Search finalist name or challenge..." : "Search squad name or challenge..."}
            className="w-full pl-10 pr-3 py-2 rounded-xl border-2 border-slate-200 text-xs sm:text-sm font-retro text-[#1e293b] focus:border-[#4e97fe] outline-none shadow-inner"
          />
        </div>

        {/* Right: Challenge selector + Status Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {uniqueChallenges.length > 0 && !isViewingRound2 && (
            <select
              value={selectedChallengeFilter}
              onChange={(e) => setSelectedChallengeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-retro text-[#1e293b] focus:border-[#4e97fe] outline-none bg-white cursor-pointer"
            >
              <option value="ALL">All Themes ({teams.length})</option>
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
                  ? isViewingRound2 ? 'bg-[#f6ab3c] text-white shadow-xs' : 'bg-[#4e97fe] text-white shadow-xs'
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
            {draftSquadsCount > 0 && (
              <button
                onClick={() => setStatusFilter('DRAFT')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 ${
                  statusFilter === 'DRAFT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 hover:text-blue-900'
                }`}
              >
                <Save className="w-2.5 h-2.5" />
                Drafts ({draftSquadsCount})
              </button>
            )}
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
          <h3 className="text-sm font-bold font-pixel text-[#1e293b]">
            {isViewingRound2 ? 'NO FINALISTS FOUND' : 'NO SQUADS MATCHED'}
          </h3>
          <p className="text-xs font-retro text-[#64748b]">
            {isViewingRound2
              ? 'Organizers have not designated finalists yet, or your filter returned 0 results.'
              : 'Try clearing your search or filter parameters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((t) => {
            const r1Sub = t.r1Submission || t.submissions?.find((s) => s.roundNumber === 1);
            const r2Sub = t.r2Submission || t.submissions?.find((s) => s.roundNumber === 2);
            const myR1Score = t.myR1Score || t.round1Scores?.find((sc) => sc.judgeId === user?.id);
            const myR2Score = t.myR2Score || t.round2Scores?.find((sc) => sc.judgeId === user?.id);
            const activeSub = isViewingRound2 ? (r2Sub || r1Sub) : r1Sub;
            const currentScore = isViewingRound2 ? myR2Score : myR1Score;
            const isFinalSubmitted = activeSub?.status === 'SUBMITTED' || activeSub?.status === 'LATE';

            // Precise determination between Final Graded vs Draft Graded vs Unscored
            const isGraded = Boolean(currentScore && currentScore.isFinal);
            const isDraftScore = Boolean(currentScore && !currentScore.isFinal);

            const saveTime = formatTimestamp(activeSub?.submittedAt || activeSub?.createdAt);
            const scoreTime = formatTimestamp(currentScore?.updatedAt || currentScore?.createdAt);

            return (
              <div
                key={t.id}
                className={`rounded-2xl p-5 sm:p-6 border-4 transition-all duration-300 flex flex-col justify-between ${
                  isGraded
                    ? 'bg-slate-50/75 border-slate-300/80 shadow-[2px_2px_0px_#cbd5e1] opacity-60 hover:opacity-100 hover:bg-white hover:border-[#bad6fc] hover:shadow-[6px_6px_0px_#bad6fc] hover:-translate-y-1'
                    : isDraftScore
                    ? 'bg-amber-50/40 border-amber-300 shadow-[4px_4px_0px_#fde68a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#f59e0b]'
                    : isViewingRound2
                    ? 'bg-gradient-to-b from-white to-[#fffcf5] border-[#f6ab3c] shadow-[4px_4px_0px_#fde68a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#f6ab3c]'
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
                          FINAL GRADED
                        </span>
                      )}
                      {isDraftScore && (
                        <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold flex items-center gap-1">
                          <Save className="w-2.5 h-2.5 text-amber-600" />
                          DRAFT SCORED
                        </span>
                      )}
                      {t.isFinalist && (
                        <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-[#ffbe00] text-[#141720] font-black shrink-0 flex items-center gap-1 shadow-xs">
                          <Trophy className="w-2.5 h-2.5 text-[#141720]" />
                          FINALIST
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Team Name & Presentation Slot */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b] leading-tight">
                        {t.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-retro text-[#64748b] font-bold">
                          CODE: {t.accessCode || t.id.slice(0, 8).toUpperCase()}
                        </span>
                        {isViewingRound2 && t.r2PresentationSlot && (
                          <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                            SLOT #{t.r2PresentationSlot}
                          </span>
                        )}
                      </div>
                    </div>
                    {t.members?.length > 0 && (
                      <span className="text-[10px] font-retro text-[#64748b] bg-slate-100 px-2 py-0.5 rounded-lg font-medium shrink-0 flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        {t.members.length} {t.members.length === 1 ? 'member' : 'members'}
                      </span>
                    )}
                  </div>

                  {/* Historical Round 1 Grade (When in Round 2 Mode) */}
                  {isViewingRound2 && (
                    <div className="mt-2.5 p-2 rounded-lg bg-[#f0f7ff] border border-[#bad6fc] flex items-center justify-between text-xs font-retro">
                      <span className="text-[#64748b] font-pixel text-[10px] uppercase flex items-center gap-1">
                        <Award className="w-3 h-3 text-[#4e97fe]" /> Round 1 Grade:
                      </span>
                      <span className="font-bold font-pixel text-xs text-[#4e97fe]">
                        {t.round1Score ? `${t.round1Score} PTS` : 'Ungraded'}
                      </span>
                    </div>
                  )}

                  {/* Rich Submission Details Box */}
                  <div className="mt-3 p-3 rounded-xl bg-[#f8fbff] border border-slate-200 space-y-2.5">
                    
                    {/* Header line: Submission state + Save timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-retro text-[#64748b] font-bold">Submission Status:</span>
                      {activeSub ? (
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
                              ? 'LATE SUBMITTED'
                              : 'FINAL SUBMITTED'
                            : 'DRAFT SAVED'}
                        </span>
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
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-xs font-retro text-[#334155] leading-relaxed line-clamp-2 break-all break-words">
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
                    <span className="text-[#64748b]">
                      {isViewingRound2 ? 'Your R2 Pitch Score:' : 'Your R1 Sprint Score:'}
                    </span>
                    {isGraded ? (
                      <div className="text-right">
                        <span className="font-pixel text-xs text-emerald-700 font-bold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {currentScore.totalScore} / 100 PTS
                        </span>
                        {scoreTime && (
                          <span className="text-[10px] font-retro text-[#64748b] block mt-0.5">
                            Finalized at {scoreTime}
                          </span>
                        )}
                      </div>
                    ) : isDraftScore ? (
                      <div className="text-right">
                        <span className="font-pixel text-xs text-amber-700 font-bold flex items-center justify-end gap-1">
                          <Save className="w-3.5 h-3.5 text-amber-600" />
                          DRAFT: {currentScore.totalScore} / 100 PTS
                        </span>
                        {scoreTime && (
                          <span className="text-[10px] font-retro text-[#64748b] block mt-0.5">
                            Draft saved at {scoreTime}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-pixel text-[10px] text-slate-500 font-bold">
                        NOT SCORED
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  {isViewingRound2 ? (
                    <button
                      onClick={() => openEvaluation(t, 2)}
                      className={`w-full py-2.5 rounded-xl text-xs font-pixel transition-all flex items-center justify-center gap-1.5 cursor-pointer font-black ${
                        isGraded
                          ? 'bg-[#f6ab3c] hover:bg-[#e69828] text-white shadow-[3px_3px_0px_#a4640c]'
                          : isDraftScore
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-[3px_3px_0px_#b45309]'
                          : 'bg-[#f6ab3c] hover:bg-[#e69828] text-white shadow-[3px_3px_0px_#a4640c]'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>
                        {isGraded
                          ? 'UPDATE ROUND 2 SCORE'
                          : isDraftScore
                          ? 'RESUME DRAFT EVALUATION'
                          : 'EVALUATE ROUND 2 PITCH'}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openEvaluation(t, 1)}
                      className={`w-full py-2.5 rounded-xl text-xs font-pixel transition-all flex items-center justify-center gap-1.5 cursor-pointer font-black ${
                        isGraded
                          ? 'bg-[#4e97fe] hover:bg-[#3c86ee] text-white shadow-[3px_3px_0px_#2463bf]'
                          : isDraftScore
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-[3px_3px_0px_#b45309]'
                          : 'bg-[#4e97fe] hover:bg-[#3c86ee] text-white shadow-[3px_3px_0px_#2463bf]'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>
                        {isGraded
                          ? 'UPDATE ROUND 1 SCORE'
                          : isDraftScore
                          ? 'RESUME DRAFT EVALUATION'
                          : 'EVALUATE ROUND 1 SPRINT'}
                      </span>
                    </button>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Evaluation Rubric Modals */}
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
