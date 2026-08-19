import React, { useState } from 'react';
import { api } from '../../lib/api.js';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-panel rounded-2xl border border-amber-500/40 p-6 sm:p-8 shadow-2xl shadow-amber-950/40 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider">Round 2 Finalist Presentation Studio</span>
              <h2 className="text-lg font-bold text-slate-100">
                Evaluating Finalist: <span className="text-amber-300">{team.name}</span>
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
          
          {/* Left Column: Team Profile & R1 Performance (5 cols) */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Finalist Slot</span>
              <h4 className="font-bold text-amber-300 text-sm">Slot #{team.r2PresentationSlot || 1} • {team.challenge?.title}</h4>
              
              <div className="mt-3 p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Round 1 Score:</span>
                <span className="font-mono font-bold text-cyan-300">{team.cachedR1Score ?? team.round1Score ?? '--'} / 100</span>
              </div>

              {r1Sub?.scratchUrl && (
                <a
                  href={r1Sub.scratchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 w-full py-2 px-3 rounded-lg bg-cyan-950 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Scratch Project
                </a>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <h5 className="font-bold text-slate-300 mb-2 uppercase text-[10px] tracking-wider">
                Evaluation Guidelines:
              </h5>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Score based on clarity of communication, accuracy of technical explanation, quality of the live demo, and how well teammates answer cross-examination questions.
              </p>
            </div>
          </div>

          {/* Right Column: 4 Rubric Criteria (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Criterion 1: Presentation Quality (0-30) */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs">1. Presentation Quality</h4>
                  <p className="text-[10px] text-slate-400">Structure, clarity, confidence, visual communication</p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 bg-amber-950/80 rounded-md border border-amber-800/60">
                  {pres} / 30
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={pres}
                onChange={(e) => setPres(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Criterion 2: Project Explanation (0-40) */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs">2. Project Explanation & Logic</h4>
                  <p className="text-[10px] text-slate-400">Depth of understanding, logic breakdown, design choices</p>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 bg-cyan-950/80 rounded-md border border-cyan-800/60">
                  {expl} / 40
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={expl}
                onChange={(e) => setExpl(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Criterion 3: Technical QA (0-20) */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs">3. Technical Q&A</h4>
                  <p className="text-[10px] text-slate-400">Ability to defend implementation and answer questions</p>
                </div>
                <span className="text-xs font-mono font-bold text-purple-400 px-2 py-0.5 bg-purple-950/80 rounded-md border border-purple-800/60">
                  {qa} / 20
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={qa}
                onChange={(e) => setQa(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Criterion 4: Team Contribution (0-10) */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h4 className="font-bold text-slate-200 text-xs">4. Team Contribution & Conduct</h4>
                  <p className="text-[10px] text-slate-400">Balanced participation, teamwork, conduct</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 bg-emerald-950/80 rounded-md border border-emerald-800/60">
                  {teamwork} / 10
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={teamwork}
                onChange={(e) => setTeamwork(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Comments Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Judge Notes for Finalist (Optional)
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Key strengths, demo presentation remarks..."
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>

            {/* Live Total Score & Submit */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/40">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Round 2 Total</span>
                <span className="text-2xl font-black font-mono text-amber-300">
                  {total} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Round 2 Score
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
