import React, { useState } from 'react';
import api from '../../lib/api.js';
import { X, Award, ExternalLink, AlertCircle, Send, Presentation } from 'lucide-react';

export default function Round2RubricModal({ team, existingScore, onClose, onScoreSaved }) {
  const [pres, setPres] = useState(existingScore?.presentationQualityScore ?? 25);
  const [expl, setExpl] = useState(existingScore?.projectExplanationScore ?? 35);
  const [qa, setQa] = useState(existingScore?.technicalQaScore ?? 18);
  const [teamwork, setTeamwork] = useState(existingScore?.teamContributionScore ?? 9);
  const [comments, setComments] = useState(existingScore?.comments ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = Number((pres + expl + qa + teamwork).toFixed(2));
  const r1Sub = team?.submissions?.find((s) => s.roundNumber === 1) || team?.r1Submission;

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

      onScoreSaved(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit Round 2 score.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl border-2 border-[#bad6fc] p-6 sm:p-8 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f6ab3c] text-white flex items-center justify-center font-bold">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#f6ab3c] tracking-wider">Round 2 Finalist Presentation</span>
              <h2 className="text-base sm:text-lg font-bold text-[#1e293b]">
                Evaluating Finalist: <span className="text-[#4e97fe]">{team.name}</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Team Profile & R1 Performance (5 cols) */}
          <div className="md:col-span-5 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#f0f7ff] border border-[#bad6fc]">
              <span className="text-[10px] font-mono text-[#64748b] uppercase block mb-1">Finalist Slot</span>
              <h4 className="font-bold text-[#1e293b] text-sm">Slot #{team.r2PresentationSlot || 1} • {team.challenge?.title}</h4>
              
              <div className="mt-3 p-3 rounded-lg bg-white border border-[#bad6fc] flex items-center justify-between">
                <span className="text-[#64748b]">Round 1 Score:</span>
                <span className="font-mono font-bold text-[#4e97fe]">{team.cachedR1Score ?? team.round1Score ?? '--'} / 100</span>
              </div>

              {r1Sub?.scratchUrl && (
                <a
                  href={r1Sub.scratchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 w-full py-2 px-3 rounded-lg bg-[#4e97fe] hover:bg-[#3c86ee] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Scratch Project
                </a>
              )}
            </div>

            {/* Total Score Badge */}
            <div className="p-4 rounded-xl bg-white border-2 border-[#bad6fc] text-center">
              <span className="text-[10px] font-bold text-[#64748b] uppercase block">Total Round 2 Score</span>
              <div className="text-3xl font-black text-[#f6ab3c] mt-1">
                {total} <span className="text-sm font-semibold text-[#64748b]">/ 100</span>
              </div>
            </div>
          </div>

          {/* Right Column: 4 Rubric Sliders (7 cols) */}
          <div className="md:col-span-7 space-y-3.5">
            
            {/* 1. Presentation Quality */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-[#1e293b] mb-1">
                <span>1. Presentation Quality</span>
                <span className="text-[#f6ab3c]">{pres} / 30 pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={pres}
                onChange={(e) => setPres(Number(e.target.value))}
                className="w-full accent-[#f6ab3c] cursor-pointer"
              />
            </div>

            {/* 2. Project Explanation */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-[#1e293b] mb-1">
                <span>2. Code & Logic Explanation</span>
                <span className="text-[#f6ab3c]">{expl} / 40 pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={expl}
                onChange={(e) => setExpl(Number(e.target.value))}
                className="w-full accent-[#f6ab3c] cursor-pointer"
              />
            </div>

            {/* 3. Technical Q&A */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-[#1e293b] mb-1">
                <span>3. Technical Q&A Defense</span>
                <span className="text-[#f6ab3c]">{qa} / 20 pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={qa}
                onChange={(e) => setQa(Number(e.target.value))}
                className="w-full accent-[#f6ab3c] cursor-pointer"
              />
            </div>

            {/* 4. Team Contribution */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-[#1e293b] mb-1">
                <span>4. Team Contribution & Sync</span>
                <span className="text-[#f6ab3c]">{teamwork} / 10 pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={teamwork}
                onChange={(e) => setTeamwork(Number(e.target.value))}
                className="w-full accent-[#f6ab3c] cursor-pointer"
              />
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs font-bold text-[#1e293b] mb-1">
                Judge Comments (Optional)
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Clear communication, balanced team contribution..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-[#1e293b] focus:border-[#f6ab3c] outline-none resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#f6ab3c] hover:bg-[#e69828] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Submit Finalist Score ({total} / 100)
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
