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
  Trophy,
  Sparkles,
  MessageSquare,
  Mic,
  Users,
} from 'lucide-react';

const QUICK_COMMENTS = [
  'Exceptional delivery, confidence, and slide structure!',
  'Deep and articulate explanation of Scratch scripts and broadcast blocks.',
  'Confident and precise answers to technical jury questions.',
  'Outstanding teamwork and balanced presentation between squad members.',
  'Innovative game mechanics and creative storytelling during live demo.',
  'Could elaborate more on edge-case collision logic and bug handling.',
];

export default function Round2RubricModal({ team, existingScore, onClose, onScoreSaved }) {
  const [pres, setPres] = useState(existingScore?.presentationQualityScore ?? 0);
  const [expl, setExpl] = useState(existingScore?.projectExplanationScore ?? 0);
  const [qa, setQa] = useState(existingScore?.technicalQaScore ?? 0);
  const [teamwork, setTeamwork] = useState(existingScore?.teamContributionScore ?? 0);
  const [comments, setComments] = useState(existingScore?.comments ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = Number((pres + expl + qa + teamwork).toFixed(1));
  const r1Sub = team?.submissions?.find((s) => s.roundNumber === 1) || team?.r1Submission;
  const r2Sub = team?.submissions?.find((s) => s.roundNumber === 2) || team?.r2Submission;
  const activeSub = r2Sub || r1Sub;

  const handleScoreChange = (setter, val, max) => {
    const num = Math.min(max, Math.max(0, Number(val) || 0));
    setter(num);
  };

  const handleQuickComment = (text) => {
    if (!comments.includes(text)) {
      setComments((prev) => (prev ? `${prev}\n• ${text}` : `• ${text}`));
    }
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
        className="relative w-full max-w-4xl bg-white rounded-3xl border-4 border-[#f6ab3c] p-6 sm:p-7 shadow-[8px_8px_0px_#fde68a] my-6 max-h-[94vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-3xl z-20 flex flex-col items-center justify-center space-y-3 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#f6ab3c] to-[#ffbe00] text-white flex items-center justify-center shadow-md border-2 border-white">
              <Mic className="w-6 h-6 text-white animate-pulse" />
            </div>
            <p className="text-xs font-bold font-pixel text-[#1e293b]">TRANSMITTING ROUND 2 EVALUATION...</p>
            <p className="text-[11px] font-retro text-[#64748b]">Saving finalist pitch scores and updating grand champion rankings...</p>
            <div className="w-48 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
              <div className="h-full rounded-full bg-[#f6ab3c] animate-pulse w-full" />
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b-2 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f6ab3c] to-[#ffbe00] text-white flex items-center justify-center shadow-[2px_2px_0px_#a4640c] shrink-0 border border-white">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-amber-50 text-[#f6ab3c] border border-amber-200 uppercase font-black flex items-center gap-1">
                  <Trophy className="w-2.5 h-2.5 text-[#f6ab3c]" />
                  ROUND 2 FINALIST LIVE PITCH (100 PTS)
                </span>
                {team.r2PresentationSlot && (
                  <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                    SLOT #{team.r2PresentationSlot}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] mt-0.5">
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
          
          {/* Left Column: Team Profile & Score Totalizer (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Assigned Problem Statement Card */}
            <div className="p-4 rounded-2xl bg-[#fffbf2] border-2 border-[#fde68a] space-y-2.5">
              <span className="text-[10px] font-pixel text-[#f6ab3c] uppercase block font-bold">
                ASSIGNED PROBLEM STATEMENT
              </span>
              <h4 className="font-bold font-pixel text-xs sm:text-sm text-[#1e293b]">
                {team.challenge?.title || 'Problem Statement'}
              </h4>
              <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                {team.challenge?.shortDescription}
              </p>

              {/* Round 1 Score Benchmark */}
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs font-retro">
                <span className="text-[#64748b] font-pixel text-[10px] uppercase flex items-center gap-1">
                  <Award className="w-3 h-3 text-[#4e97fe]" /> Round 1 Sprint Score:
                </span>
                <span className="font-bold font-pixel text-xs text-[#4e97fe]">
                  {team.round1Score ? `${team.round1Score} / 100 PTS` : 'Ungraded'}
                </span>
              </div>

              {/* Direct Scratch Project Link */}
              {activeSub?.scratchUrl && (
                <a
                  href={activeSub.scratchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 w-full py-2.5 px-3 rounded-xl bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] font-pixel text-xs flex items-center justify-center gap-1.5 transition-all shadow-[2px_2px_0px_#a4640c] font-black cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>OPEN SCRATCH PROJECT ↗</span>
                </a>
              )}
            </div>

            {/* Total Round 2 Score Display */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-white via-[#fffdfa] to-[#fff8ec] border-3 border-[#fde68a] text-center shadow-sm space-y-2">
              <span className="text-[10px] font-pixel text-[#64748b] uppercase block font-bold">
                TOTAL ROUND 2 PITCH SCORE
              </span>
              <div className="flex items-baseline justify-center gap-1 my-1">
                <span className="text-4xl sm:text-5xl font-black font-pixel text-[#f6ab3c]">
                  {total}
                </span>
                <span className="text-sm font-pixel text-[#64748b]">/ 100</span>
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-pixel font-bold">
                {total >= 90
                  ? 'Grand Champion Contender'
                  : total >= 80
                  ? 'Podium Contender'
                  : total >= 65
                  ? 'Strong Finalist Pitch'
                  : total > 0
                  ? 'Evaluation In Progress'
                  : 'Unscored'}
              </div>
            </div>

            {/* Quick Feedback Suggestions */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-pixel text-[#64748b] uppercase block font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#f6ab3c]" /> Quick Feedback Tags:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_COMMENTS.map((qc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickComment(qc)}
                    className="text-[10px] font-retro text-left px-2 py-1 rounded-lg bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-all cursor-pointer"
                  >
                    {qc}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: 4 Rubric Criteria with Sliders & Number Steppers (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. Presentation Quality & Clarity (30 pts) */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#f6ab3c] transition-colors space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold font-pixel text-[#1e293b] block">
                    1. PRESENTATION QUALITY & DELIVERY
                  </span>
                  <span className="text-[11px] font-retro text-[#64748b]">
                    Confidence, communication clarity, slide visual design, structured speech
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
              <div className="flex items-center justify-between text-[10px] font-pixel text-slate-400">
                <span>0 PTS</span>
                <span>15 PTS</span>
                <span>MAX 30 PTS</span>
              </div>
            </div>

            {/* 2. Project Architecture & Code Walkthrough (40 pts) */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#f6ab3c] transition-colors space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold font-pixel text-[#1e293b] block">
                    2. PROJECT & CODE WALKTHROUGH
                  </span>
                  <span className="text-[11px] font-retro text-[#64748b]">
                    Explanation of Scratch scripts, broadcast messages, game loop, and logic
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
              <div className="flex items-center justify-between text-[10px] font-pixel text-slate-400">
                <span>0 PTS</span>
                <span>20 PTS</span>
                <span>MAX 40 PTS</span>
              </div>
            </div>

            {/* 3. Technical Q&A Response (20 pts) */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#f6ab3c] transition-colors space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold font-pixel text-[#1e293b] block">
                    3. TECHNICAL Q&A RESPONSE
                  </span>
                  <span className="text-[11px] font-retro text-[#64748b]">
                    Depth of answers to judge questions, handling challenging mechanics
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
              <div className="flex items-center justify-between text-[10px] font-pixel text-slate-400">
                <span>0 PTS</span>
                <span>10 PTS</span>
                <span>MAX 20 PTS</span>
              </div>
            </div>

            {/* 4. Team Collaboration & Synergy (10 pts) */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#f6ab3c] transition-colors space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold font-pixel text-[#1e293b] block">
                    4. TEAMWORK & ROLE SYNERGY
                  </span>
                  <span className="text-[11px] font-retro text-[#64748b]">
                    Equal contribution, respectful handoffs, balanced member speaking time
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
              <div className="flex items-center justify-between text-[10px] font-pixel text-slate-400">
                <span>0 PTS</span>
                <span>5 PTS</span>
                <span>MAX 10 PTS</span>
              </div>
            </div>

            {/* Feedback Comments */}
            <div>
              <label className="block text-xs font-bold font-pixel text-[#1e293b] mb-1">
                FINALIST JURY FEEDBACK & COMMENTS :
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share strengths, constructive tips, and final thoughts for the finalists..."
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-retro text-[#1e293b] focus:border-[#f6ab3c] outline-none resize-none"
              />
            </div>

            {/* Actions Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-pixel transition-all cursor-pointer flex items-center gap-1.5 font-bold"
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
