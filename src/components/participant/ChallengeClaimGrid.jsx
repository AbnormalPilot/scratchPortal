import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import socketClient from '../../lib/socket.js';
import {
  Gamepad2,
  Lock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function ChallengeClaimGrid({ onChallengeClaimed }) {
  const { user, team, refreshSession } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [isReleased, setIsReleased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [claimError, setClaimError] = useState('');
  const [selectedModalChallenge, setSelectedModalChallenge] = useState(null);

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
      setSelectedModalChallenge(null);
      if (onChallengeClaimed) onChallengeClaimed(res.challenge);
    } catch (err) {
      setClaimError(err.message || 'Failed to claim challenge.');
    } finally {
      setClaimingId(null);
    }
  };

  const hasTeamClaimed = Boolean(team?.challengeId);

  return (
    <div className="space-y-5">
      
      {claimError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{claimError}</span>
        </div>
      )}

      {/* Sealed Vault View */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-48 rounded-xl bg-white/70 animate-pulse border border-[#bad6fc]" />
          ))}
        </div>
      ) : !isReleased && user?.role !== 'ORGANIZER' ? (
        <div className="bg-white rounded-2xl p-10 border-2 border-[#bad6fc] text-center shadow-sm max-w-lg mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-[#eef4fc] border-2 border-[#bad6fc] flex items-center justify-center mx-auto mb-4 text-[#4e97fe]">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#1e293b] font-pixel">
            QUEST VAULT SEALED
          </h3>
          <p className="text-xs text-[#64748b] mt-2 max-w-sm mx-auto leading-relaxed">
            All 12 problem statements will unlock simultaneously the moment the organizer initiates challenge kickoff.
          </p>
        </div>
      ) : (
        /* Unlocked Challenges Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((c) => {
            const isClaimedByMe = team?.challengeId === c.id;
            const percentFilled = (c.claimedCount / c.maxCapacity) * 100;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl p-5 border-2 transition-all flex flex-col justify-between shadow-sm ${
                  isClaimedByMe
                    ? 'border-[#10b981] ring-2 ring-[#10b981]/20'
                    : c.isFull
                    ? 'border-slate-200 opacity-60 bg-slate-50'
                    : 'border-[#bad6fc] hover:border-[#4e97fe]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase">
                      {c.category}
                    </span>
                    <span className="text-[10px] font-mono text-[#64748b]">
                      {c.difficulty}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#1e293b] leading-snug">
                    {c.title}
                  </h3>

                  <p className="text-xs text-[#64748b] mt-1.5 line-clamp-2 leading-relaxed">
                    {c.shortDescription}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                  {/* Capacity Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-[#64748b] mb-1">
                      <span>Capacity</span>
                      <span className="font-bold text-[#1e293b]">
                        {c.claimedCount} / {c.maxCapacity} Teams
                      </span>
                    </div>
                    <div className="w-full bg-[#eef4fc] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          c.isFull ? 'bg-rose-500' : 'bg-[#4e97fe]'
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  {user?.role === 'ORGANIZER' || user?.role === 'JUDGE' ? (
                    <div className="w-full py-2 rounded-lg bg-[#f0f7ff] border border-[#bad6fc] text-[#4e97fe] text-[10px] font-pixel text-center">
                      CATALOG PREVIEW (NO CLAIM)
                    </div>
                  ) : isClaimedByMe ? (
                    <div className="w-full py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-pixel text-center flex items-center justify-center gap-1.5 text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> YOUR SQUAD CHOICE
                    </div>
                  ) : hasTeamClaimed ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-pixel"
                    >
                      ALREADY CLAIMED ANOTHER
                    </button>
                  ) : c.isFull ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-pixel"
                    >
                      SEATS FULL (0 LEFT)
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClaim(c)}
                      disabled={claimingId === c.id}
                      className="w-full py-2 rounded-lg bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {claimingId === c.id ? (
                        <span>CLAIMING...</span>
                      ) : (
                        <>
                          <Flame className="w-3.5 h-3.5" /> CLAIM CHALLENGE
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
