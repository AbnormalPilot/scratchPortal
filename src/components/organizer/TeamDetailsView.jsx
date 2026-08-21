import React, { useState, useEffect } from 'react';
import api from '../../lib/api.js';
import socketClient from '../../lib/socket.js';
import ChallengeEditorModal from './ChallengeEditorModal.jsx';
import {
  Users,
  Search,
  Filter,
  ExternalLink,
  FileVideo,
  CheckCircle2,
  Clock,
  Sparkles,
  Trophy,
  Award,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Lock,
  Save,
  FileText,
  X,
  Play,
  Send,
  Eye,
  RefreshCw,
  Crown,
  Layers,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Star,
  Trash2,
  Edit3,
  Plus,
  UserMinus,
} from 'lucide-react';

export default function TeamDetailsView({ onNavigateLeaderboard, onNavigateMissionControl }) {
  const [teams, setTeams] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTabMode, setActiveTabMode] = useState('squads'); // 'squads' | 'challenges'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'SUBMITTED' | 'DRAFT' | 'PENDING' | 'FINALISTS'
  const [challengeFilter, setChallengeFilter] = useState('ALL');
  const [selectedTeamModal, setSelectedTeamModal] = useState(null);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(null); // { url, title, fileName }
  const [toggleLoadingId, setToggleLoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Challenge Management State
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeToEdit, setChallengeToEdit] = useState(null);
  const [challengeToDelete, setChallengeToDelete] = useState(null);
  const [challengeDeleteWarning, setChallengeDeleteWarning] = useState('');
  const [challengeDeleting, setChallengeDeleting] = useState(false);

  // Unassign Team from Challenge State
  const [unassignTeamModal, setUnassignTeamModal] = useState(null); // { teamId, teamName, challengeTitle }
  const [unassignLoadingId, setUnassignLoadingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsData, challengesData] = await Promise.all([
        api.get('/admin/teams'),
        api.get('/challenges'),
      ]);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setChallenges(Array.isArray(challengesData) ? challengesData : []);
    } catch (err) {
      console.error('Failed to load teams for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFinalist = async (team) => {
    try {
      setToggleLoadingId(team.id);
      const res = await api.post(`/admin/teams/${team.id}/toggle-finalist`, {});
      setToastMessage({ type: 'success', text: res.message });

      // Optimistically update: if turning finalist, unmark any other squad in the same challenge
      const nextState = !team.isFinalist;
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id === team.id) {
            return { ...t, isFinalist: nextState };
          }
          if (
            nextState &&
            ((team.challengeId && t.challengeId === team.challengeId) ||
              (team.challenge?.id && (t.challengeId === team.challenge.id || t.challenge?.id === team.challenge.id)))
          ) {
            return { ...t, isFinalist: false, r2PresentationSlot: null };
          }
          return t;
        })
      );
      if (selectedTeamModal?.id === team.id) {
        setSelectedTeamModal((prev) => (prev ? { ...prev, isFinalist: nextState } : null));
      }
      setTimeout(() => setToastMessage(null), 4000);
      await fetchData();
    } catch (err) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to toggle finalist status.' });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setToggleLoadingId(null);
    }
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = () => fetchData();
    socketClient.on('submission:updated', handleUpdate);
    socketClient.on('score:updated', handleUpdate);
    socketClient.on('stage:changed', handleUpdate);
    socketClient.on('challenge:list_updated', handleUpdate);
    socketClient.on('challenge:seat_updated', handleUpdate);

    return () => {
      socketClient.off('submission:updated', handleUpdate);
      socketClient.off('score:updated', handleUpdate);
      socketClient.off('stage:changed', handleUpdate);
      socketClient.off('challenge:list_updated', handleUpdate);
      socketClient.off('challenge:seat_updated', handleUpdate);
    };
  }, []);

  // Challenge Management Handlers
  const handleOpenCreateChallenge = () => {
    setChallengeToEdit(null);
    setShowChallengeModal(true);
  };

  const handleOpenEditChallenge = (challenge) => {
    setChallengeToEdit(challenge);
    setShowChallengeModal(true);
  };

  const handlePromptDeleteChallenge = (challenge) => {
    setChallengeToDelete(challenge);
    setChallengeDeleteWarning('');
  };

  const handleConfirmDeleteChallenge = async (force = false) => {
    if (!challengeToDelete) return;
    setChallengeDeleting(true);

    try {
      const res = await api.delete(`/challenges/${challengeToDelete.id}${force ? '?force=true' : ''}`);
      setToastMessage({
        type: 'success',
        text: res.message || `Problem statement "${challengeToDelete.title}" deleted successfully.`,
      });
      setTimeout(() => setToastMessage(null), 4000);
      setChallengeToDelete(null);
      setChallengeDeleteWarning('');
      await fetchData();
    } catch (err) {
      if (err.hasClaimedTeams || err.message?.includes('claimed')) {
        setChallengeDeleteWarning(err.message || 'Squads have claimed this quest.');
      } else {
        setToastMessage({ type: 'error', text: err.message || 'Failed to delete challenge.' });
        setTimeout(() => setToastMessage(null), 4000);
        setChallengeToDelete(null);
      }
    } finally {
      setChallengeDeleting(false);
    }
  };

  // Unassign Team from Challenge Handlers
  const handlePromptUnassignChallenge = (team) => {
    setUnassignTeamModal({
      teamId: team.id,
      teamName: team.name,
      challengeTitle: team.challenge?.title || 'their claimed problem statement',
    });
  };

  const handleConfirmUnassignChallenge = async () => {
    if (!unassignTeamModal) return;
    const { teamId, teamName, challengeTitle } = unassignTeamModal;
    setUnassignLoadingId(teamId);

    try {
      const res = await api.post(`/admin/teams/${teamId}/unassign-challenge`, {});
      setToastMessage({
        type: 'success',
        text: res.message || `Squad "${teamName}" was removed from "${challengeTitle}". The seat is now free.`,
      });
      setTimeout(() => setToastMessage(null), 4000);

      // Update selectedTeamModal if currently viewing this squad
      if (selectedTeamModal?.id === teamId) {
        setSelectedTeamModal((prev) =>
          prev
            ? {
                ...prev,
                challengeId: null,
                challenge: null,
                challengeClaimedAt: null,
                isFinalist: false,
                r2PresentationSlot: null,
              }
            : null
        );
      }

      setUnassignTeamModal(null);
      await fetchData();
    } catch (err) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to remove squad from challenge.' });
      setTimeout(() => setToastMessage(null), 4000);
      setUnassignTeamModal(null);
    } finally {
      setUnassignLoadingId(null);
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Helper to reliably find the active Round 1 submission (prioritizing FINAL submission over draft)
  const getLatestR1Submission = (submissions) => {
    if (!submissions || !Array.isArray(submissions) || submissions.length === 0) return null;
    const r1Subs = submissions.filter((s) => s.roundNumber === 1);
    if (r1Subs.length === 0) return null;
    // 1. If there is a finalized/submitted project, ALWAYS prioritize that
    const finalized = r1Subs.find((s) => s.status === 'SUBMITTED' || s.status === 'LATE');
    if (finalized) return finalized;
    // 2. Otherwise pick the newest draft revision by timestamp
    return [...r1Subs].sort(
      (a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime()
    )[0];
  };

  // Stats Counters
  const totalTeams = teams.length;
  const finalSubmittedCount = teams.filter((t) =>
    t.submissions?.some((s) => s.roundNumber === 1 && (s.status === 'SUBMITTED' || s.status === 'LATE'))
  ).length;
  const draftOnlyCount = teams.filter(
    (t) =>
      t.submissions?.some((s) => s.roundNumber === 1 && s.status === 'DRAFT') &&
      !t.submissions?.some((s) => s.roundNumber === 1 && (s.status === 'SUBMITTED' || s.status === 'LATE'))
  ).length;
  const pendingCount = teams.filter((t) => !t.submissions || t.submissions.length === 0).length;
  const totalMembers = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
  const scoredCount = teams.filter((t) => t.round1Scores && t.round1Scores.length > 0).length;

  const uniqueChallenges = Array.from(
    new Set(teams.map((t) => t.challenge?.title).filter(Boolean))
  );

  // Filter Logic
  const filteredTeams = teams.filter((t) => {
    const r1Sub = getLatestR1Submission(t.submissions);
    const hasFinalSub = r1Sub && (r1Sub.status === 'SUBMITTED' || r1Sub.status === 'LATE');
    const hasDraftSub = r1Sub && r1Sub.status === 'DRAFT' && !hasFinalSub;
    const isPending = !r1Sub;

    // Search filter
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.accessCode?.toLowerCase().includes(search.toLowerCase()) ||
      t.challenge?.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.members?.some((m) => m.fullName.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));

    // Challenge filter
    const matchesChallenge = challengeFilter === 'ALL' || t.challenge?.title === challengeFilter;

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'SUBMITTED') matchesStatus = hasFinalSub;
    else if (statusFilter === 'DRAFT') matchesStatus = hasDraftSub;
    else if (statusFilter === 'PENDING') matchesStatus = isPending;
    else if (statusFilter === 'FINALISTS') matchesStatus = t.isFinalist;
    else if (statusFilter === 'SCORED') matchesStatus = t.round1Scores?.length > 0;

    return matchesSearch && matchesChallenge && matchesStatus;
  });

  return (
    <div className="space-y-6">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border-2 flex items-center gap-2 text-xs font-pixel ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
                : 'bg-rose-500 text-white border-rose-400 shadow-rose-500/20'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Video Lightbox Modal */}
      {activeVideoModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setActiveVideoModal(null)}
        >
          <div
            className="w-full max-w-3xl bg-slate-900 rounded-3xl border-4 border-[#4e97fe] shadow-2xl p-5 space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <FileVideo className="w-5 h-5 text-[#4e97fe]" />
                <div>
                  <h3 className="text-sm font-bold font-pixel">{activeVideoModal.title}</h3>
                  <p className="text-[11px] font-retro text-slate-400">
                    {activeVideoModal.fileName || 'Gameplay Video Demo'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[300px] max-h-[500px]">
              {activeVideoModal.url.startsWith('/uploads/') ? (
                <video
                  src={activeVideoModal.url}
                  controls
                  autoPlay
                  className="w-full h-full max-h-[480px] object-contain"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <Play className="w-12 h-12 text-[#ffbe00] mx-auto" />
                  <p className="text-xs font-retro text-slate-300">External Video Link (YouTube / Google Drive / Loom)</p>
                  <a
                    href={activeVideoModal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-pixel font-bold shadow-md transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>OPEN EXTERNAL VIDEO IN NEW TAB ↗</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Squad Full Drilldown Modal */}
      {selectedTeamModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn overflow-y-auto"
          onClick={() => setSelectedTeamModal(null)}
        >
          <div
            className="w-full max-w-4xl bg-white rounded-3xl border-4 border-[#4e97fe] shadow-[10px_10px_0px_#bad6fc] p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4e97fe] to-[#307fef] text-white flex items-center justify-center shadow-sm shrink-0">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold font-pixel text-[#1e293b]">
                      {selectedTeamModal.name}
                    </h2>
                    {selectedTeamModal.isFinalist && (
                      <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-[#ffbe00] text-[#141720] font-black">
                        FINALIST
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-retro text-[#64748b] mt-0.5">
                    Access Code: <span className="font-mono font-bold text-[#1e293b]">{selectedTeamModal.accessCode}</span> • Team ID: <span className="font-mono text-[10px] text-slate-400">{selectedTeamModal.id}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleFinalist(selectedTeamModal)}
                  disabled={toggleLoadingId === selectedTeamModal.id}
                  className={`px-3 py-2 rounded-xl text-xs font-pixel font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                    selectedTeamModal.isFinalist
                      ? 'bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] border-2 border-amber-500 font-black'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-300'
                  }`}
                >
                  <Trophy className={`w-3.5 h-3.5 ${selectedTeamModal.isFinalist ? 'text-[#141720]' : 'text-slate-400'}`} />
                  <span>{selectedTeamModal.isFinalist ? 'ROUND 2 FINALIST (CLICK TO REMOVE)' : 'NOMINATE AS FINALIST'}</span>
                </button>

                <button
                  onClick={() => setSelectedTeamModal(null)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Challenge & Members (5 cols) */}
              <div className="md:col-span-5 space-y-5">
                
                {/* Challenge Card */}
                <div className="p-4 rounded-2xl bg-[#f8fbff] border-2 border-[#bad6fc] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase font-bold">
                      {selectedTeamModal.challenge?.category || 'General'}
                    </span>
                    <span className="text-xs font-retro font-bold text-emerald-600">
                      {selectedTeamModal.challenge?.difficulty || 'Intermediate'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold font-pixel text-[#1e293b]">
                    {selectedTeamModal.challenge?.title || 'No Challenge Claimed'}
                  </h4>
                  <p className="text-xs font-retro text-[#64748b] line-clamp-3">
                    {selectedTeamModal.challenge?.shortDescription || 'No description provided.'}
                  </p>

                  {(selectedTeamModal.challengeId || selectedTeamModal.challenge) && (
                    <div className="pt-2 border-t border-[#bad6fc]/60">
                      <button
                        type="button"
                        onClick={() => handlePromptUnassignChallenge(selectedTeamModal)}
                        disabled={unassignLoadingId === selectedTeamModal.id}
                        className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-pixel transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold disabled:opacity-50"
                        title="Remove squad from this problem statement to let them pick another"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>REMOVE FROM QUEST (FREE SEAT)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Team Members List */}
                <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-pixel font-bold text-[#1e293b] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#4e97fe]" />
                      SQUAD MEMBERS ({selectedTeamModal.members?.length || 0})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedTeamModal.members && selectedTeamModal.members.length > 0 ? (
                      selectedTeamModal.members.map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-retro flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {m.isTeamLeader && (
                                <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Team Leader" />
                              )}
                              <span className="font-bold text-[#1e293b] truncate">{m.fullName}</span>
                            </div>
                            <span className="text-[11px] text-[#64748b] block truncate">{m.email}</span>
                          </div>
                          {m.isTeamLeader && (
                            <span className="text-[9px] font-pixel px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold shrink-0">
                              LEADER
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs font-retro text-slate-400 italic">No members assigned to this team.</p>
                    )}
                  </div>
                </div>

                {/* Judge Scores Breakdown */}
                <div className="p-4 rounded-2xl bg-[#fffdf0] border-2 border-amber-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <span className="text-xs font-pixel font-bold text-[#1e293b] flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#ffbe00]" />
                      JUDGE SCORES & FEEDBACK
                    </span>
                    <span className="text-xs font-pixel font-bold text-amber-800">
                      AVG: {selectedTeamModal.round1Score ?? '—'} / 100
                    </span>
                  </div>

                  {selectedTeamModal.round1Scores && selectedTeamModal.round1Scores.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedTeamModal.round1Scores.map((score, idx) => (
                        <div key={score.id || idx} className="p-3 rounded-xl bg-white border border-amber-200 space-y-1.5 text-xs font-retro">
                          <div className="flex items-center justify-between">
                            <span className="font-pixel text-[10px] text-[#1e293b] font-bold">
                              Judge: {score.judge?.fullName || 'Official Judge'}
                            </span>
                            <span className="font-pixel text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {score.totalScore} / 100 PTS
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-[10px] text-[#64748b] bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-center font-mono">
                            <div>Basic: <strong className="text-slate-800">{score.basicWorkingScore}</strong>/40</div>
                            <div>Visuals: <strong className="text-slate-800">{score.visualSpritesScore}</strong>/25</div>
                            <div>Creative: <strong className="text-slate-800">{score.creativityScore}</strong>/35</div>
                          </div>
                          {score.comments && (
                            <p className="text-[11px] text-[#475569] italic bg-amber-50/60 p-2 rounded-lg border border-amber-100 mt-1">
                              "{score.comments}"
                            </p>
                          )}
                          <span className="text-[9px] text-[#94a3b8] block text-right font-mono">
                            Scored at: {formatDate(score.submittedAt || score.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-retro text-amber-700 italic">No judges have evaluated this squad yet.</p>
                  )}
                </div>

              </div>

              {/* Right Column: Complete Submission Attempts (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-pixel font-bold text-[#1e293b] uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#4e97fe]" />
                    SUBMISSION HISTORY & REVISIONS ({selectedTeamModal.submissions?.length || 0})
                  </h3>
                </div>

                {selectedTeamModal.submissions && selectedTeamModal.submissions.length > 0 ? (
                  <div className="space-y-4">
                    {[...selectedTeamModal.submissions]
                      .sort((a, b) => {
                        if ((a.status === 'SUBMITTED' || a.status === 'LATE') && b.status === 'DRAFT') return -1;
                        if ((b.status === 'SUBMITTED' || b.status === 'LATE') && a.status === 'DRAFT') return 1;
                        return (
                          new Date(b.submittedAt || b.createdAt).getTime() -
                          new Date(a.submittedAt || a.createdAt).getTime()
                        );
                      })
                      .map((sub, idx) => {
                        const isFinal = sub.status === 'SUBMITTED' || sub.status === 'LATE';
                      return (
                        <div
                          key={sub.id}
                          className={`p-5 rounded-2xl border-2 transition-all space-y-3 ${
                            isFinal
                              ? 'bg-white border-emerald-300 shadow-sm'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {/* Sub Header */}
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-pixel px-2.5 py-1 rounded-lg font-bold uppercase ${
                                  isFinal
                                    ? sub.status === 'LATE'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {isFinal
                                  ? sub.status === 'LATE'
                                    ? 'LATE FINAL SUBMISSION'
                                    : 'FINAL SUBMISSION'
                                  : 'DRAFT REVISION'}
                              </span>
                              <span className="text-[10px] font-pixel text-[#64748b]">
                                Round {sub.roundNumber}
                              </span>
                            </div>

                            <span className="text-xs font-retro text-[#64748b] font-mono flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#4e97fe]" />
                              {formatDate(sub.submittedAt || sub.createdAt)}
                            </span>
                          </div>

                          {/* Scratch URL */}
                          {sub.scratchUrl && (
                            <div>
                              <span className="text-[10px] font-pixel text-[#64748b] uppercase block mb-1">
                                SCRATCH PROJECT URL:
                              </span>
                              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                <a
                                  href={sub.scratchUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-retro text-[#4e97fe] hover:underline font-bold truncate"
                                >
                                  {sub.scratchUrl}
                                </a>
                                <a
                                  href={sub.scratchUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1 rounded-lg bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] text-[10px] font-pixel font-black shrink-0 flex items-center gap-1 shadow-xs"
                                >
                                  <ExternalLink className="w-3 h-3" /> LAUNCH ↗
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Story Pitch */}
                          {sub.shortDescription && (
                            <div>
                              <span className="text-[10px] font-pixel text-[#4e97fe] uppercase block mb-1">
                                STORY PITCH & GAMEPLAY CONCEPT:
                              </span>
                              <p className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-retro text-[#1e293b] leading-relaxed">
                                {sub.shortDescription}
                              </p>
                            </div>
                          )}

                          {/* Video Attachment */}
                          {sub.videoUrl && (
                            <div>
                              <span className="text-[10px] font-pixel text-rose-600 uppercase block mb-1 flex items-center gap-1">
                                <FileVideo className="w-3.5 h-3.5" /> GAMEPLAY DEMO VIDEO:
                              </span>
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/60 border border-rose-200">
                                <div className="min-w-0 pr-2">
                                  <span className="text-xs font-retro font-bold text-[#1e293b] block truncate">
                                    {sub.videoFileName || 'Submitted Video Demo'}
                                  </span>
                                  {sub.videoFileSize && (
                                    <span className="text-[10px] font-retro text-[#64748b]">
                                      Size: {(sub.videoFileSize / (1024 * 1024)).toFixed(1)} MB
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveVideoModal({
                                      url: sub.videoUrl,
                                      title: selectedTeamModal.name,
                                      fileName: sub.videoFileName,
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-pixel font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                                >
                                  <Play className="w-3 h-3" /> PLAY VIDEO ▶
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {sub.notes && (
                            <div>
                              <span className="text-[10px] font-pixel text-[#64748b] uppercase block mb-1">
                                SQUAD CONTROLS & NOTES:
                              </span>
                              <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-retro text-[#475569]">
                                {sub.notes}
                              </p>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-pixel text-slate-600">NO SUBMISSIONS LOGGED</p>
                    <p className="text-[11px] font-retro text-slate-400">
                      This squad has not saved any drafts or submitted their Scratch project yet.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Top Banner & Metric Counters */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#4e97fe] shadow-[6px_6px_0px_#bad6fc] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4e97fe] to-[#307fef] text-white flex items-center justify-center shadow-[3px_3px_0px_#2463bf] shrink-0 border-2 border-white">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                  SQUAD ROSTER & SUBMISSIONS DIRECTORY
                </h1>
                <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-xs font-retro text-[#64748b] mt-0.5">
                Complete visibility into all registered teams, draft revisions, final project submissions, video clips, and grading status.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-pixel transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300 font-bold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>REFRESH</span>
            </button>
            {onNavigateMissionControl && (
              <button
                onClick={onNavigateMissionControl}
                className="px-3.5 py-2 rounded-xl bg-[#f6ab3c] hover:bg-[#e69828] text-white text-xs font-pixel transition-all flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#a4640c] font-black"
              >
                <span>MISSION CONTROL ↗</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Counter Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-[#f0f7ff] border border-[#bad6fc] text-center">
            <span className="text-[10px] font-pixel text-[#64748b] block">TOTAL SQUADS</span>
            <span className="text-lg sm:text-xl font-bold font-pixel text-[#1e293b]">{totalTeams}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] font-pixel text-emerald-700 block">FINAL SUBMITTED</span>
            <span className="text-lg sm:text-xl font-bold font-pixel text-emerald-800">{finalSubmittedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[10px] font-pixel text-amber-700 block">ACTIVE DRAFTS</span>
            <span className="text-lg sm:text-xl font-bold font-pixel text-amber-800">{draftOnlyCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-pixel text-slate-500 block">PENDING UPLOAD</span>
            <span className="text-lg sm:text-xl font-bold font-pixel text-slate-700">{pendingCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center">
            <span className="text-[10px] font-pixel text-purple-700 block">SCORED SQUADS</span>
            <span className="text-lg sm:text-xl font-bold font-pixel text-purple-800">{scoredCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-center">
            <span className="text-[10px] font-pixel text-sky-700 block">TOTAL MEMBERS</span>
            <span className="text-lg sm:text-xl font-bold font-pixel text-sky-800">{totalMembers}</span>
          </div>
        </div>
      </div>

      {/* View Mode Tabs & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] space-y-4">
        
        {/* Top Toggle: Squads Directory View vs Challenge Matrix View */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTabMode('squads')}
              className={`px-4 py-2 rounded-xl text-xs font-pixel font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTabMode === 'squads'
                  ? 'bg-[#4e97fe] text-white shadow-[2px_2px_0px_#2463bf]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>SQUAD ROSTER & SUBMISSIONS ({filteredTeams.length})</span>
            </button>

            <button
              onClick={() => setActiveTabMode('challenges')}
              className={`px-4 py-2 rounded-xl text-xs font-pixel font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTabMode === 'challenges'
                  ? 'bg-[#ffbe00] text-[#141720] shadow-[2px_2px_0px_#a4640c]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>PROBLEM STATEMENT MATRIX ({challenges.length})</span>
            </button>
          </div>

          <span className="text-xs font-retro text-[#64748b]">
            {activeTabMode === 'squads'
              ? 'Showing individual squad submissions & video demo files'
              : 'Showing live problem statement quotas and squad seat distribution'}
          </span>
        </div>

        {/* Search & Filter Controls (Active for squads mode) */}
        {activeTabMode === 'squads' && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            
            {/* Left: Search input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by team name, access code, member name, or quest..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-slate-200 text-xs sm:text-sm font-retro text-[#1e293b] focus:border-[#4e97fe] outline-none shadow-inner"
              />
            </div>

            {/* Right: Challenge selector + Status filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {uniqueChallenges.length > 0 && (
                <select
                  value={challengeFilter}
                  onChange={(e) => setChallengeFilter(e.target.value)}
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

              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-pixel">
                {[
                  { key: 'ALL', label: 'All' },
                  { key: 'SUBMITTED', label: 'Submitted' },
                  { key: 'DRAFT', label: 'Drafts' },
                  { key: 'PENDING', label: 'Pending' },
                  { key: 'SCORED', label: 'Scored' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                      statusFilter === tab.key
                        ? 'bg-[#4e97fe] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* VIEW MODE 2: Problem Statement Breakdown Matrix */}
      {activeTabMode === 'challenges' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Matrix Top Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border-2 border-[#bad6fc] shadow-xs">
            <div>
              <h3 className="text-sm font-bold font-pixel text-[#1e293b]">
                PROBLEM STATEMENT MATRIX ({challenges.length})
              </h3>
              <p className="text-xs font-retro text-[#64748b]">
                Overview of all quests, squad assignments, and real-time sprint progress.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateChallenge}
              className="px-3.5 py-2 rounded-xl bg-[#f6ab3c] hover:bg-[#e69828] text-white text-xs font-pixel font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#a4640c] transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW QUEST</span>
            </button>
          </div>

          {challenges.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border-4 border-[#bad6fc] text-center text-xs font-retro text-[#64748b] space-y-3">
              <p>No problem statements configured yet.</p>
              <button
                type="button"
                onClick={handleOpenCreateChallenge}
                className="px-4 py-2 rounded-xl bg-[#f6ab3c] hover:bg-[#e69828] text-white text-xs font-pixel font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> CREATE FIRST QUEST
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {challenges.map((c) => {
                const assignedSquads = teams.filter((t) => t.challengeId === c.id || t.challenge?.id === c.id);
                const claimedSeats = assignedSquads.length;
                const percentFull = Math.min(100, Math.round((claimedSeats / (c.maxCapacity || 1)) * 100));

                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl border-4 border-[#bad6fc] bg-white shadow-[4px_4px_0px_#bad6fc] hover:shadow-[6px_6px_0px_#bad6fc] transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Category & Capacity badge + Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-pixel px-2.5 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase font-bold">
                            {c.category || 'Arcade Quest'}
                          </span>
                          <span className="text-xs font-retro font-bold text-emerald-600">
                            {c.difficulty || 'Intermediate'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditChallenge(c)}
                            className="p-1.5 rounded-lg bg-[#f0f7ff] hover:bg-[#e0efff] text-[#4e97fe] border border-[#bad6fc] text-[10px] font-pixel transition-all cursor-pointer font-bold"
                            title="Edit problem statement"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteChallenge(c)}
                            disabled={challengeDeleting && challengeToDelete?.id === c.id}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[10px] font-pixel transition-all cursor-pointer font-bold disabled:opacity-50"
                            title="Delete problem statement"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold font-pixel text-[#1e293b] leading-tight mb-2">
                        {c.title}
                      </h4>

                      <p className="text-xs font-retro text-[#64748b] line-clamp-2 mb-3">
                        {c.shortDescription || c.fullDescription || 'No description provided.'}
                      </p>

                      {/* Capacity Bar */}
                      <div className="space-y-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between text-[11px] font-pixel text-[#64748b]">
                          <span>CLAIMED SLOTS</span>
                          <span className="font-bold text-[#1e293b]">
                            {claimedSeats} / {c.maxCapacity} SQUADS ({percentFull}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              percentFull >= 100 ? 'bg-rose-500' : percentFull >= 50 ? 'bg-amber-500' : 'bg-[#4e97fe]'
                            }`}
                            style={{ width: `${percentFull}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Assigned Squads Roster Box */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-pixel text-[10px] text-[#64748b] uppercase">
                          ASSIGNED SQUADS ({assignedSquads.length}):
                        </span>
                      </div>

                      {assignedSquads.length > 0 ? (
                        <div className="space-y-2">
                          {assignedSquads.map((sq) => {
                            const sub = getLatestR1Submission(sq.submissions);
                            const isSubmitted = sub && (sub.status === 'SUBMITTED' || sub.status === 'LATE');
                            const isDraftSub = sub && sub.status === 'DRAFT';

                            return (
                              <div
                                key={sq.id}
                                className={`p-3 rounded-xl border transition-all flex flex-col gap-2 shadow-2xs ${
                                  sq.isFinalist
                                    ? 'bg-amber-50/90 border-amber-400 shadow-[2px_2px_0px_#f59e0b]'
                                    : 'bg-[#f8fbff] border-[#bad6fc]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-pixel text-xs text-[#1e293b] font-bold truncate">
                                      {sq.name}
                                    </span>
                                    {sq.isFinalist && (
                                      <span className="text-[8px] font-pixel px-1.5 py-0.2 rounded bg-[#ffbe00] text-[#141720] font-black shrink-0">
                                        FINALIST
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handlePromptUnassignChallenge(sq)}
                                      disabled={unassignLoadingId === sq.id}
                                      className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-pixel transition-all cursor-pointer flex items-center gap-1 font-bold disabled:opacity-50"
                                      title="Remove squad from this problem statement to free up the seat"
                                    >
                                      <UserMinus className="w-3 h-3" />
                                      <span>UNASSIGN</span>
                                    </button>
                                    <button
                                      onClick={() => setSelectedTeamModal(sq)}
                                      className="text-[10px] font-pixel text-[#4e97fe] hover:underline font-bold cursor-pointer shrink-0"
                                    >
                                      VIEW ↗
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] font-retro text-[#64748b]">
                                  <span className="font-mono text-[10px] text-slate-500">
                                    Code: {sq.accessCode}
                                  </span>
                                  <span
                                    className={`text-[9px] font-pixel px-1.5 py-0.2 rounded font-bold ${
                                      isSubmitted
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isDraftSub
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {isSubmitted ? 'SUBMITTED' : isDraftSub ? 'DRAFT' : 'PENDING'}
                                  </span>
                                </div>

                                {/* Finalist Toggle Button */}
                                <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-mono text-slate-500 font-bold">
                                    {sq.round1Score ? `Score: ${sq.round1Score} pts` : 'No score yet'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFinalist(sq)}
                                    disabled={toggleLoadingId === sq.id}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-pixel font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs disabled:opacity-50 ${
                                      sq.isFinalist
                                        ? 'bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] border border-amber-500 font-black'
                                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                                    }`}
                                  >
                                    <Trophy className={`w-3 h-3 ${sq.isFinalist ? 'text-[#141720]' : 'text-slate-400'}`} />
                                    <span>{sq.isFinalist ? 'SELECTED FINALIST' : 'SET AS FINALIST'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs font-retro text-slate-400 italic">
                          No squads have claimed this challenge yet.
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 1: Squads Grid / List */}
      {activeTabMode === 'squads' && (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-white/70 animate-pulse border-2 border-[#bad6fc]" />
            ))}
          </div>
        ) : filteredTeams.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border-4 border-[#bad6fc] text-center shadow-sm max-w-md mx-auto my-6 space-y-3">
          <Gamepad2 className="w-12 h-12 text-[#64748b] mx-auto" />
          <h3 className="text-sm font-bold font-pixel text-[#1e293b]">NO TEAMS FOUND</h3>
          <p className="text-xs font-retro text-[#64748b]">
            No squads match your current search query or filter selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTeams.map((t) => {
            const r1Sub = getLatestR1Submission(t.submissions);
            const isFinalSubmitted = r1Sub && (r1Sub.status === 'SUBMITTED' || r1Sub.status === 'LATE');
            const isDraft = r1Sub && r1Sub.status === 'DRAFT' && !isFinalSubmitted;
            const isPending = !r1Sub;
            const isExpanded = expandedTeamId === t.id;
            const draftCount = t.submissions?.filter((s) => s.status === 'DRAFT').length || 0;
            const latestSubTime = formatTimestamp(r1Sub?.submittedAt || r1Sub?.createdAt);

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] hover:shadow-[6px_6px_0px_#bad6fc] transition-all p-5 sm:p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3.5">
                  
                  {/* Top Bar: Challenge Tag + Finalist Tag */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-pixel px-2.5 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase font-bold truncate max-w-[200px]">
                        {t.challenge?.title || 'Unclaimed Challenge'}
                      </span>
                      {(t.challengeId || t.challenge) && (
                        <button
                          type="button"
                          onClick={() => handlePromptUnassignChallenge(t)}
                          disabled={unassignLoadingId === t.id}
                          className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-pixel transition-all cursor-pointer flex items-center gap-1 font-bold shrink-0 disabled:opacity-50"
                          title="Remove squad from this problem statement to free up the seat"
                        >
                          <UserMinus className="w-2.5 h-2.5" />
                          <span>UNASSIGN</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {t.isFinalist && (
                        <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-[#ffbe00] text-[#141720] font-black">
                          FINALIST
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-pixel px-2 py-0.5 rounded font-bold uppercase ${
                          isFinalSubmitted
                            ? r1Sub.status === 'LATE'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isDraft
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {isFinalSubmitted
                          ? r1Sub.status === 'LATE'
                            ? 'LATE SUBMITTED'
                            : 'FINAL SUBMITTED'
                          : isDraft
                          ? 'DRAFT SAVED'
                          : 'PENDING UPLOAD'}
                      </span>
                    </div>
                  </div>

                  {/* Team Name + Access Code + Members Count */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b] leading-tight">
                        {t.name}
                      </h3>
                      <span className="text-xs font-retro text-[#64748b] font-bold block mt-0.5 font-mono">
                        CODE: <strong className="text-[#1e293b]">{t.accessCode || t.id.slice(0, 8).toUpperCase()}</strong>
                      </span>
                    </div>
                    {t.members && t.members.length > 0 && (
                      <span className="text-[10px] font-retro text-[#64748b] bg-slate-100 px-2 py-1 rounded-lg font-medium shrink-0 flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        {t.members.length} {t.members.length === 1 ? 'member' : 'members'}
                      </span>
                    )}
                  </div>

                  {/* Members Pill List Preview */}
                  {t.members && t.members.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {t.members.map((m) => (
                        <span
                          key={m.id}
                          className="text-[11px] font-retro px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[#475569] flex items-center gap-1"
                        >
                          {m.isTeamLeader && <Crown className="w-3 h-3 text-amber-500" />}
                          {m.fullName}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Latest Submission Box */}
                  <div className="p-3.5 rounded-xl bg-[#f8fbff] border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-retro">
                      <span className="font-bold text-[#64748b]">Latest Submission:</span>
                      {r1Sub ? (
                        <span className="font-mono text-[11px] text-[#1e293b] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#4e97fe]" />
                          {latestSubTime}
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 italic">No uploads logged</span>
                      )}
                    </div>

                    {/* Story Pitch Snippet */}
                    {r1Sub?.shortDescription && (
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-xs font-retro text-[#334155] leading-relaxed line-clamp-2">
                        <span className="font-pixel text-[9px] text-[#4e97fe] block uppercase mb-0.5">
                          STORY PITCH:
                        </span>
                        {r1Sub.shortDescription}
                      </div>
                    )}

                    {/* Quick Link Row */}
                    {r1Sub && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                        {r1Sub.scratchUrl && (
                          <a
                            href={r1Sub.scratchUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-pixel text-[#4e97fe] hover:underline flex items-center gap-1 font-bold bg-white px-2 py-0.5 rounded border border-[#bad6fc]"
                          >
                            <ExternalLink className="w-3 h-3" /> Scratch Link ↗
                          </a>
                        )}

                        {r1Sub.videoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveVideoModal({
                                url: r1Sub.videoUrl,
                                title: t.name,
                                fileName: r1Sub.videoFileName,
                              })
                            }
                            className="text-[10px] font-pixel text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded border border-rose-200 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Play className="w-3 h-3 text-rose-600" />
                            {r1Sub.videoFileName ? 'Play Video Clip' : 'Watch Video'}
                          </button>
                        )}

                        {draftCount > 0 && (
                          <span className="text-[10px] font-retro text-[#64748b] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {draftCount} {draftCount === 1 ? 'draft saved' : 'drafts saved'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Judge Evaluation Score Banner */}
                  <div className="flex items-center justify-between text-xs font-retro p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                    <span className="text-amber-900 font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      Judge Grading:
                    </span>
                    {t.round1Scores && t.round1Scores.length > 0 ? (
                      <span className="font-pixel text-xs text-emerald-800 font-bold">
                        {t.round1Score ?? t.round1Scores[0]?.totalScore} / 100 PTS ({t.round1Scores.length} {t.round1Scores.length === 1 ? 'judge' : 'judges'})
                      </span>
                    ) : (
                      <span className="text-[10px] font-pixel text-amber-700 italic font-bold">
                        NOT GRADED YET
                      </span>
                    )}
                  </div>

                </div>

                {/* Bottom Action Row: Toggle Finalist & View Details */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggleFinalist(t)}
                    disabled={toggleLoadingId === t.id}
                    className={`px-3 py-2 rounded-xl text-[11px] font-pixel font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                      t.isFinalist
                        ? 'bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] border-2 border-amber-500 font-black'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-300'
                    }`}
                  >
                    <Trophy className={`w-3.5 h-3.5 ${t.isFinalist ? 'text-[#141720]' : 'text-slate-400'}`} />
                    <span>{t.isFinalist ? 'ROUND 2 FINALIST' : 'NOMINATE FINALIST'}</span>
                  </button>

                  <button
                    onClick={() => setSelectedTeamModal(t)}
                    className="px-4 py-2 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel transition-all shadow-[2px_2px_0px_#2463bf] flex items-center gap-1.5 cursor-pointer font-bold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>VIEW DETAILS</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )
    )}

      {/* Challenge Editor / Creator Modal */}
      {showChallengeModal && (
        <ChallengeEditorModal
          isOpen={showChallengeModal}
          onClose={() => {
            setShowChallengeModal(false);
            setChallengeToEdit(null);
          }}
          challengeToEdit={challengeToEdit}
          onChallengeSaved={async () => {
            setToastMessage({
              type: 'success',
              text: challengeToEdit ? 'Problem statement updated successfully!' : 'New problem statement created!',
            });
            setTimeout(() => setToastMessage(null), 4000);
            setShowChallengeModal(false);
            setChallengeToEdit(null);
            await fetchData();
          }}
          onChallengeDeleted={async (deletedChallenge) => {
            setToastMessage({
              type: 'success',
              text: `Problem statement "${deletedChallenge?.title || ''}" deleted successfully.`,
            });
            setTimeout(() => setToastMessage(null), 4000);
            setShowChallengeModal(false);
            setChallengeToEdit(null);
            await fetchData();
          }}
        />
      )}

      {/* Delete Challenge Confirmation Dialog Modal */}
      {challengeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-rose-400 shadow-[8px_8px_0px_#fda4af] max-w-md w-full space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-rose-300 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold font-pixel text-[#1e293b]">
                  DELETE PROBLEM STATEMENT?
                </h4>
                <p className="text-xs font-retro text-[#64748b]">
                  This action cannot be reversed.
                </p>
              </div>
            </div>

            <p className="text-xs font-retro text-[#475569] leading-relaxed">
              Are you sure you want to delete <strong className="text-[#1e293b]">"{challengeToDelete.title}"</strong>?
            </p>

            {challengeDeleteWarning && (
              <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs font-retro flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{challengeDeleteWarning}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setChallengeToDelete(null);
                  setChallengeDeleteWarning('');
                }}
                disabled={challengeDeleting}
                className="px-4 py-2 rounded-xl text-xs font-pixel text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteChallenge(Boolean(challengeDeleteWarning))}
                disabled={challengeDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-pixel font-bold shadow-[2px_2px_0px_#9f1239] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{challengeDeleting ? 'DELETING...' : challengeDeleteWarning ? 'FORCE DELETE & UNASSIGN' : 'YES, DELETE'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unassign Squad from Challenge Confirmation Modal */}
      {unassignTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-rose-400 shadow-[8px_8px_0px_#fda4af] max-w-md w-full space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-rose-300 text-rose-600 flex items-center justify-center shrink-0">
                <UserMinus className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold font-pixel text-[#1e293b]">
                  REMOVE SQUAD FROM QUEST?
                </h4>
                <p className="text-xs font-retro text-[#64748b]">
                  Manual override / exception handler
                </p>
              </div>
            </div>

            <p className="text-xs font-retro text-[#475569] leading-relaxed">
              Are you sure you want to remove squad <strong className="text-[#1e293b]">"{unassignTeamModal.teamName}"</strong> from <strong className="text-[#4e97fe]">"{unassignTeamModal.challengeTitle}"</strong>?
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-retro text-amber-900 space-y-1">
              <span className="font-bold font-pixel text-[10px] block">WHAT WILL HAPPEN:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>The seat for this problem statement will be freed up for other squads in real time.</li>
                <li>Squad <strong>"{unassignTeamModal.teamName}"</strong> will be able to choose a new problem statement immediately.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUnassignTeamModal(null)}
                disabled={unassignLoadingId !== null}
                className="px-4 py-2 rounded-xl text-xs font-pixel text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmUnassignChallenge}
                disabled={unassignLoadingId !== null}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-pixel font-bold shadow-[2px_2px_0px_#9f1239] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>{unassignLoadingId ? 'UNASSIGNING...' : 'YES, REMOVE FROM QUEST'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
