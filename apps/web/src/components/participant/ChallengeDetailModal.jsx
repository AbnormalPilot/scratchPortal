import { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Flame,
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
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#ffbe00]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold font-pixel tracking-wide text-white">
                THEME DETAILS & SELECTION
              </h3>
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
                  LOCK IN THEME "{challenge.title.toUpperCase()}" ?
                </h3>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 text-left max-w-md mx-auto space-y-2">
                <p className="text-xs sm:text-sm font-retro text-amber-900 leading-relaxed font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="underline">IMPORTANT NOTICE:</span>
                </p>
                <p className="text-xs font-retro text-amber-800 leading-relaxed">
                  Once your squad claims this theme, your choice is <strong>final and locked</strong>. You cannot switch to another theme during the hackathon.
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

                {/* 4 Segmented Visual Slot Indicators */}
                <div className="mt-3 pt-2.5 border-t border-black/5 space-y-1.5">
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: totalCapacity }).map((_, slotIdx) => {
                      const isClaimed = slotIdx < claimed;
                      return (
                        <div
                          key={slotIdx}
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            isClaimed
                              ? isFull
                                ? 'bg-rose-500 shadow-xs'
                                : 'bg-emerald-500 shadow-xs'
                              : 'bg-slate-200/90 border border-slate-300/60'
                          }`}
                          title={isClaimed ? `Seat ${slotIdx + 1}: Claimed` : `Seat ${slotIdx + 1}: Available`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-pixel text-slate-500 font-bold">
                    <span>SEAT SLOTS (1 TO {totalCapacity})</span>
                    <span>{claimed} / {totalCapacity} CLAIMED ({percentFilled}%)</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* STEP 1: Full Theme Details */
            <>
              {/* Theme Title */}
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

              {/* Creative Example & Theme Inspiration */}
              <div className="p-4 sm:p-5 bg-[#f8fbff] rounded-xl border-2 border-[#bad6fc] space-y-2.5 text-left">
                <span className="font-pixel text-[10px] text-[#4e97fe] uppercase font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#ffbe00]" />
                  CREATIVE EXAMPLE & INSPIRATION:
                </span>
                <div className="p-3.5 rounded-xl bg-white border border-[#bad6fc] shadow-2xs">
                  <p className="text-xs sm:text-sm font-retro text-[#1e293b] leading-relaxed font-bold">
                    {challenge.fullDescription || challenge.shortDescription}
                  </p>
                </div>
                <p className="text-[11px] font-retro text-[#64748b] leading-relaxed">
                  💡 <em>Note: This is an example concept. Your squad has full creative freedom to interpret this theme and build any innovative game mechanics you imagine!</em>
                </p>
              </div>

              {/* Claimed Squads (Visible to Admin & Judges) */}
              {!isParticipant && Array.isArray(challenge.teams) && challenge.teams.length > 0 && (
                <div className="p-3.5 bg-white rounded-xl border-2 border-[#bad6fc] space-y-2 text-left">
                  <span className="font-pixel text-[10px] text-[#1e293b] flex items-center gap-1.5 uppercase font-bold">
                    <Users className="w-3.5 h-3.5 text-[#4e97fe]" />
                    SQUADS THAT CLAIMED THIS THEME ({challenge.teams.length} / {challenge.maxCapacity}):
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
                  <span>LOCKING IN THEME...</span>
                ) : (
                  <>
                    <Flame className="w-4 h-4 fill-white" />
                    <span>YES, CONFIRM & CLAIM THEME</span>
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
                  <span>ALREADY YOUR SQUAD'S THEME</span>
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
                  <span>CHOOSE THIS THEME →</span>
                </button>
              )}
            </>
          )}

        </div>

      </div>

    </div>
  );
}
