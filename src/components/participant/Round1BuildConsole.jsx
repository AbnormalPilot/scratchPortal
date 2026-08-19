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
  ListChecks,
  FileText,
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
          className={`p-3.5 rounded-xl text-xs font-retro flex items-center gap-2 border-2 ${
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

      {/* TOP ROW: Split 2-Box Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Top-Left Box: Problem Statement Details (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] font-pixel px-2.5 py-1 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase font-bold">
                {challenge?.category || 'Arcade Game'}
              </span>
              <span className="text-xs font-retro font-bold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {challenge?.difficulty || 'Intermediate'}
              </span>
            </div>

            <h2 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] mb-3 leading-snug">
              {challenge?.title || 'Selected Challenge'}
            </h2>

            <div className="p-4 bg-[#f8fbff] rounded-xl border border-[#bad6fc] text-xs sm:text-sm font-retro text-[#334155] leading-relaxed">
              <span className="font-pixel text-[10px] text-[#4e97fe] block mb-1.5 uppercase">
                PROBLEM STATEMENT DETAILS:
              </span>
              {challenge?.fullDescription || challenge?.shortDescription}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-retro text-[#64748b]">
            <span>Assigned to your squad</span>
            <span className="font-bold text-[#1e293b] font-pixel text-[10px]">
              ROUND 1 SPRINT
            </span>
          </div>
        </div>

        {/* Top-Right Box: Checklist (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-bold font-pixel text-[#1e293b] flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-[#4e97fe]" />
                <span>CHECKLIST</span>
              </h3>
              <span className="text-xs font-retro font-bold text-[#4e97fe] px-2 py-0.5 rounded bg-[#f0f7ff] border border-[#bad6fc]">
                {Object.values(checkedMechanics).filter(Boolean).length} /{' '}
                {challenge?.requirements?.length || 0} DONE
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {Array.isArray(challenge?.requirements) &&
                challenge.requirements.map((req, idx) => {
                  const isChecked = Boolean(checkedMechanics[idx]);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleMechanic(idx)}
                      className={`p-2.5 rounded-xl border-2 text-xs font-retro cursor-pointer transition-all flex items-start gap-2.5 select-none ${
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
                      <span className="leading-snug text-xs sm:text-sm">{req}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="mt-3 pt-2 text-[11px] font-retro text-[#64748b] text-center">
            Check off mechanics as you code in Scratch
          </div>
        </div>

      </div>

      {/* BOTTOM ROW: Submission Console (Full Width 12 cols) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc]">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4e97fe] text-white flex items-center justify-center font-bold">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-pixel text-[#1e293b]">
                PROJECT SUBMISSION
              </h3>
              <p className="text-xs font-retro text-[#64748b]">
                Submit your public Scratch project link before the round ends.
              </p>
            </div>
          </div>

          {submission?.status && (
            <span
              className={`text-xs font-pixel px-3 py-1 rounded-md self-start sm:self-auto font-bold ${
                submission.status === 'SUBMITTED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              STATUS: {submission.status}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          
          {/* Left Sub-Column: Scratch URL Input */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold font-pixel text-[#1e293b] mb-1.5">
                SCRATCH PROJECT URL :
              </label>
              <input
                type="url"
                value={scratchUrl}
                onChange={(e) => setScratchUrl(e.target.value)}
                placeholder="https://scratch.mit.edu/projects/123456789"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 text-xs sm:text-sm text-[#1e293b] focus:border-[#4e97fe] focus:ring-2 focus:ring-[#4e97fe]/20 outline-none font-mono"
              />
            </div>

            <a
              href="https://scratch.mit.edu/projects/editor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-retro text-[#4e97fe] font-bold hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Launch Scratch 3.0 Web Editor
            </a>
          </div>

          {/* Right Sub-Column: Notes & Actions */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold font-pixel text-[#1e293b] mb-1.5">
                NOTES & CONTROLS (OPTIONAL) :
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Controls: Arrow keys to move, Space to shoot..."
                className="w-full px-4 py-2 rounded-xl border-2 border-slate-300 text-xs sm:text-sm text-[#1e293b] focus:border-[#4e97fe] focus:ring-2 focus:ring-[#4e97fe]/20 outline-none resize-none font-retro"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={submitting || !scratchUrl}
                className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-pixel transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>SAVE DRAFT</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting || !scratchUrl}
                className="py-3 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#2463bf] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>SUBMIT PROJECT</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
