import React, { useState } from 'react';
import { api } from '../../lib/api.js';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-panel rounded-2xl border border-purple-500/40 p-6 sm:p-8 shadow-2xl shadow-purple-950/40 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-purple-400 tracking-wider">Round 1 Evaluation Studio</span>
              <h2 className="text-lg font-bold text-slate-100">
                Grading Team: <span className="text-cyan-300">{team.name}</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Project & Requirements (5 cols) */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Challenge</span>
              <h4 className="font-bold text-slate-100 text-sm">{team.challenge?.title}</h4>
              <span className="text-[11px] text-cyan-400 font-semibold">{team.challenge?.category}</span>

              {r1Sub?.scratchUrl ? (
                <a
                  href={r1Sub.scratchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 w-full py-2 px-3 rounded-lg bg-cyan-950 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Launch Scratch Project
                </a>
              ) : (
                <div className="mt-3 p-2 text-center rounded bg-rose-950/40 text-rose-300 text-[11px] border border-rose-800/40">
                  No Scratch project link submitted yet
                </div>
              )}
            </div>

            {/* Checklist of mechanics to look for */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <h5 className="font-bold text-slate-300 mb-2 uppercase text-[10px] tracking-wider">
                Required Game Mechanics:
              </h5>
              <ul className="space-y-1.5">
                {Array.isArray(team.challenge?.requirements) ? (
                  team.challenge.requirements.map((req, i) => (
                    <li key={i} className="text-slate-300 flex items-start gap-1.5 text-[11px]">
                      <span className="text-purple-400 font-bold mt-0.5">•</span>
                      <span>{req}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500">Standard rubric criteria</li>
                )}
              </ul>
            </div>

            {r1Sub?.notes && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <h5 className="font-bold text-slate-300 mb-1 uppercase text-[10px] tracking-wider">
                  Team Notes & Instructions:
                </h5>
                <p className="text-slate-400 text-[11px] leading-relaxed italic">{r1Sub.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Rubric Sliders (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Criterion 1: Basic Game Working (0-40) */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs">1. Basic Game Working</h4>
                  <p className="text-[10px] text-slate-400">Core gameplay, controls, win/loss state, stability</p>
                </div>
                <span className="text-sm font-mono font-bold text-cyan-400 px-2 py-0.5 bg-cyan-950/80 rounded-md border border-cyan-800/60">
                  {basic} / 40
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={basic}
                onChange={(e) => setBasic(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Criterion 2: Sprites & Visuals (0-25) */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs">2. Sprites & Visual Implementation</h4>
                  <p className="text-[10px] text-slate-400">Readability, animation, art cohesion, Scratch assets</p>
                </div>
                <span className="text-sm font-mono font-bold text-purple-400 px-2 py-0.5 bg-purple-950/80 rounded-md border border-purple-800/60">
                  {visual} / 25
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={visual}
                onChange={(e) => setVisual(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Criterion 3: Creativity (0-35) */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs">3. Creativity & Game Design</h4>
                  <p className="text-[10px] text-slate-400">Originality, clever mechanics, challenge balance</p>
                </div>
                <span className="text-sm font-mono font-bold text-amber-400 px-2 py-0.5 bg-amber-950/80 rounded-md border border-amber-800/60">
                  {creativity} / 35
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={35}
                step={1}
                value={creativity}
                onChange={(e) => setCreativity(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Comments Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Judge Comments & Feedback (Optional)
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="What did this game do well? Any areas of improvement?"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            {/* Live Total Score & Submit */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-purple-500/40">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Score</span>
                <span className="text-2xl font-black font-mono text-purple-300">
                  {total} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Final Round 1 Score
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
