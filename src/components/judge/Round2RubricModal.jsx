import React, { useState } from 'react';
import api from '../../lib/api.js';
import {
  X,
  Award,
  ExternalLink,
  AlertCircle,
  Send,
  Presentation,
  Save,
  CheckCircle2,
} from 'lucide-react';

export default function Round2RubricModal({ team, existingScore, onClose, onScoreSaved }) {
  // Start from 0 with no predefined filled grades unless previously scored
  const [pres, setPres] = useState(existingScore?.presentationQualityScore ?? 0);
  const [expl, setExpl] = useState(existingScore?.projectExplanationScore ?? 0);
  const [qa, setQa] = useState(existingScore?.technicalQaScore ?? 0);
  const [teamwork, setTeamwork] = useState(existingScore?.teamContributionScore ?? 0);
  const [comments, setComments] = useState(existingScore?.comments ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = Number((pres + expl + qa + teamwork).toFixed(1));
  const r1Sub = team?.submissions?.find((s) => s.roundNumber === 1) || team?.r1Submission;

  const handleScoreChange = (setter, val, max) => {
    const num = Math.min(max, Math.max(0, Number(val) || 0));
    setter(num);
  };

  const handleSubmit = async (isFinal = true) => {
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/judge/score/r2', {
        teamId: team.id,
        presentationQualityScore: pres,
        projectExplanationScore: expl,
        technicalQaScore: qa,
        teamContributionScore: teamwork,
        comments,
        isFinal,
      });

      if (onScoreSaved) onScoreSaved(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit Round 2 score.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-2xl border-4 border-[#f6ab3c] p-6 sm:p-7 shadow-[8px_8px_0px_#fde68a] my-6 max-h-[94vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b-2 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#f6ab3c] text-white flex items-center justify-center font-bold shadow-sm">
              <Presentation className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-amber-50 text-[#f6ab3c] border border-amber-200 uppercase font-bold">
                ROUND 2 FINALIST LIVE PRESENTATION (100 PTS)
              </span>
              <h2 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b] mt-0.5">
                EVALUATING FINALIST: <span className="text-[#4e97fe]">{team.name}</span>
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
          
          {/* Left Column: Challenge Brief & Scratch Link (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="p-4 rounded-xl bg-[#fffbf2] border-2 border-[#fde68a] space-y-2.5">
              <span className="text-[10px] font-pixel text-[#f6ab3c] uppercase block">
                ASSIGNED CHALLENGE
              </span>
              <h4 className="font-bold font-pixel text-xs sm:text-sm text-[#1e293b]">
                {team.challenge?.title || 'Problem Statement'}
              </h4>
              <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                {team.challenge?.shortDescription}
              </p>

              {r1Sub?.scratchUrl && (
                <a
                  href={r1Sub.scratchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 w-full py-2.5 px-3 rounded-xl bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] font-pixel text-xs flex items-center justify-center gap-1.5 transition-all shadow-[2px_2px_0px_#a4640c] font-black cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>VIEW SCRATCH PROJECT ↗</span>
                </a>
              )}
            </div>

            {/* Total Round 2 Score Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-white to-[#fffbf2] border-3 border-[#fde68a] text-center shadow-sm">
              <span className="text-[10px] font-pixel text-[#64748b] uppercase block">
                TOTAL ROUND 2 SCORE
              </span>
              <div className="flex items-baseline justify-center gap-1 my-1">
                <span className="text-3xl sm:text-4xl font-black font-pixel text-[#f6ab3c]">
                  {total}
                </span>
                <span className="text-xs font-pixel text-[#64748b]">/ 100</span>
              </div>
              <p className="text-[11px] font-retro text-[#64748b]">
                {total >= 80 ? '🏆 Championship Material' : total >= 60 ? '✨ Great Presentation' : total > 0 ? '🎙️ In Progress' : 'Unscored'}
              </p>
            </div>

          </div>

          {/* Right Column: 4 Criteria Sliders + Exact Inputs (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. Presentation Quality (30 pts) */}
            <div className="p-3.5 rounded-xl bg-white border-2 border-slate-200 hover:border-[#f6ab3c] transition-colors space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold font-pixel text-[#1e293b] block">
                    1. PRESENTATION QUALITY & CLARITY
                  </span>
                  <span className="text-[11px] font-retro text-[#64748b]">
                    Confidence, communication, slide visuals, structured flow
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="1"
                    value={pres}
                    onChange={(e) => handleScoreChange(setPres, e.target.value, 30)}
                    className="w-14 px-2 py-1 rounded-lg border-2 border-amber-300 text-right font-pixel text-xs font-bold text-[#f6ab3c] focus:border-[#f6ab3c] outline-none"
                  />
                  <span className="text-xs font-pixel text-[#64748b]">/ 30</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={pres}
                onChange={(e) => setPres(Number(e.target.value))}
                className="w-full accent-[#f6ab3c] h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* 2. Project Explanation (40 pts) */}
            <div className="p-3.5 rounded-xl bg-white border-2 border-slate-200 hover:border-[#f6ab3c] transition-colors space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold font-pixel text-[#1e293b] block">
                    2. PROJECT & CODE EXPLANATION
                  </span>
                  <span className="text-[11px] font-retro text-[#64748b]">
                    Explanation of Scratch scripts, logic flow, bug handling, creative design
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="40"
                    step="1"
                    value={expl}
                    onChange={(e) => handleScoreChange(setExpl, e.target.value, 40)}
                    className="w-14 px-2 py-1 rounded-lg border-2 border-amber-300 text-right font-pixel text-xs font-bold text-[#f6ab3c] focus:border-[#f6ab3c] outline-none"
                  />
                  <span className="text-xs font-pixel text-[#64748b]">/ 40</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={expl}
                onChange={(e) => setExpl(Number(e.target.value))}
                className="w-full accent-[#f6ab3c] h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* 3. Technical Q&A (20 pts) */}
            <div className="p-3.5 rounded-xl bg-white border-2 border-slate-200 hover:border-[#f6ab3c] transition-colors space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold font-pixel text-[#1e293b] block">
                    3. TECHNICAL Q&A RESPONSE
                  </span>
                  <span className="text-[11px] font-retro text-[#64748b]">
                    Direct answers to judges' questions, technical depth
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="1"
                    value={qa}
                    onChange={(e) => handleScoreChange(setQa, e.target.value, 20)}
                    className="w-14 px-2 py-1 rounded-lg border-2 border-amber-300 text-right font-pixel text-xs font-bold text-[#f6ab3c] focus:border-[#f6ab3c] outline-none"
                  />
                  <span className="text-xs font-pixel text-[#64748b]">/ 20</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={qa}
                onChange={(e) => setQa(Number(e.target.value))}
                className="w-full accent-[#f6ab3c] h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* 4. Teamwork & Collaboration (10 pts) */}
            <div className="p-3.5 rounded-xl bg-white border-2 border-slate-200 hover:border-[#f6ab3c] transition-colors space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold font-pixel text-[#1e293b] block">
                    4. TEAMWORK & ROLE DISTRIBUTION
                  </span>
                  <span className="text-[11px] font-retro text-[#64748b]">
                    Balanced member contribution and squad synergy
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="1"
                    value={teamwork}
                    onChange={(e) => handleScoreChange(setTeamwork, e.target.value, 10)}
                    className="w-14 px-2 py-1 rounded-lg border-2 border-amber-300 text-right font-pixel text-xs font-bold text-[#f6ab3c] focus:border-[#f6ab3c] outline-none"
                  />
                  <span className="text-xs font-pixel text-[#64748b]">/ 10</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={teamwork}
                onChange={(e) => setTeamwork(Number(e.target.value))}
                className="w-full accent-[#f6ab3c] h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Feedback Comments */}
            <div>
              <label className="block text-xs font-bold font-pixel text-[#1e293b] mb-1">
                FINALIST JUDGE COMMENTS :
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Final thoughts, compliments, and constructive pointers..."
                className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-200 text-xs font-retro text-[#1e293b] focus:border-[#f6ab3c] outline-none resize-none"
              />
            </div>

            {/* Actions */}
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
                className="px-6 py-2.5 rounded-xl bg-[#f6ab3c] hover:bg-[#e69828] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#a4640c] flex items-center gap-2 cursor-pointer disabled:opacity-50 font-black"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'SUBMITTING...' : `SUBMIT FINAL SCORE (${total} / 100)`}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
