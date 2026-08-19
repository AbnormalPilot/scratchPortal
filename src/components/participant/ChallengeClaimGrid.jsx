import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { socketClient } from '../../lib/socket.js';
import {
  Gamepad2,
  Users,
  CheckCircle2,
  Lock,
  Sparkles,
  Info,
  ChevronRight,
  AlertTriangle,
  Flame,
} from 'lucide-react';

export default function ChallengeClaimGrid({ onChallengeClaimed }) {
  const { user, team, refreshSession, eventConfig } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [isReleased, setIsReleased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null); // modal preview
  const [claimingId, setClaimingId] = useState(null);
  const [claimError, setClaimError] = useState('');
  const [confirmModalChallenge, setConfirmModalChallenge] = useState(null);

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

    // Listen to real-time stage transitions (instant unlock)
    const handleStageChange = () => {
      fetchChallenges();
    };

    // Listen to real-time seat claim broadcasts
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
    };

    socketClient.on('stage:changed', handleStageChange);
    socketClient.on('challenge:seat_updated', handleSeatUpdate);

    return () => {
      socketClient.off('stage:changed', handleStageChange);
      socketClient.off('challenge:seat_updated', handleSeatUpdate);
    };
  }, []);

  const handleClaim = async (challenge) => {
    setClaimError('');
    setClaimingId(challenge.id);

    try {
      const res = await api.post(`/challenges/${challenge.id}/claim`, {});
      await refreshSession();
      await fetchChallenges();
      setConfirmModalChallenge(null);
      if (onChallengeClaimed) onChallengeClaimed(res.challenge);
    } catch (err) {
      setClaimError(err.message || 'Failed to claim challenge.');
    } finally {
      setClaimingId(null);
    }
  };

  const hasTeamClaimed = Boolean(team?.challengeId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-purple-950/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                <Flame className="w-3 h-3 text-cyan-400" /> First-Come, First-Served (FCFS)
              </span>
              <span className="text-xs text-slate-400 font-mono">10–15 Problem Statements</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
              Select Your Scratch Challenge
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Each challenge has a strictly locked maximum capacity of 4 teams. Once claimed, your selection is locked for Round 1.
            </p>
          </div>

          {team && (
            <div className="bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 shrink-0">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Your Team</span>
              <span className="text-sm font-bold text-cyan-300">{team.name}</span>
              {hasTeamClaimed && (
                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Challenge Locked
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {claimError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{claimError}</span>
        </div>
      )}

      {/* Challenges Grid or Sealed Vault */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-900/40 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : !isReleased && user?.role !== 'ORGANIZER' ? (
        <div className="glass-panel rounded-3xl p-10 sm:p-14 border border-cyan-500/30 text-center relative overflow-hidden bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950 shadow-2xl">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-5 text-cyan-400">
            <Lock className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800/60 inline-block mb-3">
            Tournament Vault Sealed
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-100 mb-2">
            Problem Statements are Locked
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            All 12 Scratch problem statements will be revealed simultaneously to all teams the exact moment the organizer releases them.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Standing by for Organizer Kickoff...
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {challenges.map((c) => {
            const isClaimedByMe = team?.challengeId === c.id;
            const remaining = c.remainingSeats ?? Math.max(0, c.maxCapacity - c.claimedCount);
            const isFull = remaining <= 0;

            return (
              <div
                key={c.id}
                className={`glass-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all ${
                  isClaimedByMe
                    ? 'border-emerald-500/80 ring-2 ring-emerald-500/40 bg-emerald-950/20'
                    : isFull
                    ? 'opacity-70 border-slate-800 bg-slate-950/40'
                    : 'border-slate-800 hover:border-cyan-500/50'
                }`}
              >
                {/* Top Badge Row */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {c.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        c.difficulty === 'Beginner'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : c.difficulty === 'Advanced'
                          ? 'bg-purple-950 text-purple-400 border border-purple-800/40'
                          : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                      }`}
                    >
                      {c.difficulty}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 flex items-center justify-between">
                    {c.title}
                    {isClaimedByMe && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 uppercase tracking-wider">
                        YOUR CLAIM
                      </span>
                    )}
                  </h3>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {c.shortDescription}
                  </p>
                </div>

                {/* Capacity & Actions */}
                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" /> Seats Availability:
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        isFull ? 'text-rose-400' : remaining === 1 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {c.claimedCount} / {c.maxCapacity} Teams {isFull && '(FULL)'}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isFull
                          ? 'bg-rose-500'
                          : remaining === 1
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                      }`}
                      style={{ width: `${(c.claimedCount / c.maxCapacity) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedChallenge(c)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center justify-center gap-1"
                    >
                      <Info className="w-3.5 h-3.5" /> Details
                    </button>

                    {isClaimedByMe ? (
                      <div className="flex-1 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-600/40 text-center flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Claimed
                      </div>
                    ) : hasTeamClaimed ? (
                      <button
                        disabled
                        className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-500 bg-slate-900 border border-slate-800 cursor-not-allowed opacity-50"
                      >
                        Locked
                      </button>
                    ) : isFull ? (
                      <button
                        disabled
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-800/40 cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        <Lock className="w-3.5 h-3.5" /> Full
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmModalChallenge(c)}
                        disabled={!user || claimingId === c.id}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {claimingId === c.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> Claim Seat
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Challenge Modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-slate-700 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                {selectedChallenge.category} • {selectedChallenge.difficulty}
              </span>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 bg-slate-900 rounded-lg"
              >
                Close
              </button>
            </div>

            <h2 className="text-xl font-bold text-slate-100 mb-2">{selectedChallenge.title}</h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">{selectedChallenge.fullDescription}</p>

            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Mandatory Game Mechanics:
              </h4>
              <ul className="space-y-2">
                {Array.isArray(selectedChallenge.requirements) &&
                  selectedChallenge.requirements.map((req, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{req}</span>
                    </li>
                  ))}
              </ul>
            </div>

            <button
              onClick={() => {
                const c = selectedChallenge;
                setSelectedChallenge(null);
                if (!hasTeamClaimed && !c.isFull) {
                  setConfirmModalChallenge(c);
                }
              }}
              disabled={hasTeamClaimed || selectedChallenge.isFull || !user}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold text-xs disabled:opacity-40 transition-all"
            >
              {hasTeamClaimed ? 'Your Team Already Claimed a Challenge' : selectedChallenge.isFull ? 'Challenge is Full' : 'Claim this Challenge'}
            </button>
          </div>
        </div>
      )}

      {/* Confirm Claim Modal */}
      {confirmModalChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md glass-panel rounded-2xl border border-cyan-500/50 p-6 sm:p-8 shadow-2xl shadow-cyan-950/60 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4 border border-cyan-500/40">
              <Sparkles className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-100">
              Confirm Challenge Selection?
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Are you sure you want to lock <strong className="text-cyan-300">"{confirmModalChallenge.title}"</strong> for team <strong className="text-white">{team?.name}</strong>?
            </p>
            <p className="text-[11px] text-amber-400 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40 mt-3">
              ⚠️ Rule: Once confirmed, challenge claims cannot be changed or transferred during Round 1.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmModalChallenge(null)}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleClaim(confirmModalChallenge)}
                disabled={claimingId === confirmModalChallenge.id}
                className="py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-1.5"
              >
                {claimingId === confirmModalChallenge.id ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Yes, Lock Challenge'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
