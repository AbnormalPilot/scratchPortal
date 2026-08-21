import React, { useState } from 'react';
import {
  Gamepad2,
  X,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  ListChecks,
  Users,
  ArrowLeft,
  Sparkles,
  Award,
} from 'lucide-react';

export default function ChallengeDetailModal({
  challenge,
  isOpen,
  onClose,
  onConfirmClaim,
  isClaiming,
  userRole,
  isClaimedByMe,
  hasTeamClaimed,
  claimError,
}) {
  const [showConfirmStep, setShowConfirmStep] = useState(false);

  if (!isOpen || !challenge) return null;

  const totalCapacity = challenge.maxCapacity || 4;
  const claimed = challenge.claimedCount || 0;
  const remainingSeats = Math.max(0, totalCapacity - claimed);
  const isLastSeat = remainingSeats === 1;
  const isFull = remainingSeats <= 0;
  const percentFilled = Math.min(100, Math.round((claimed / totalCapacity) * 100));
  const isParticipant = !userRole || userRole === 'PARTICIPANT';

  const handleClose = () => {
    setShowConfirmStep(false);
    onClose();
  };

  const handleProceedToConfirm = () => {
    setShowConfirmStep(true);
  };

  const handleFinalClaim = () => {
    onConfirmClaim(challenge);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      
      {/* Modal Container */}
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full border-4 border-[#4e97fe] shadow-[8px_8px_0px_#bad6fc] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="bg-[#4e97fe] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#307fef]">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5" />
            <div>
              <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#ffbe00] text-[#141720] font-black uppercase">
                {challenge.category || 'Arcade Quest'}
              </span>
              <span className="text-xs font-retro text-white/90 ml-2 font-bold">
                DIFFICULTY: {challenge.difficulty || 'Intermediate'}
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-5 flex-1">
          
          {/* Error Message Display */}
          {claimError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-retro flex items-center gap-2.5 animate-fadeIn text-left">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-bold">{claimError}</span>
            </div>
          )}

          {showConfirmStep ? (
            /* STEP 2: Confirmation Screen */
            <div className="py-4 text-center space-y-5 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-[#fff9e6] border-2 border-[#ffbe00] text-[#ffbe00] flex items-center justify-center mx-auto shadow-sm">
                <AlertTriangle className="w-8 h-8 text-[#f6ab3c]" />
              </div>

              <div>
                <span className="text-[10px] font-pixel px-2.5 py-1 rounded bg-[#fff9e6] text-[#d97706] border border-[#fde68a] font-bold uppercase">
                  CONFIRMATION REQUIRED
                </span>
                <h3 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b] mt-2.5">
                  LOCK IN "{challenge.title.toUpperCase()}" ?
                </h3>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 text-left max-w-md mx-auto space-y-2">
                <p className="text-xs sm:text-sm font-retro text-amber-900 leading-relaxed font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="underline">IMPORTANT NOTICE:</span>
                </p>
                <p className="text-xs font-retro text-amber-800 leading-relaxed">
                  Once your squad claims this problem statement, your choice is <strong>final and locked</strong>. You cannot switch to another challenge during the hackathon.
                </p>
              </div>

              {/* Highlighted Seats Remaining Banner */}
              <div
                className={`p-4 rounded-2xl border-2 max-w-md mx-auto transition-all shadow-sm ${
                  isFull
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : isLastSeat
                    ? 'bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border-amber-400 text-amber-950'
                    : 'bg-gradient-to-r from-emerald-50 via-[#f0fdf4] to-cyan-50 border-emerald-400 text-emerald-950'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-left">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border-2 ${
                        isFull
                          ? 'bg-rose-100 border-rose-300 text-rose-700'
                          : isLastSeat
                          ? 'bg-amber-100 border-amber-300 text-amber-700 animate-pulse'
                          : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-pixel uppercase tracking-wide block font-bold text-slate-500">
                        REMAINING AVAILABILITY
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-2xl sm:text-3xl font-black font-pixel leading-none ${
                            isFull
                              ? 'text-rose-700'
                              : isLastSeat
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {remainingSeats}
                        </span>
                        <span className="text-xs font-bold font-retro text-slate-700">
                          of {totalCapacity} Seats Left
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block text-[10px] sm:text-[11px] font-pixel px-3 py-1.5 rounded-xl border-2 font-black uppercase shadow-xs ${
                        isFull
                          ? 'bg-rose-100 border-rose-400 text-rose-900'
                          : isLastSeat
                          ? 'bg-amber-200 border-amber-400 text-amber-950 animate-bounce'
                          : 'bg-emerald-200 border-emerald-400 text-emerald-950'
                      }`}
                    >
                      {isFull
                        ? '🔒 FULL'
                        : isLastSeat
                        ? '🔥 ONLY 1 SEAT LEFT!'
                        : `✨ ${remainingSeats} SEATS LEFT`}
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center gap-2.5">
                  <div className="flex-1 bg-slate-200/90 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isFull
                          ? 'bg-rose-500'
                          : isLastSeat
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${claimed === 0 ? 0 : Math.round((claimed / totalCapacity) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-600 shrink-0">
                    {claimed} / {totalCapacity} Claimed
                  </span>
                </div>
              </div>

            </div>
          ) : (
            /* STEP 1: Full Challenge Details */
            <>
              {/* Challenge Title */}
              <div>
                <h2 className="text-lg sm:text-2xl font-bold font-pixel text-[#1e293b] leading-snug">
                  {challenge.title}
                </h2>
                <div className="mt-3 flex items-center">
                  <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 font-pixel text-xs font-bold shadow-2xs ${
                      isFull
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : isLastSeat
                        ? 'bg-amber-50 border-amber-300 text-amber-900 animate-pulse'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}
                  >
                    <Users className={`w-4 h-4 ${isFull ? 'text-rose-600' : isLastSeat ? 'text-amber-600' : 'text-emerald-600'}`} />
                    <span>
                      <strong className={`text-base font-black ${isFull ? 'text-rose-700' : isLastSeat ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {remainingSeats}
                      </strong>{' '}
                      of {totalCapacity} SEATS REMAINING
                    </span>
                  </div>
                </div>
              </div>

              {/* Problem Statement Story / Description */}
              <div className="p-4 sm:p-5 bg-[#f8fbff] rounded-xl border-2 border-[#bad6fc] space-y-2">
                <span className="font-pixel text-[10px] text-[#4e97fe] block uppercase font-bold">
                  CHALLENGE BRIEF & STORY:
                </span>
                <p className="text-xs sm:text-sm font-retro text-[#334155] leading-relaxed">
                  {challenge.fullDescription || challenge.shortDescription}
                </p>
              </div>

              {/* Claimed Squads & Live Grading Status (Visible only to Admin & Judges, hidden from students) */}
              {!isParticipant && Array.isArray(challenge.teams) && challenge.teams.length > 0 && (
                <div className="p-3.5 bg-white rounded-xl border-2 border-[#bad6fc] space-y-2">
                  <span className="font-pixel text-[10px] text-[#1e293b] flex items-center gap-1.5 uppercase font-bold">
                    <Users className="w-3.5 h-3.5 text-[#4e97fe]" />
                    SQUADS THAT CLAIMED THIS QUEST ({challenge.teams.length} / {challenge.maxCapacity}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {challenge.teams.map((t) => {
                      const hasScore = t.round1Score !== null && t.round1Score !== undefined;
                      const hasSub = t.submissions?.some((s) => s.roundNumber === 1 && s.status === 'SUBMITTED');

                      return (
                        <div
                          key={t.id}
                          className="px-3 py-2 rounded-lg bg-[#f0f7ff] border border-[#bad6fc] flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <span className="font-pixel text-[10px] text-[#1e293b] font-bold truncate">
                            {t.name}
                          </span>

                          {hasScore ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-pixel text-[9px] font-black shrink-0 flex items-center gap-1">
                              <Award className="w-2.5 h-2.5 text-emerald-700" /> {t.round1Score} / 100
                            </span>
                          ) : hasSub ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-pixel text-[9px] font-bold shrink-0 animate-pulse">
                              GRADING
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-white text-slate-500 font-pixel text-[9px] shrink-0 border border-slate-200">
                              BUILDING
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Required Game Mechanics Checklist */}
              {Array.isArray(challenge.requirements) && challenge.requirements.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <span className="font-pixel text-[10px] text-[#1e293b] flex items-center gap-1.5 uppercase font-bold">
                    <ListChecks className="w-4 h-4 text-[#4e97fe]" />
                    MANDATORY GAME MECHANICS & FEATURES:
                  </span>

                  <div className="space-y-2">
                    {challenge.requirements.map((req, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-retro text-[#1e293b] flex items-start gap-2.5"
                      >
                        <div className="w-5 h-5 rounded-md bg-[#4e97fe]/10 text-[#4e97fe] font-pixel text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          {idx + 1}
                        </div>
                        <span className="leading-relaxed text-xs sm:text-sm">{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-[#f0f7ff] px-6 py-4 border-t-2 border-[#bad6fc] flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {showConfirmStep ? (
            <>
              <button
                type="button"
                onClick={() => setShowConfirmStep(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-pixel transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>GO BACK</span>
              </button>

              <button
                type="button"
                onClick={handleFinalClaim}
                disabled={isClaiming}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#065f46] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isClaiming ? (
                  <span>LOCKING IN QUEST...</span>
                ) : (
                  <>
                    <Flame className="w-4 h-4 fill-white" />
                    <span>YES, CONFIRM & CLAIM QUEST</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#64748b] border border-slate-200 text-xs font-pixel transition-all flex items-center justify-center cursor-pointer shadow-sm"
              >
                <span>CLOSE</span>
              </button>

              {/* Role & Claim Status Check */}
              {!isParticipant ? (
                <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 text-xs font-pixel text-center">
                  ORGANIZER / JUDGE PREVIEW ONLY
                </div>
              ) : isClaimedByMe ? (
                <div className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-pixel flex items-center justify-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ALREADY YOUR SQUAD'S QUEST</span>
                </div>
              ) : hasTeamClaimed ? (
                <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-xs font-pixel text-center">
                  YOUR SQUAD HAS CLAIMED ANOTHER
                </div>
              ) : isFull ? (
                <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-pixel text-center font-bold">
                  SEATS FULL (0 LEFT)
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedToConfirm}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#2463bf] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4" />
                  <span>CHOOSE THIS CHALLENGE →</span>
                </button>
              )}
            </>
          )}

        </div>

      </div>

    </div>
  );
}
