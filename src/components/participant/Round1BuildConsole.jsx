import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import {
  Gamepad2,
  CheckCircle2,
  Send,
  Save,
  AlertCircle,
  ShieldCheck,
  Code2,
  ListChecks,
  FileText,
  Upload,
  Lock,
  Link2,
  X,
  Play,
  Film,
  AlertTriangle,
  FileVideo,
  Clock,
  Sparkles,
} from 'lucide-react';

const MAX_VIDEO_SIZE_MB = 50;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

export default function Round1BuildConsole() {
  const { user, team, eventConfig, refreshSession } = useAuth();
  const [scratchUrl, setScratchUrl] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [videoMode, setVideoMode] = useState('file'); // 'file' | 'link'
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [videoError, setVideoError] = useState('');
  const [notes, setNotes] = useState('');
  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [checkedMechanics, setCheckedMechanics] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: string }
  const toastTimerRef = useRef(null);

  const showToast = (type, text) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, text });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const fileInputRef = useRef(null);
  const challenge = team?.challenge;

  const fetchSubmission = async () => {
    try {
      const data = await api.get('/submissions/my-team');
      const r1Sub = data.find((s) => s.roundNumber === 1);
      if (r1Sub) {
        setSubmission(r1Sub);
        setScratchUrl(r1Sub.scratchUrl || '');
        setShortDescription(r1Sub.shortDescription || '');
        setNotes(r1Sub.notes || '');

        if (r1Sub.videoUrl) {
          if (r1Sub.videoUrl.startsWith('/uploads/')) {
            setVideoMode('file');
            setVideoPreviewUrl(r1Sub.videoUrl);
          } else {
            setVideoMode('link');
            setVideoUrl(r1Sub.videoUrl);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load submission:', err);
    }
  };

  useEffect(() => {
    fetchSubmission();
  }, []);

  // Handle Video File Selection with Client-Side 50MB Limit Validation
  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    setVideoError('');

    if (!file) return;

    // Check MIME type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov)$/i)) {
      setVideoError('Invalid file type. Only MP4, WebM, and MOV video files are supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check 50MB Size Cap
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setVideoError(
        `File too large (${sizeMB} MB). Maximum allowed video size is ${MAX_VIDEO_SIZE_MB} MB. Please compress or record a shorter clip.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveVideoFile = () => {
    setVideoFile(null);
    setVideoPreviewUrl('');
    setVideoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFinalSubmitClick = () => {
    // Show confirmation modal before final submit
    setShowConfirmModal(true);
  };

  const handleSubmit = async (isDraft) => {
    setMessage({ type: '', text: '' });

    if (!scratchUrl || !scratchUrl.trim()) {
      setMessage({ type: 'error', text: 'Scratch Project URL is required.' });
      return;
    }

    // USER RULE: Short Description is REQUIRED on final submission
    if (!isDraft && (!shortDescription || !shortDescription.trim())) {
      setMessage({ type: 'error', text: 'Short Description & Story Pitch is required for final submission.' });
      return;
    }

    // USER RULE: Video (file or link) is REQUIRED on final submission
    const hasVideo = videoFile || (videoMode === 'link' && videoUrl.trim());
    if (!isDraft && !hasVideo) {
      setMessage({ type: 'error', text: 'A gameplay demo video (uploaded file or video link) is required for final submission.' });
      return;
    }

    // USER RULE: Save Draft CANNOT accept uploaded video file
    if (isDraft && videoFile) {
      setMessage({
        type: 'error',
        text: 'Video file uploads are only processed on Final Submission. To save a draft, please remove the video file or use a video link.',
      });
      return;
    }

    setSubmitting(true);

    try {
      let res;

      if (videoFile && !isDraft) {
        // Send Multipart Form Data for File Upload
        const formData = new FormData();
        formData.append('scratchUrl', scratchUrl.trim());
        formData.append('shortDescription', shortDescription.trim());
        formData.append('notes', notes.trim());
        formData.append('isDraft', 'false');
        formData.append('roundNumber', '1');
        formData.append('videoFile', videoFile);

        const token = api.getToken();
        const isVercel = typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('netlify.app'));
        const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : (isVercel ? 'https://scratchportal.onrender.com' : '');
        const targetUrl = `${baseUrl}/api/submissions`;

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        res = await response.json();
        if (!response.ok) {
          throw new Error(res.error || res.message || 'Failed to upload video submission.');
        }
      } else {
        // Send JSON for standard submission or draft
        res = await api.post('/submissions', {
          scratchUrl: scratchUrl.trim(),
          shortDescription: shortDescription.trim(),
          videoUrl: videoMode === 'link' ? videoUrl.trim() : null,
          notes: notes.trim(),
          isDraft,
          roundNumber: 1,
        });
      }

      setSubmission(res.submission);
      if (isDraft) {
        showToast('success', 'Draft saved! Your progress has been saved.');
      } else {
        setMessage({
          type: 'success',
          text: res.message || 'Project submitted for evaluation!',
        });
      }
      await refreshSession();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Submission failed. Please check your inputs.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMechanic = (index) => {
    setCheckedMechanics((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const hasAttachedVideoFile = Boolean(videoFile);
  const isLocked = submission?.status === 'SUBMITTED' || submission?.status === 'LATE';
  const isTimeUp = eventConfig?.r1EndTime && new Date() > new Date(eventConfig.r1EndTime);

  return (
    <div className="space-y-6">

      {/* Toast and Modal rendered via portal so they escape any parent overflow/transform */}

      {/* ===== TOAST NOTIFICATION (Portal) ===== */}
      {toast && ReactDOM.createPortal(
        <div
          className={`fixed top-6 right-6 z-[9999] flex items-center gap-3.5 px-5 py-4 rounded-2xl border-2 shadow-2xl text-sm font-retro font-bold animate-fadeIn min-w-[280px] max-w-sm ${
            toast.type === 'success'
              ? 'bg-white border-emerald-400 text-emerald-800'
              : 'bg-white border-rose-400 text-rose-800'
          }`}
          style={{ boxShadow: toast.type === 'success' ? '0 8px_32px_rgba(16,185,129,0.18), 4px 4px 0 #6ee7b7' : '0 8px 32px rgba(239,68,68,0.18), 4px 4px 0 #fca5a5' }}
        >
          {toast.type === 'success' ? (
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-pixel font-bold uppercase tracking-wide">
              {toast.type === 'success' ? 'Draft Saved!' : 'Error'}
            </p>
            <p className="text-xs font-retro opacity-80 mt-0.5 leading-snug">{toast.text}</p>
          </div>
          <button
            onClick={() => { setToast(null); clearTimeout(toastTimerRef.current); }}
            className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>,
        document.body
      )}

      {/* ===== SUBMITTING / UPLOADING FULLSCREEN OVERLAY (Portal) ===== */}
      {submitting && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div className="w-full max-w-md bg-white rounded-3xl border-4 border-[#4e97fe] shadow-[12px_12px_0px_#bad6fc] p-8 text-center space-y-5 animate-fadeIn">
            {/* Animated Loading Rocket/Icon */}
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#4e97fe] to-[#307fef] border-4 border-white shadow-lg flex items-center justify-center text-4xl animate-bounce">
                {videoFile ? '🚀' : '💾'}
              </div>
              <div className="absolute inset-0 rounded-3xl border-4 border-[#ffbe00] border-t-transparent animate-spin" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b]">
                {videoFile ? 'TRANSMITTING VIDEO & SUBMISSION...' : 'SAVING SUBMISSION PROGRESS...'}
              </h3>
              <p className="text-xs font-retro text-[#64748b] leading-relaxed">
                {videoFile
                  ? 'Uploading gameplay demo video file and securing cartridge submission on tournament servers.'
                  : 'Updating project cartridge and syncing data with the judging panel.'}
              </p>
            </div>

            {/* Visual Pulsing Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 p-0.5">
              <div className="h-full rounded-full bg-gradient-to-r from-[#4e97fe] via-[#ffbe00] to-emerald-500 animate-pulse w-full" />
            </div>

            <div className="p-3 rounded-xl bg-[#f0f7ff] border border-[#bad6fc] text-[11px] font-retro text-[#4e97fe] font-bold">
              ⚡ Please keep this window open while processing...
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===== CONFIRMATION MODAL (Portal) ===== */}
      {showConfirmModal && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl border-4 border-[#4e97fe] shadow-[12px_12px_0px_#bad6fc] p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-pixel text-[#1e293b] leading-tight">FINAL SUBMISSION</h3>
                <p className="text-sm font-retro text-[#64748b] mt-0.5">This action is <strong>permanent</strong> and cannot be undone.</p>
              </div>
            </div>

            {/* Warning Block */}
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 space-y-2">
              <p className="text-xs font-bold font-pixel uppercase tracking-wide">⚠️ Read before confirming:</p>
              <ul className="space-y-1.5 text-sm font-retro list-none">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold mt-0.5">•</span>
                  <span>Your Scratch project URL, description, and video will be <strong>permanently locked</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold mt-0.5">•</span>
                  <span>You will <strong>not</strong> be able to edit or resubmit after this.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold mt-0.5">•</span>
                  <span>Ensure your Scratch project is set to <strong>Share (public)</strong> before submitting.</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowConfirmModal(false); handleSubmit(false); }}
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-sm font-pixel transition-all cursor-pointer shadow-[4px_4px_0px_#991b1b] font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 shrink-0" />
                {submitting ? 'SUBMITTING...' : 'YES, SUBMIT FINAL'}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-sm font-pixel transition-all cursor-pointer border-2 border-slate-300 font-bold"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {message.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-retro flex items-center gap-2 border-2 animate-fadeIn ${
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
              {challenge?.fullDescription || challenge?.shortDescription || 'Build your Scratch quest.'}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-pixel text-[#64748b]">FIRST-TO-FINISH SPEED MATTERS</span>
            <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
              ROUND 1 SPRINT
            </span>
          </div>
        </div>

        {/* Top-Right Box: Core Mechanics Checklist (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-[#4e97fe]" />
                <h3 className="text-xs font-bold font-pixel text-[#1e293b] uppercase">
                  REQUIRED GAME MECHANICS
                </h3>
              </div>
              <span className="text-[10px] font-pixel text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {Object.values(checkedMechanics).filter(Boolean).length} /{' '}
                {challenge?.requirements?.length || 0}
              </span>
            </div>

            <div className="space-y-2">
              {challenge?.requirements &&
                challenge.requirements.map((req, idx) => {
                  const isDone = Boolean(checkedMechanics[idx]);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleMechanic(idx)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        isDone
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                          : 'bg-white border-slate-200 hover:border-[#bad6fc] text-[#334155]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-300 text-[#4e97fe] focus:ring-0 cursor-pointer"
                      />
                      <span className={`text-xs font-retro leading-snug ${isDone ? 'line-through opacity-75' : ''}`}>
                        {req}
                      </span>
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

      {/* BOTTOM ROW: Redesigned High-Impact Submission Console */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc]">
        
        {/* Lock Banner */}
        {isLocked && (
          <div className={`mb-5 p-4 rounded-xl border-2 flex items-start gap-3 ${
            submission?.status === 'LATE'
              ? 'bg-amber-50 border-amber-400'
              : 'bg-emerald-50 border-emerald-400'
          }`}>
            <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 ${
              submission?.status === 'LATE' ? 'bg-amber-600' : 'bg-emerald-500'
            }`}>
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className={`text-xs font-bold font-pixel ${
                submission?.status === 'LATE' ? 'text-amber-900' : 'text-emerald-800'
              }`}>
                {submission?.status === 'LATE' ? 'LATE SUBMISSION LOCKED & RECEIVED' : 'SUBMISSION LOCKED & RECEIVED'}
              </p>
              <p className={`text-xs font-retro mt-0.5 ${
                submission?.status === 'LATE' ? 'text-amber-800' : 'text-emerald-700'
              }`}>
                {submission?.status === 'LATE'
                  ? 'Your project has been received and marked as a Late Submission. The judging panel will evaluate your Scratch project and video demo.'
                  : 'Your project has been finally submitted and is now under evaluation by the judges. No further edits are allowed.'}
              </p>
            </div>
          </div>
        )}

        {/* Time is Up Alert Banner when not submitted yet */}
        {isTimeUp && !isLocked && (
          <div className="mb-5 p-4 rounded-xl bg-rose-50 border-2 border-rose-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 text-lg font-bold">
                ⏳
              </div>
              <div>
                <p className="text-xs font-bold font-pixel text-rose-900">ROUND 1 SPRINT TIME IS UP!</p>
                <p className="text-xs font-retro text-rose-800 mt-0.5">
                  The sprint deadline has passed. If you haven't submitted your project yet, do it fast to minimize late penalty grade deductions!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFinalSubmitClick}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-pixel font-bold shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
            >
              FINAL SUBMIT NOW →
            </button>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold shadow-sm ${
              isLocked
                ? (submission?.status === 'LATE' ? 'bg-amber-600' : 'bg-emerald-500')
                : 'bg-gradient-to-tr from-[#4e97fe] to-[#307fef]'
            }`}>
              {isLocked ? <Lock className="w-5 h-5" /> : <Code2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b]">
                PROJECT SUBMISSION CONSOLE
              </h3>
              <p className="text-xs font-retro text-[#64748b]">
                {isLocked
                  ? (submission?.status === 'LATE' ? 'Late submission received. Your project is locked for judge evaluation.' : 'Submission received. Your project is locked for judge evaluation.')
                  : 'Submit your public Scratch project URL, a short story pitch, and gameplay demo video.'}
              </p>
            </div>
          </div>

          {submission?.status && (
            <span
              className={`text-[10px] font-pixel px-3 py-1.5 rounded-lg self-start sm:self-auto font-bold border uppercase tracking-wider ${
                submission.status === 'SUBMITTED'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : submission.status === 'LATE'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              ● {submission.status === 'SUBMITTED' ? 'FINAL SUBMITTED' : submission.status === 'LATE' ? 'SUBMITTED (LATE)' : 'DRAFT SAVED'}
            </span>
          )}
        </div>

        {/* Form Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Project Links & Description (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. Scratch Project URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1e293b] font-retro uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="font-pixel text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    STEP 1
                  </span>
                  <span>Public Scratch Project URL</span>
                  <span className="text-rose-500 font-bold">*</span>
                </span>
                <span className="text-[11px] text-[#64748b] font-retro font-normal lowercase">
                  (must be shared)
                </span>
              </label>
              <div className="relative">
                <Gamepad2 className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={scratchUrl}
                  disabled={isLocked}
                  onChange={(e) => setScratchUrl(e.target.value)}
                  placeholder="https://scratch.mit.edu/projects/123456789"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 text-xs sm:text-sm font-retro text-[#1e293b] placeholder-slate-400 focus:border-[#4e97fe] focus:ring-2 focus:ring-[#4e97fe]/10 outline-none transition-all bg-slate-50/50 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* 2. Short Description & Story Pitch */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1e293b] font-retro uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="font-pixel text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    STEP 2
                  </span>
                  <span>Short Description & Story Pitch</span>
                  <span className="text-rose-500 font-bold">*</span>
                </span>
                <span className="text-[10px] font-pixel text-[#4e97fe] uppercase">
                  Required
                </span>
              </label>
              <textarea
                rows={3}
                value={shortDescription}
                disabled={isLocked}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Explain the plot, objectives, what makes your game unique, and how mechanics tie to the theme..."
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-xs sm:text-sm text-[#1e293b] placeholder-slate-400 focus:border-[#4e97fe] focus:ring-2 focus:ring-[#4e97fe]/10 outline-none resize-none font-retro transition-all bg-slate-50/50 focus:bg-white leading-relaxed disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>

            {/* 3. Controls & Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1e293b] font-retro uppercase tracking-wider flex items-center gap-1.5">
                <span className="font-pixel text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  STEP 3
                </span>
                <span>Controls & Judge Notes (Optional)</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                disabled={isLocked}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Controls: Arrow keys / WASD to move, Space to shoot, Click to interact..."
                className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 text-xs sm:text-sm text-[#1e293b] placeholder-slate-400 focus:border-[#4e97fe] focus:ring-2 focus:ring-[#4e97fe]/10 outline-none resize-none font-retro transition-all bg-slate-50/50 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Right Column: Gameplay Video Module (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="p-4 sm:p-4.5 bg-[#f8fbff] rounded-2xl border-2 border-[#bad6fc] space-y-3">
              
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-[#1e293b] font-retro uppercase tracking-wider flex items-center gap-1.5">
                  <span className="font-pixel text-[10px] px-1.5 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc]">
                    STEP 4
                  </span>
                  <span>Gameplay Video</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>

                {/* Switch Between File Upload and Video Link */}
                {!isLocked && (
                  <div className="flex items-center bg-white p-1 rounded-xl border border-[#bad6fc] text-[10px] font-pixel shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        setVideoMode('file');
                        setVideoError('');
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                        videoMode === 'file'
                          ? 'bg-[#4e97fe] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📁 Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoMode('link');
                        setVideoError('');
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                        videoMode === 'link'
                          ? 'bg-[#4e97fe] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🔗 Link
                    </button>
                  </div>
                )}
              </div>

              {/* Mode A: Direct Video Upload (.MP4 / WebM / MOV) */}
              {videoMode === 'file' ? (
                <div className="space-y-2">
                  {!videoPreviewUrl ? (
                    <div
                      onClick={() => !isLocked && fileInputRef.current?.click()}
                      className={`border-2 border-dashed border-[#bad6fc] rounded-xl p-5 text-center transition-all bg-white group ${
                        isLocked ? 'cursor-not-allowed opacity-60' : 'hover:border-[#4e97fe] hover:bg-[#f0f7ff]/50 cursor-pointer'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#f0f7ff] text-[#4e97fe] flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-retro font-bold text-[#1e293b] mb-1">
                        <span>Click to browse video file</span>
                      </div>
                      <p className="text-[11px] font-retro text-[#64748b]">
                        Supports <span className="font-bold text-[#4e97fe]">.MP4, .WEBM</span> • Max{' '}
                        <span className="font-bold text-[#4e97fe]">50 MB</span>
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded-xl border border-[#bad6fc] space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <FileVideo className="w-4 h-4 text-[#4e97fe] shrink-0" />
                          <span className="text-xs font-retro font-bold text-[#1e293b] truncate">
                            {videoFile ? videoFile.name : submission?.videoFileName || 'Submitted Video Demo'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {videoFile && (
                            <span className="text-[10px] font-pixel px-1.5 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc]">
                              {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          )}
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={handleRemoveVideoFile}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Remove video file"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Built-in Video Player Preview */}
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full max-h-44 rounded-lg bg-slate-950 object-contain border border-slate-200"
                      />
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    onChange={handleVideoFileChange}
                    className="hidden"
                  />

                  {videoError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs font-retro flex items-center gap-1.5 animate-fadeIn">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{videoError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Mode B: External Video Link */
                <div className="space-y-1.5">
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={videoUrl}
                      disabled={isLocked}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... or Google Drive link"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-retro text-[#1e293b] placeholder-slate-400 focus:border-[#4e97fe] outline-none bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                  {videoUrl && (
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-retro text-[#4e97fe] hover:underline pt-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Open and test video link in new tab ↗</span>
                    </a>
                  )}
                  <p className="text-[11px] font-retro text-[#64748b]">
                    Paste an Unlisted YouTube link, Google Drive video, or Loom recording.
                  </p>
                </div>
              )}
              {/* Draft restriction notice when file is chosen */}
              {hasAttachedVideoFile && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-retro flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    <strong>Draft Notice:</strong> Video file upload is processed on <strong>FINAL SUBMIT</strong>. To save a draft without finalizing, use a video link or remove the file.
                  </span>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Full-Width Bottom Action Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-retro text-[#64748b] min-w-0">
            <Clock className="w-4 h-4 text-[#4e97fe]" />
            <span>
              {submission?.submittedAt
                ? `Last saved: ${new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Unsaved work • Ready to draft or submit'}
            </span>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto">
            {!isLocked ? (
              <>
                {/* Save Draft Button */}
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting || !scratchUrl || hasAttachedVideoFile}
                  title={
                    hasAttachedVideoFile
                      ? 'Video file upload is only processed on Final Submission. Remove file or use a video link to save draft.'
                      : 'Save work-in-progress draft'
                  }
                  className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-pixel transition-all flex items-center justify-center gap-2 cursor-pointer font-bold ${
                    hasAttachedVideoFile
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                      : 'bg-slate-100 hover:bg-slate-200 text-[#475569] border border-slate-300 active:scale-98'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>SAVE DRAFT</span>
                </button>

                {/* Final Submit Button — opens confirmation modal */}
                <button
                  type="button"
                  onClick={handleFinalSubmitClick}
                  disabled={submitting || !scratchUrl || !shortDescription.trim() || !(videoFile || (videoMode === 'link' && videoUrl.trim()))}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#2463bf] flex items-center justify-center gap-2 cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>FINAL SUBMIT</span>
                </button>
              </>
            ) : (
              /* Locked state — show submission locked badge */
              <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-pixel font-bold ${
                submission?.status === 'LATE'
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-emerald-100 border-emerald-300 text-emerald-800'
              }`}>
                <Lock className="w-3.5 h-3.5" />
                <span>{submission?.status === 'LATE' ? 'LATE SUBMISSION LOCKED' : 'SUBMISSION LOCKED'}</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
