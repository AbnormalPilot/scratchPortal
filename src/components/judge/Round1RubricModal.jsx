import React, { useState } from 'react';
import api from '../../lib/api.js';
import { X, Award, ExternalLink, CheckCircle2, AlertCircle, Save, Send } from 'lucide-react';

export default function Round1RubricModal({ team, existingScore, onClose, onScoreSaved }) {
  const [basic, setBasic] = useState(existingScore?.basicWorkingScore ?? 35);
  const [visual, setVisual] = useState(existingScore?.visualSpritesScore ?? 20);
  const [creativity, setCreativity] = useState(existingScore?.creativityScore ?? 30);
  const [comments, setComments] = useState(existingScore?.comments ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = Number((basic + visual + creativity).toFixed(2));
  const r1Sub = team?.submissions?.find((s) => s.roundNumber === 1) || team?.r1Submission;

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

      onScoreSaved(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit score.');
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
            <div className="w-10 h-10 rounded-xl bg-[#4e97fe] text-white flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#4e97fe] tracking-wider">Round 1 Rubric</span>
              <h2 className="text-base sm:text-lg font-bold text-[#1e293b]">
                Evaluating: <span className="text-[#4e97fe]">{team.name}</span>
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
          
          {/* Left Column: Challenge Brief & Link (5 cols) */}
          <div className="md:col-span-5 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#f0f7ff] border border-[#bad6fc]">
              <span className="text-[10px] font-mono text-[#64748b] uppercase block mb-1">Assigned Challenge</span>
              <h4 className="font-bold text-[#1e293b] text-sm">{team.challenge?.title}</h4>
              <p className="text-[#64748b] mt-1 text-[11px] leading-relaxed">
                {team.challenge?.shortDescription}
              </p>

              {r1Sub?.scratchUrl ? (
                <a
                  href={r1Sub.scratchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 w-full py-2 px-3 rounded-lg bg-[#4e97fe] hover:bg-[#3c86ee] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Launch Scratch Game
                </a>
              ) : (
                <div className="mt-3 p-2 text-center rounded bg-amber-50 text-amber-800 text-[11px] border border-amber-200 font-semibold">
                  No Scratch project link submitted yet
                </div>
              )}
            </div>

            {/* Total Score Badge */}
            <div className="p-4 rounded-xl bg-white border-2 border-[#bad6fc] text-center">
              <span className="text-[10px] font-bold text-[#64748b] uppercase block">Total Round 1 Score</span>
              <div className="text-3xl font-black text-[#4e97fe] mt-1">
                {total} <span className="text-sm font-semibold text-[#64748b]">/ 100</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Sliders (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            
            {/* 1. Basic Working */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-[#1e293b] mb-1">
                <span>1. Basic Game Working</span>
                <span className="text-[#4e97fe]">{basic} / 40 pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={basic}
                onChange={(e) => setBasic(Number(e.target.value))}
                className="w-full accent-[#4e97fe] cursor-pointer"
              />
            </div>

            {/* 2. Visuals & Sprites */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-[#1e293b] mb-1">
                <span>2. Sprites & Visual Design</span>
                <span className="text-[#4e97fe]">{visual} / 25 pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={visual}
                onChange={(e) => setVisual(Number(e.target.value))}
                className="w-full accent-[#4e97fe] cursor-pointer"
              />
            </div>

            {/* 3. Creativity */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-[#1e293b] mb-1">
                <span>3. Creativity & Polish</span>
                <span className="text-[#4e97fe]">{creativity} / 35 pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={35}
                step={1}
                value={creativity}
                onChange={(e) => setCreativity(Number(e.target.value))}
                className="w-full accent-[#4e97fe] cursor-pointer"
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
                placeholder="Great sprite animations and smooth physics..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-[#1e293b] focus:border-[#4e97fe] outline-none resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Submit Score ({total} / 100)
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
