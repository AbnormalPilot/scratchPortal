import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import {
  Gamepad2,
  ExternalLink,
  CheckCircle2,
  Send,
  Save,
  AlertCircle,
  ShieldCheck,
  Code2,
} from 'lucide-react';

export default function Round1BuildConsole() {
  const { user, team, refreshSession } = useAuth();
  const [scratchUrl, setScratchUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submission, setSubmission] = useState(null);
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
        text: err.message || 'Submission failed. Please check the Scratch URL format.',
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
      
      {message.text && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Challenge Requirements (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl p-6 border-2 border-[#bad6fc] shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase">
                {challenge?.category || 'Game'}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Assigned Quest
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-[#1e293b] mb-2">
              {challenge?.title || 'Selected Challenge'}
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              {challenge?.fullDescription || challenge?.shortDescription}
            </p>

            {/* Checklist */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1e293b] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4e97fe]" /> Checklist for Judges:
                </h4>
                <span className="text-[11px] font-mono text-[#64748b]">
                  {Object.values(checkedMechanics).filter(Boolean).length} /{' '}
                  {challenge?.requirements?.length || 0} Checked
                </span>
              </div>

              <div className="space-y-2">
                {Array.isArray(challenge?.requirements) &&
                  challenge.requirements.map((req, idx) => {
                    const isChecked = Boolean(checkedMechanics[idx]);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleMechanic(idx)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                          isChecked
                            ? 'bg-[#f0f7ff] border-[#4e97fe] text-[#1e293b]'
                            : 'bg-slate-50 border-slate-200 text-[#64748b] hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 accent-[#4e97fe] cursor-pointer"
                        />
                        <span className="leading-snug">{req}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Submission Box (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl p-6 border-2 border-[#bad6fc] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#4e97fe]" />
                Project Submission
              </h3>
              {submission?.status && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    submission.status === 'SUBMITTED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {submission.status}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1e293b] mb-1">
                  Scratch Project URL
                </label>
                <input
                  type="url"
                  value={scratchUrl}
                  onChange={(e) => setScratchUrl(e.target.value)}
                  placeholder="https://scratch.mit.edu/projects/123456789"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-[#1e293b] focus:border-[#4e97fe] focus:ring-2 focus:ring-[#4e97fe]/20 outline-none font-mono"
                />
                <a
                  href="https://scratch.mit.edu/projects/editor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#4e97fe] font-semibold hover:underline mt-1.5"
                >
                  <ExternalLink className="w-3 h-3" /> Open Scratch 3.0 Editor
                </a>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1e293b] mb-1">
                  Notes for Judges (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Game controls: Arrow keys to move, Space to shoot..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-[#1e293b] focus:border-[#4e97fe] focus:ring-2 focus:ring-[#4e97fe]/20 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting || !scratchUrl}
                  className="py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting || !scratchUrl}
                  className="py-2.5 rounded-lg bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Project
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
