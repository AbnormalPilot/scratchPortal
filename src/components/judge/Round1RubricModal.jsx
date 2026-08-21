import React, { useState, useEffect } from 'react';
import api from '../../lib/api.js';
import {
  X,
  Award,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Save,
  Send,
  Gamepad2,
  CheckSquare,
  Sparkles,
  Layers,
  BookOpen,
  Film,
  Zap,
  Cpu,
} from 'lucide-react';

export default function Round1RubricModal({ team, existingScore, onClose, onScoreSaved }) {
  // Start from 0 with no predefined filled grades unless previously scored
  const [basic, setBasic] = useState(existingScore?.basicWorkingScore ?? 0);
  const [visual, setVisual] = useState(existingScore?.visualSpritesScore ?? 0);
  const [creativity, setCreativity] = useState(existingScore?.creativityScore ?? 0);
  const [comments, setComments] = useState(existingScore?.comments ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twists, setTwists] = useState([]);

  useEffect(() => {
    const fetchTwists = async () => {
      try {
        const res = await api.get('/twists');
        if (res.twists) {
          setTwists(res.twists);
        }
      } catch (err) {
        console.error('Failed to load twists for judge:', err);
      }
    };
    fetchTwists();
  }, []);

  const total = Number((basic + visual + creativity).toFixed(1));
  const r1Sub = team?.submissions?.find((s) => s.roundNumber === 1) || team?.r1Submission;
  const challenge = team?.challenge;

  const handleScoreChange = (setter, val, max) => {
    const num = Math.min(max, Math.max(0, Number(val) || 0));
    setter(num);
  };

  const handleSubmit = async (isFinal = true) => {
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/judge/score/r1', {
        teamId: team.id,
        basicWorkingScore: basic,
        visualSpritesScore: visual,
        creativityScore: creativity,
        comments,
        isFinal,
      });

      if (onScoreSaved) onScoreSaved(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit score.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-3xl border-4 border-[#4e97fe] p-6 sm:p-7 shadow-[8px_8px_0px_#bad6fc] my-6 max-h-[94vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-3xl z-20 flex flex-col items-center justify-center space-y-3 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#4e97fe] to-[#2563eb] text-white flex items-center justify-center shadow-md border-2 border-white">
              <Award className="w-6 h-6 text-white animate-pulse" />
            </div>
            <p className="text-xs font-bold font-pixel text-[#1e293b]">TRANSMITTING JUDGE EVALUATION...</p>
            <p className="text-[11px] font-retro text-[#64748b]">Saving rubric scores and updating leaderboard standing...</p>
            <div className="w-48 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
              <div className="h-full rounded-full bg-[#4e97fe] animate-pulse w-full" />
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b-2 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#10b981] to-[#059669] text-white flex items-center justify-center font-bold shadow-[2px_2px_0px_#065f46] border-2 border-white shrink-0">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                  ROUND 1 RUBRIC
                </h2>
                <span className="text-[10px] font-pixel px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                  100 POINTS TOTAL
                </span>
              </div>
              <p className="text-xs font-retro text-[#64748b] mt-0.5">
                Build Challenge — Evaluating <strong className="text-[#4e97fe] font-pixel">{team.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-retro flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* Left Column: Challenge Brief, Mechanics, Scratch Launcher (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Assigned Theme Details */}
            <div className="p-4 rounded-2xl bg-[#f8fbff] border-2 border-[#bad6fc] space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ffbe00]" />
                <span className="text-[10px] font-pixel text-[#4e97fe] uppercase font-bold">
                  ASSIGNED THEME
                </span>
              </div>

              <h4 className="font-bold font-pixel text-xs sm:text-sm text-[#1e293b]">
                {challenge?.title || 'Creative Theme'}
              </h4>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-3xs">
                <span className="text-[9px] font-pixel text-[#64748b] uppercase block font-bold mb-1">
                  THEME EXAMPLE & CONCEPT:
                </span>
                <p className="text-xs font-retro text-[#334155] leading-relaxed">
                  {challenge?.fullDescription || challenge?.shortDescription}
                </p>
              </div>

              {/* Released Mid-Sprint Twists (Bonus Objectives) */}
              {twists.length > 0 && (
                <div className="pt-2.5 border-t border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-pixel text-[#b45309] uppercase flex items-center gap-1 font-black">
                      <Zap className="w-3 h-3 fill-amber-500 text-amber-600" /> RELEASED SURPRISE TWISTS:
                    </span>
                    <span className="text-[8px] font-pixel px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                      BONUS
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {twists.map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-amber-50/90 border border-amber-300 text-left space-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold font-pixel text-slate-800">
                            {t.title}
                          </span>
                          <span className="text-[9px] font-pixel font-black px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 shrink-0">
                            +{t.bonusPoints} PTS
                          </span>
                        </div>
                        <p className="text-[11px] font-retro text-slate-600 leading-snug">
                          {t.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Short Description & Game Pitch */}
              {r1Sub?.shortDescription && (
                <div className="pt-2 border-t border-slate-200/60 space-y-1">
                  <span className="text-[9px] font-pixel text-[#4e97fe] uppercase flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> GAME STORY & DESCRIPTION :
                  </span>
                  <div className="text-xs font-retro text-[#334155] bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed max-h-36 overflow-y-auto break-all break-words whitespace-pre-wrap">
                    {r1Sub.shortDescription}
                  </div>
                </div>
              )}

              {/* Video Demo File & Pitch Link */}
              {r1Sub && (r1Sub.videoUrl || r1Sub.videoFileUrl) && (
                <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                  <span className="text-[9px] font-pixel text-[#4e97fe] uppercase flex items-center gap-1">
                    <Film className="w-3 h-3" /> GAMEPLAY DEMO VIDEO :
                  </span>
                  
                  {r1Sub.videoFileUrl ? (
                    <div className="space-y-1.5">
                      <video
                        src={r1Sub.videoFileUrl}
                        controls
                        className="w-full rounded-xl border border-slate-300 max-h-44 bg-black shadow-inner"
                        preload="metadata"
                      >
                        Your browser does not support video preview.
                      </video>
                      <a
                        href={r1Sub.videoFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-pixel text-[#4e97fe] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Open Video in New Tab
                      </a>
                    </div>
                  ) : r1Sub.videoUrl ? (
                    <a
                      href={r1Sub.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg bg-[#f0f7ff] border border-[#bad6fc] text-xs font-pixel text-[#4e97fe] flex items-center justify-between hover:bg-[#e0efff] transition-all"
                    >
                      <span className="truncate">Watch Video Demo Link</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ) : null}
                </div>
              )}
            </div>

            {/* Launch Scratch Project in New Tab */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-pixel text-[#64748b] uppercase block font-bold">
                SCRATCH PROJECT LINK
              </span>
              {r1Sub?.scratchUrl ? (
                <a
                  href={r1Sub.scratchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ffbe00] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] text-[#141720] font-pixel text-xs font-black shadow-[2px_2px_0px_#a4640c] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>OPEN PROJECT IN SCRATCH</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div className="mt-3 p-2.5 text-center rounded-xl bg-amber-50 text-amber-800 text-xs font-retro border border-amber-200 font-semibold flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>No Scratch project URL submitted yet</span>
                </div>
              )}
            </div>

            {/* Total Live Score Display */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-[#f0f7ff] border-3 border-[#bad6fc] text-center shadow-sm">
              <span className="text-[10px] font-pixel text-[#64748b] uppercase block">
                TOTAL ROUND 1 SCORE
              </span>
              <div className="flex items-baseline justify-center gap-1 my-1">
                <span className="text-3xl sm:text-4xl font-black font-pixel text-[#4e97fe]">
                  {total}
                </span>
                <span className="text-xs font-pixel text-[#64748b]">/ 100</span>
              </div>
              <p className="text-[11px] font-retro text-[#64748b]">
                {total >= 80 ? 'Outstanding Game' : total >= 60 ? 'Strong Implementation' : total > 0 ? 'In Progress' : 'Unscored'}
              </p>
            </div>

          </div>

          {/* Right Column: 3 Official Rubric Scoring Cards + Sliders + Callout Box (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Criterion 1: BASIC GAME WORKING (40%) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-rose-300 transition-colors shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold font-pixel text-[#1e293b] block tracking-tight">
                      BASIC GAME WORKING
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-pixel text-[#f43f5e]">
                      40%
                    </span>
                  </div>
                  <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                    Core gameplay, controls, win/lose state, required mechanics, stability
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="40"
                    step="1"
                    value={basic}
                    onChange={(e) => handleScoreChange(setBasic, e.target.value, 40)}
                    className="w-14 px-2 py-1 rounded-lg border-2 border-rose-200 text-right font-pixel text-xs font-bold text-rose-600 focus:border-rose-400 outline-none"
                  />
                  <span className="text-xs font-pixel text-[#64748b]">/ 40</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={basic}
                onChange={(e) => setBasic(Number(e.target.value))}
                className="w-full accent-rose-500 h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Criterion 2: SPRITES & VISUAL IMPLEMENTATION (25%) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-pink-300 transition-colors shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold font-pixel text-[#1e293b] block tracking-tight">
                      SPRITES & VISUAL IMPLEMENTATION
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-pixel text-[#ec4899]">
                      25%
                    </span>
                  </div>
                  <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                    Appropriate sprites, backgrounds, sound, readability, animation and use of Scratch assets
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="25"
                    step="1"
                    value={visual}
                    onChange={(e) => handleScoreChange(setVisual, e.target.value, 25)}
                    className="w-14 px-2 py-1 rounded-lg border-2 border-pink-200 text-right font-pixel text-xs font-bold text-pink-600 focus:border-pink-400 outline-none"
                  />
                  <span className="text-xs font-pixel text-[#64748b]">/ 25</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={visual}
                onChange={(e) => setVisual(Number(e.target.value))}
                className="w-full accent-pink-500 h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Criterion 3: CREATIVITY & GAME DESIGN (35%) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-300 transition-colors shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold font-pixel text-[#1e293b] block tracking-tight">
                      CREATIVITY & GAME DESIGN
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-pixel text-[#eab308]">
                      35%
                    </span>
                  </div>
                  <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                    Originality, engagement, clever mechanics, challenge balance and interpretation of the statement
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="35"
                    step="1"
                    value={creativity}
                    onChange={(e) => handleScoreChange(setCreativity, e.target.value, 35)}
                    className="w-14 px-2 py-1 rounded-lg border-2 border-amber-200 text-right font-pixel text-xs font-bold text-amber-600 focus:border-amber-400 outline-none"
                  />
                  <span className="text-xs font-pixel text-[#64748b]">/ 35</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="35"
                step="1"
                value={creativity}
                onChange={(e) => setCreativity(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Judge Feedback Comments */}
            <div>
              <label className="block text-xs font-bold font-pixel text-[#1e293b] mb-1">
                JUDGE CONSTRUCTIVE FEEDBACK (OPTIONAL) :
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share strengths and tips for sprite animation, mechanics, or game balance..."
                className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-200 text-xs font-retro text-[#1e293b] focus:border-[#4e97fe] outline-none resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-pixel transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>SAVE DRAFT</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#2463bf] flex items-center gap-2 cursor-pointer disabled:opacity-50 font-black"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'SUBMITTING...' : `SUBMIT SCORE (${total} / 100)`}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
