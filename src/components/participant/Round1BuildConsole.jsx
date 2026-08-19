import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import ServerTimer from '../layout/ServerTimer.jsx';
import {
  Gamepad2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Send,
  Save,
  AlertCircle,
  FileCheck,
  Sparkles,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';

export default function Round1BuildConsole() {
  const { user, team, eventConfig, refreshSession } = useAuth();
  const [scratchUrl, setScratchUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [checkedMechanics, setCheckedMechanics] = useState({});

  const challenge = team?.challenge;

  const fetchSubmission = async () => {
    try {
      const data = await api.get('/submissions/my-team');
      const r1Sub = data.find((s) => s.roundNumber === 1);
      if (r1Sub) {
        setSubmission(r1Sub);
        setScratchUrl(r1Sub.scratchUrl || '');
        setNotes(r1Sub.notes || '');
      }
    } catch (err) {
      console.error('Failed to load submission:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmission();
  }, []);

  const handleSubmit = async (isDraft) => {
    setMessage({ type: '', text: '' });
    setSubmitting(true);

    try {
      const res = await api.post('/submissions', {
        scratchUrl,
        notes,
        isDraft,
        roundNumber: 1,
      });

      setSubmission(res.submission);
      setMessage({
        type: 'success',
        text: res.message || (isDraft ? 'Draft saved!' : 'Project submitted for evaluation!'),
      });
      await refreshSession();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Submission failed. Please check the URL format.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMechanic = (index) => {
    setCheckedMechanics((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-6">
      {/* 4-Hour Live Timer Banner */}
      <ServerTimer />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Challenge & Requirements Checklist (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                  {challenge?.category || 'Arcade'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                  {challenge?.difficulty || 'Intermediate'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Assigned to {team?.name}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 mb-2">
              {challenge?.title || 'Selected Challenge'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {challenge?.fullDescription || challenge?.shortDescription}
            </p>

            {/* Requirements Interactive Checklist */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Mandatory Checklist for Evaluation:
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  {Object.values(checkedMechanics).filter(Boolean).length} /{' '}
                  {challenge?.requirements?.length || 5} Checked
                </span>
              </div>

              <div className="space-y-2">
                {Array.isArray(challenge?.requirements) ? (
                  challenge.requirements.map((req, idx) => {
                    const isChecked = Boolean(checkedMechanics[idx]);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleMechanic(idx)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 select-none ${
                          isChecked
                            ? 'bg-cyan-950/40 border-cyan-500/50 text-slate-100'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 accent-cyan-500 rounded cursor-pointer"
                        />
                        <span className={isChecked ? 'line-through text-slate-400' : ''}>{req}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400">Review project requirements above.</p>
                )}
              </div>
            </div>

            {/* Judging Rubric Preview */}
            <div className="mt-6 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <h5 className="font-bold text-slate-200 mb-2 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Round 1 Scoring Breakdown (100 Pts):
              </h5>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-cyan-400 font-bold block text-sm">40 Pts</span>
                  <span className="text-slate-400 text-[10px]">Basic Game Working</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-purple-400 font-bold block text-sm">25 Pts</span>
                  <span className="text-slate-400 text-[10px]">Sprites & Visuals</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-amber-400 font-bold block text-sm">35 Pts</span>
                  <span className="text-slate-400 text-[10px]">Creativity & Balance</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Submission Command Center (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Project Submission</h3>
                  <p className="text-[11px] text-slate-400">Enter your live Scratch project link</p>
                </div>
              </div>

              {/* Status Badge */}
              {submission && (
                <span
                  className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    submission.status === 'SUBMITTED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                      : submission.status === 'LATE'
                      ? 'bg-rose-950 text-rose-400 border border-rose-700/60'
                      : 'bg-amber-950 text-amber-400 border border-amber-700/60'
                  }`}
                >
                  {submission.status}
                </span>
              )}
            </div>

            {message.text && (
              <div
                className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Scratch Project URL
                </label>
                <div className="relative">
                  <Gamepad2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required
                    value={scratchUrl}
                    onChange={(e) => setScratchUrl(e.target.value)}
                    placeholder="https://scratch.mit.edu/projects/123456789"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ensure your Scratch project is set to <strong>Shared</strong> on Scratch MIT so judges can open it.
                </p>
              </div>

              {/* Preview Link helper */}
              {scratchUrl && (
                <a
                  href={scratchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-800/40 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Test Open in Scratch
                </a>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Project Notes & Instructions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key controls (e.g. Space to shoot, Arrow keys to move), special easter eggs..."
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              {submission?.submittedAt && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Last Updated:</span>
                  <span className="font-mono text-slate-200">
                    {new Date(submission.submittedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting || !scratchUrl.trim()}
                  className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting || !scratchUrl.trim()}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Submit Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 text-xs">
            <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400" /> Hackathon Submission Rules
            </h4>
            <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
              <li>You can update your submission link at any time before the 4-hour countdown ends.</li>
              <li>Only the highest scoring team per problem statement advances to Round 2.</li>
              <li>Judges score directly on gameplay stability, sprite visuals, and creative interpretation.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
