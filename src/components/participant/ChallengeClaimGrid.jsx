import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import socketClient from '../../lib/socket.js';
import ChallengeDetailModal from './ChallengeDetailModal.jsx';
import ChallengeEditorModal from '../organizer/ChallengeEditorModal.jsx';
import {
  Gamepad2,
  Lock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Info,
  Eye,
  Plus,
  Edit,
  Globe,
  EyeOff,
  Sparkles,
  Shield,
  Search,
  Filter,
  Award,
} from 'lucide-react';

export default function ChallengeClaimGrid({ onChallengeClaimed }) {
  const { user, team, refreshSession } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [isReleased, setIsReleased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [claimError, setClaimError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');

  // Modals
  const [selectedModalChallenge, setSelectedModalChallenge] = useState(null);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [challengeToEdit, setChallengeToEdit] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const isOrganizer = user?.role === 'ORGANIZER';

  const fetchChallenges = async () => {
    try {
      const res = await api.get('/challenges');
      if (res && typeof res === 'object') {
        setIsReleased(Boolean(res.isReleased));
        setChallenges(res.challenges || []);
      } else if (Array.isArray(res)) {
        setIsReleased(true);
        setChallenges(res);
      }
    } catch (err) {
      console.error('Failed to load challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();

    const handleStageChange = () => fetchChallenges();
    const handleListUpdate = () => fetchChallenges();
    const handleSeatUpdate = (payload) => {
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === payload.challengeId
            ? {
                ...c,
                claimedCount: payload.claimedCount,
                maxCapacity: payload.maxCapacity,
                remainingSeats: payload.remainingSeats,
                isFull: payload.remainingSeats <= 0,
              }
            : c
        )
      );

      setSelectedModalChallenge((current) => {
        if (current && current.id === payload.challengeId) {
          return {
            ...current,
            claimedCount: payload.claimedCount,
            maxCapacity: payload.maxCapacity,
            remainingSeats: payload.remainingSeats,
            isFull: payload.remainingSeats <= 0,
          };
        }
        return current;
      });
    };

    const handleScoreUpdate = () => fetchChallenges();
    const handleSubmissionUpdate = () => fetchChallenges();

    socketClient.on('stage:changed', handleStageChange);
    socketClient.on('challenge:list_updated', handleListUpdate);
    socketClient.on('challenge:seat_updated', handleSeatUpdate);
    socketClient.on('score:updated', handleScoreUpdate);
    socketClient.on('submission:updated', handleSubmissionUpdate);

    return () => {
      socketClient.off('stage:changed', handleStageChange);
      socketClient.off('challenge:list_updated', handleListUpdate);
      socketClient.off('challenge:seat_updated', handleSeatUpdate);
      socketClient.off('score:updated', handleScoreUpdate);
      socketClient.off('submission:updated', handleSubmissionUpdate);
    };
  }, []);

  const handleClaim = async (challenge) => {
    setClaimError('');
    setClaimingId(challenge.id);

    try {
      const res = await api.post(`/challenges/${challenge.id}/claim`, {});
      await refreshSession();
      await fetchChallenges();
      setSelectedModalChallenge(null);
      if (onChallengeClaimed) onChallengeClaimed(res.challenge);
    } catch (err) {
      setClaimError(err.message || 'Failed to claim challenge.');
    } finally {
      setClaimingId(null);
    }
  };

  // Organizer Actions
  const handleTogglePublish = async (e, challenge) => {
    e.stopPropagation();
    setTogglingId(challenge.id);
    setClaimError('');

    try {
      const res = await api.patch(`/challenges/${challenge.id}/toggle-publish`, {});
      setActionSuccess(res.message);
      setTimeout(() => setActionSuccess(''), 3000);
      await fetchChallenges();
    } catch (err) {
      setClaimError(err.message || 'Failed to toggle publish status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleBulkPublish = async (publishAll) => {
    setClaimError('');
    try {
      const res = await api.post('/challenges/bulk-publish', { publishAll });
      setActionSuccess(res.message);
      setTimeout(() => setActionSuccess(''), 3000);
      await fetchChallenges();
    } catch (err) {
      setClaimError(err.message || 'Failed to bulk update challenges.');
    }
  };

  const handleOpenCreateModal = () => {
    setChallengeToEdit(null);
    setEditorModalOpen(true);
  };

  const handleOpenEditModal = (e, challenge) => {
    e.stopPropagation();
    setChallengeToEdit(challenge);
    setEditorModalOpen(true);
  };

  const hasTeamClaimed = Boolean(team?.challengeId);
  const publishedCount = challenges.filter((c) => c.isPublished).length;

  // Filter & Search Logic
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      // Search
      const matchesSearch =
        searchQuery.trim() === '' ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase());

      // Category
      const matchesCategory =
        selectedCategory === 'ALL' || c.category.toLowerCase().includes(selectedCategory.toLowerCase());

      // Difficulty
      const matchesDifficulty =
        selectedDifficulty === 'ALL' || c.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [challenges, searchQuery, selectedCategory, selectedDifficulty]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#4e97fe] shadow-[6px_6px_0px_#bad6fc] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4e97fe] to-[#307fef] text-white flex items-center justify-center shadow-[3px_3px_0px_#2463bf] shrink-0 border-2 border-white">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                PROBLEM STATEMENTS CATALOG
              </h1>
              <span className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                !isOrganizer && (!isReleased || challenges.length === 0 || publishedCount === 0)
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-[#ffbe00] text-[#141720]'
              }`}>
                {isOrganizer
                  ? `${challenges.length} QUESTS`
                  : !isReleased || challenges.length === 0 || publishedCount === 0
                  ? 'UNRELEASED'
                  : `${challenges.length} QUESTS`}
              </span>
            </div>
            <p className="text-xs font-retro text-[#64748b] mt-0.5">
              Review all problem statements and claim your squad's quest on a first-come, first-served basis.
            </p>
          </div>
        </div>

        {/* Live Search Input (Visible when challenges are released or for organizer) */}
        {(isOrganizer || (isReleased && challenges.length > 0)) && (
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quests or keywords..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border-2 border-slate-200 text-xs sm:text-sm font-retro text-[#1e293b] focus:border-[#4e97fe] outline-none shadow-inner"
            />
          </div>
        )}
      </div>

      {/* 2. Organizer Control Hub (Visible only to Organizers) */}
      {isOrganizer && (
        <div className="bg-white rounded-2xl p-5 border-4 border-[#f6ab3c] shadow-[6px_6px_0px_#fde68a] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#f6ab3c] text-white flex items-center justify-center font-bold shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold font-pixel text-[#1e293b]">
                  ORGANIZER CHALLENGE MANAGEMENT
                </h3>
                <p className="text-xs font-retro text-[#64748b]">
                  Release problem statements individually, edit details, or create custom quests.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1 rounded-lg bg-[#f0f7ff] border border-[#bad6fc] text-xs font-pixel text-[#4e97fe]">
                {publishedCount} / {challenges.length} RELEASED
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-[#f6ab3c] hover:bg-[#e69828] text-white text-xs font-pixel transition-all shadow-[2px_2px_0px_#a4640c] flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>CREATE PROBLEM STATEMENT</span>
            </button>

            <button
              onClick={() => handleBulkPublish(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-pixel transition-all shadow-[2px_2px_0px_#065f46] flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>RELEASE ALL ({challenges.length})</span>
            </button>

            <button
              onClick={() => handleBulkPublish(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] border border-slate-300 text-xs font-pixel transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>HIDE ALL</span>
            </button>
          </div>
        </div>
      )}

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs font-retro flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {claimError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-700 text-xs font-retro flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{claimError}</span>
        </div>
      )}

      {/* 3. Filters Bar (Visible when challenges are released or for organizer) */}
      {(isOrganizer || (isReleased && challenges.length > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/60 p-3 rounded-xl border border-[#bad6fc]">
          
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-pixel">
            <span className="text-[10px] text-[#64748b] mr-1 uppercase">CATEGORY:</span>
            {['ALL', 'Arcade', 'Platformer', 'Strategy', 'Simulation', 'Puzzle'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#4e97fe] text-white shadow-[2px_2px_0px_#2463bf]'
                    : 'bg-white text-[#64748b] border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-1.5 text-xs font-pixel">
            <span className="text-[10px] text-[#64748b] uppercase">DIFFICULTY:</span>
            {['ALL', 'Beginner', 'Intermediate', 'Advanced'].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
                  selectedDifficulty === diff
                    ? 'bg-[#ffbe00] text-[#141720] shadow-[2px_2px_0px_#a4640c]'
                    : 'bg-white text-[#64748b] border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {diff.toUpperCase()}
              </button>
            ))}
          </div>

        </div>
      )}

      {/* 4. Challenges Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-white/70 animate-pulse border-2 border-[#bad6fc]" />
          ))}
        </div>
      ) : !isOrganizer && (!isReleased || challenges.length === 0 || publishedCount === 0) ? (
        /* Sealed Vault View for Students when challenges have not been released */
        <div className="bg-white rounded-3xl p-10 sm:p-14 border-4 border-[#bad6fc] text-center shadow-[6px_6px_0px_#bad6fc] max-w-xl mx-auto my-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#eef4fc] border-2 border-[#bad6fc] flex items-center justify-center mx-auto text-[#4e97fe] shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-pixel font-bold uppercase tracking-wider">
              STATUS: NOT RELEASED
            </span>
            <h2 className="text-lg sm:text-2xl font-bold text-[#1e293b] font-pixel tracking-tight">
              CHALLENGES NOT RELEASED YET
            </h2>
            <p className="text-xs sm:text-sm font-retro text-[#64748b] max-w-md mx-auto leading-relaxed pt-1">
              The competition problem statements have not been released by the organizers yet. When the kickoff begins and challenges are released, all quests will unlock right here automatically in real time.
            </p>
          </div>
        </div>
      ) : isOrganizer && challenges.length === 0 ? (
        /* Organizer empty state */
        <div className="bg-white rounded-2xl p-10 border-4 border-[#bad6fc] text-center shadow-sm max-w-md mx-auto my-6 space-y-3">
          <Gamepad2 className="w-10 h-10 text-[#64748b] mx-auto" />
          <h3 className="text-sm font-bold font-pixel text-[#1e293b]">NO PROBLEM STATEMENTS CREATED</h3>
          <p className="text-xs font-retro text-[#64748b]">
            You have not added any challenges yet. Click "+ CREATE PROBLEM STATEMENT" above to create one.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-2 px-4 py-2 rounded-xl bg-[#f6ab3c] hover:bg-[#e69828] text-white text-xs font-pixel shadow-[2px_2px_0px_#a4640c] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE FIRST QUEST</span>
          </button>
        </div>
      ) : filteredChallenges.length === 0 ? (
        /* Search/Filter no-match state */
        <div className="bg-white rounded-2xl p-10 border-4 border-[#bad6fc] text-center shadow-sm max-w-md mx-auto my-6 space-y-2">
          <Search className="w-10 h-10 text-[#64748b] mx-auto" />
          <h3 className="text-sm font-bold font-pixel text-[#1e293b]">NO QUESTS MATCHED YOUR FILTERS</h3>
          <p className="text-xs font-retro text-[#64748b]">Try adjusting your search terms or category/difficulty filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedDifficulty('ALL');
            }}
            className="mt-2 px-3 py-1.5 rounded-lg bg-[#4e97fe] text-white text-xs font-pixel cursor-pointer shadow-xs hover:bg-[#307fef]"
          >
            RESET FILTERS
          </button>
        </div>
      ) : (
        /* Unlocked Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredChallenges.map((c) => {
            const isClaimedByMe = team?.challengeId === c.id;
            const isOtherChallengeFaded = hasTeamClaimed && !isClaimedByMe && !isOrganizer;
            const percentFilled = (c.claimedCount / c.maxCapacity) * 100;
            const isPublished = c.isPublished !== false;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedModalChallenge(c)}
                className={`bg-white rounded-2xl p-5 sm:p-6 border-4 transition-all duration-200 flex flex-col justify-between shadow-[4px_4px_0px_#bad6fc] cursor-pointer group hover:-translate-y-1 hover:shadow-[6px_6px_0px_#bad6fc] ${
                  isClaimedByMe
                    ? 'border-[#10b981] ring-4 ring-[#10b981]/25 opacity-100 shadow-[6px_6px_0px_#6ee7b7]'
                    : isOtherChallengeFaded
                    ? 'border-slate-200 opacity-60 hover:opacity-95 hover:border-[#bad6fc]'
                    : isOrganizer && !isPublished
                    ? 'border-dashed border-amber-300 bg-amber-50/30'
                    : c.isFull
                    ? 'border-slate-200 opacity-75 bg-slate-50'
                    : 'border-[#bad6fc] hover:border-[#4e97fe]'
                }`}
              >
                <div>
                  
                  {/* Top Meta: Category + Difficulty / Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-pixel px-2.5 py-1 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase font-bold">
                      {c.category}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      {isClaimedByMe && (
                        <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-black animate-fadeIn flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> YOUR QUEST
                        </span>
                      )}
                      {isOrganizer && (
                        <span
                          className={`text-[9px] font-pixel px-2 py-0.5 rounded font-black ${
                            isPublished
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {isPublished ? 'RELEASED' : 'UNPUBLISHED'}
                        </span>
                      )}
                      <span className="text-xs font-retro text-[#64748b] font-bold">
                        {c.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Challenge Title */}
                  <h3 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b] leading-snug group-hover:text-[#4e97fe] transition-colors line-clamp-1">
                    {c.title}
                  </h3>

                  {/* Short Summary */}
                  <p className="text-xs sm:text-sm font-retro text-[#475569] mt-2 line-clamp-2 leading-relaxed">
                    {c.shortDescription}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-3.5">
                  
                  {/* Capacity Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-retro text-[#64748b] mb-1">
                      <span>Seats Claimed</span>
                      <span className="font-bold text-[#1e293b] font-pixel text-[10px]">
                        {c.claimedCount} / {c.maxCapacity} Teams
                      </span>
                    </div>
                    <div className="w-full bg-[#eef4fc] h-2.5 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full transition-all duration-300 ${
                          c.isFull ? 'bg-rose-500' : 'bg-[#4e97fe]'
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  {/* Live Grading & Squads Status Section (Visible only to Organizers & Judges, hidden from Students) */}
                  {(isOrganizer || user?.role === 'JUDGE') && (
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-pixel text-[#64748b] uppercase block font-bold">
                          ASSIGNED SQUADS & GRADES ({c.teams?.length || c.claimedCount} / {c.maxCapacity}):
                        </span>
                      </div>

                      {c.teams && c.teams.length > 0 ? (
                        <div className="space-y-1">
                          {c.teams.map((t) => {
                            const hasScore = t.round1Score !== null && t.round1Score !== undefined;
                            const hasSub = t.submissions?.some((s) => s.roundNumber === 1 && s.status === 'SUBMITTED');

                            return (
                              <div
                                key={t.id}
                                className="px-2.5 py-1.5 rounded-lg bg-[#f8fbff] border border-[#bad6fc] text-xs flex items-center justify-between gap-1.5 shadow-2xs"
                              >
                                <span className="font-pixel text-[9px] text-[#1e293b] font-bold truncate">
                                  {t.name}
                                </span>

                                {hasScore ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-pixel text-[8px] font-black shrink-0 animate-fadeIn">
                                    <Award className="w-2.5 h-2.5 text-emerald-700" /> {t.round1Score} / 100
                                  </span>
                                ) : hasSub ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-pixel text-[8px] font-bold shrink-0 animate-pulse">
                                    GRADING
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-pixel text-[8px] shrink-0">
                                    BUILDING
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[10px] font-retro text-[#94a3b8] italic block py-0.5">
                          No squads claimed yet (0 / {c.maxCapacity})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Organizer Control Actions */}
                  {isOrganizer ? (
                    <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Release / Unpublish Toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePublish(e, c)}
                        disabled={togglingId === c.id}
                        className={`w-full py-2.5 rounded-xl text-xs font-pixel transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isPublished
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-[2px_2px_0px_#065f46]'
                        }`}
                      >
                        {togglingId === c.id ? (
                          <span>UPDATING...</span>
                        ) : isPublished ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>UNPUBLISH / HIDE</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3.5 h-3.5" />
                            <span>RELEASE TO TEAMS</span>
                          </>
                        )}
                      </button>

                      {/* Edit & View Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModal(e, c)}
                          className="py-1.5 rounded-lg bg-[#f0f7ff] hover:bg-[#e0efff] text-[#4e97fe] border border-[#bad6fc] text-[10px] font-pixel transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>EDIT</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedModalChallenge(c)}
                          className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#475569] border border-slate-200 text-[10px] font-pixel transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>DETAILS</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Participant View & Claim Button */
                    <div>
                      {isClaimedByMe ? (
                        <div className="w-full py-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-pixel text-center flex items-center justify-center gap-1.5 font-bold shadow-sm">
                          <CheckCircle2 className="w-4 h-4" /> YOUR SQUAD'S QUEST
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedModalChallenge(c);
                          }}
                          className="w-full py-2.5 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#2463bf] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>VIEW</span>
                        </button>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Challenge Detail & Confirmation Modal (Participant View) */}
      <ChallengeDetailModal
        challenge={selectedModalChallenge}
        isOpen={Boolean(selectedModalChallenge)}
        onClose={() => setSelectedModalChallenge(null)}
        onConfirmClaim={handleClaim}
        isClaiming={claimingId !== null}
        userRole={user?.role}
        isClaimedByMe={Boolean(selectedModalChallenge && team?.challengeId === selectedModalChallenge.id)}
        hasTeamClaimed={hasTeamClaimed}
      />

      {/* Challenge Editor / Creator Modal (Organizer View) */}
      {isOrganizer && (
        <ChallengeEditorModal
          isOpen={editorModalOpen}
          onClose={() => {
            setEditorModalOpen(false);
            setChallengeToEdit(null);
          }}
          challengeToEdit={challengeToEdit}
          onChallengeSaved={async () => {
            setActionSuccess(challengeToEdit ? 'Problem statement updated!' : 'New problem statement created!');
            setTimeout(() => setActionSuccess(''), 3000);
            await fetchChallenges();
          }}
        />
      )}

    </div>
  );
}
