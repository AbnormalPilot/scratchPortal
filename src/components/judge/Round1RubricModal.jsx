import React, { useState } from 'react';
import api from '../../lib/api.js';
import {
  X,
  Award,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Gamepad2,
  CheckSquare,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function Round1RubricModal({ team, existingScore, onClose, onScoreSaved }) {
  // Start from 0 with no predefined filled grades unless previously scored
  const [basic, setBasic] = useState(existingScore?.basicWorkingScore ?? 0);
  const [visual, setVisual] = useState(existingScore?.visualSpritesScore ?? 0);
  const [creativity, setCreativity] = useState(existingScore?.creativityScore ?? 0);
  const [comments, setComments] = useState(existingScore?.comments ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        className="relative w-full max-w-4xl bg-white rounded-2xl border-4 border-[#4e97fe] p-6 sm:p-7 shadow-[8px_8px_0px_#bad6fc] my-6 max-h-[94vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b-2 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#4e97fe] text-white flex items-center justify-center font-bold shadow-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase font-bold">
                ROUND 1 EVALUATION RUBRIC (100 PTS)
              </span>
              <h2 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b] mt-0.5">
                EVALUATING: <span className="text-[#4e97fe]">{team.name}</span>
              </h2>
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
            
            {/* Assigned Quest Details */}
            <div className="p-4 rounded-xl bg-[#f8fbff] border-2 border-[#bad6fc] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-pixel text-[#4e97fe] uppercase">
                  ASSIGNED PROBLEM
                </span>
                <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-white text-[#64748b] border border-slate-200">
                  {challenge?.category || 'Game'}
                </span>
              </div>

              <h4 className="font-bold font-pixel text-xs sm:text-sm text-[#1e293b]">
                {challenge?.title || 'Problem Statement'}
              </h4>

              <p className="text-xs font-retro text-[#475569] leading-relaxed line-clamp-3">
                {challenge?.shortDescription || challenge?.fullDescription}
              </p>

              {/* Mandatory Checklist to Verify */}
              {Array.isArray(challenge?.requirements) && challenge.requirements.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 space-y-1">
                  <span className="text-[9px] font-pixel text-[#64748b] uppercase block">
                    MANDATORY GAME MECHANICS:
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {challenge.requirements.map((req, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] font-retro text-[#334155]">
                        <CheckSquare className="w-3.5 h-3.5 text-[#4e97fe] shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scratch Project Launcher */}
              {r1Sub?.scratchUrl ? (
                <a
                  href={r1Sub.scratchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 w-full py-2.5 px-3 rounded-xl bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] font-pixel text-xs flex items-center justify-center gap-1.5 transition-all shadow-[2px_2px_0px_#a4640c] font-black cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>LAUNCH SCRATCH PROJECT ↗</span>
                </a>
              ) : (
                <div className="mt-3 p-2.5 text-center rounded-xl bg-amber-50 text-amber-800 text-xs font-retro border border-amber-200 font-semibold">
                  ⚠️ No Scratch project URL submitted yet
                </div>
              )}
            </div>

            {/* Total Live Score Display */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-white to-[#f0f7ff] border-3 border-[#bad6fc] text-center shadow-sm">
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
                {total >= 80 ? '🌟 Outstanding Game' : total >= 60 ? '👍 Strong Implementation' : total > 0 ? '🔨 In Progress' : 'Unscored'}
              </p>
            </div>

          </div>

          {/* Right Column: 3 Clean Scoring Sliders + Exact Inputs (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Criterion 1: Core Mechanics (40 pts) */}
            <div className="p-4 rounded-xl bg-white border-2 border-slate-200 hover:border-[#4e97fe] transition-colors space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold font-pixel text-[#1e293b] block">
                    1. CORE MECHANICS & LOGIC
                  </span>
                  <span className="text-[11px] font-retro text-[#64748b]">
                    Player controls, collision, win/loss rules, score logic
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="40"
                    step="1"
                    value={basic}
                    onChange={(e) => handleScoreChange(setBasic, e.target.value, 40)}
                    className="w-14 px-2 py-1 rounded-lg border-2 border-[#bad6fc] text-right font-pixel text-xs font-bold text-[#4e97fe] focus:border-[#4e97fe] outline-none"
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
                className="w-full accent-[#4e97fe] h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Criterion 2: Visuals & Sprites (25 pts) */}
            <div className="p-4 rounded-xl bg-white border-2 border-slate-200 hover:border-[#4e97fe] transition-colors space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold font-pixel text-[#1e293b] block">
                    2. SPRITES & VISUAL DESIGN
                  </span>
                  <span className="text-[11px] font-retro text-[#64748b]">
                    Animation costumes, backdrop art, visual FX, UI layout
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="25"
                    step="1"
                    value={visual}
                    onChange={(e) => handleScoreChange(setVisual, e.target.value, 25)}
                    className="w-14 px-2 py-1 rounded-lg border-2 border-[#bad6fc] text-right font-pixel text-xs font-bold text-[#4e97fe] focus:border-[#4e97fe] outline-none"
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
                className="w-full accent-[#4e97fe] h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Criterion 3: Creativity & Polish (35 pts) */}
            <div className="p-4 rounded-xl bg-white border-2 border-slate-200 hover:border-[#4e97fe] transition-colors space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold font-pixel text-[#1e293b] block">
                    3. CREATIVITY & POLISH
                  </span>
                  <span className="text-[11px] font-retro text-[#64748b]">
                    Soundtrack/SFX, unique game twists, replay value, theme adherence
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="35"
                    step="1"
                    value={creativity}
                    onChange={(e) => handleScoreChange(setCreativity, e.target.value, 35)}
                    className="w-14 px-2 py-1 rounded-lg border-2 border-[#bad6fc] text-right font-pixel text-xs font-bold text-[#4e97fe] focus:border-[#4e97fe] outline-none"
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
                className="w-full accent-[#4e97fe] h-2 bg-slate-100 rounded-lg cursor-pointer"
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
