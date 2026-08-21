import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import socketClient from '../../lib/socket.js';
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
  Rocket,
  UploadCloud,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  Star,
  Award,
  Flame,
  Shield,
  Zap,
  Radio,
} from 'lucide-react';

const MAX_VIDEO_SIZE_MB = 50;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

// Intelligent Scratch Project ID Extractor (handles raw IDs, full URLs, and iframe embed tags)
export function extractScratchProjectId(urlOrEmbed) {
  if (!urlOrEmbed || typeof urlOrEmbed !== 'string') return null;
  const str = urlOrEmbed.trim();
  const match = str.match(/(?:projects\/|embed\/|\/|^)(\d{6,15})/);
  return match ? match[1] : null;
}

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
  const [checkedTwists, setCheckedTwists] = useState({});
  const [twists, setTwists] = useState([]);
  const [twistAlertModal, setTwistAlertModal] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showInAppScratchTest, setShowInAppScratchTest] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: string }
  const toastTimerRef = useRef(null);

  const showToast = (type, text) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, text });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const toggleTwist = (twistId) => {
    setCheckedTwists((prev) => ({
      ...prev,
      [twistId]: !prev[twistId],
    }));
  };

  const fileInputRef = useRef(null);
  const challenge = team?.challenge;

  const hasAnyFieldFilled = Boolean(
    scratchUrl.trim() ||
    shortDescription.trim() ||
    notes.trim() ||
    videoUrl.trim() ||
    videoFile
  );

  const fetchTwists = async () => {
    try {
      const res = await api.get('/twists');
      if (res.twists) {
        setTwists(res.twists);
      }
    } catch (err) {
      console.error('Failed to load twists:', err);
    }
  };

  // Fetch Existing Submission (Draft or Final) & Released Twists
  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await api.get('/submissions/me?roundNumber=1');
        if (res.submission) {
          setSubmission(res.submission);
          setScratchUrl(res.submission.scratchUrl || '');
          setShortDescription(res.submission.shortDescription || '');
          setNotes(res.submission.notes || '');

          if (res.submission.videoUrl) {
            setVideoMode('link');
            setVideoUrl(res.submission.videoUrl);
          } else if (res.submission.videoFileName) {
            setVideoMode('file');
            // Construct backend video URL
            const isVercel = typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('netlify.app'));
            const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : (isVercel ? 'https://scratchportal.onrender.com' : '');
            setVideoPreviewUrl(`${baseUrl}/uploads/videos/${res.submission.videoFileName}`);
          }
        }
      } catch (err) {
        console.error('Failed to load submission:', err);
      }
    };

    fetchSubmission();
    fetchTwists();

    // Listen for Real-Time Twist Broadcasts
    const handleTwistReleased = (data) => {
      if (data?.twist) {
        setTwists((prev) => {
          const exists = prev.some((t) => t.id === data.twist.id);
          return exists ? prev.map((t) => (t.id === data.twist.id ? data.twist : t)) : [data.twist, ...prev];
        });
        setTwistAlertModal(data.twist);
        showToast('success', `🚨 SURPRISE TWIST RELEASED: ${data.twist.title}`);
      }
    };

    const handleTwistUpdated = () => fetchTwists();

    socketClient.on('twist:released', handleTwistReleased);
    socketClient.on('twist:updated', handleTwistUpdated);

    return () => {
      socketClient.off('twist:released', handleTwistReleased);
      socketClient.off('twist:updated', handleTwistUpdated);
    };
  }, []);

  const handleVideoFileChange = (e) => {
    setVideoError('');
    const file = e.target.files?.[0];

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
    setShowConfirmModal(true);
  };

  const handleSubmit = async (isDraft) => {
    setMessage({ type: '', text: '' });

    if (!hasAnyFieldFilled) {
      setMessage({ type: 'error', text: 'Please fill in at least one field before saving a draft.' });
      return;
    }

    if (!isDraft) {
      if (!scratchUrl || !scratchUrl.trim()) {
        setMessage({ type: 'error', text: 'Scratch Project URL is required for final submission.' });
        return;
      }

      if (!shortDescription || !shortDescription.trim()) {
        setMessage({ type: 'error', text: 'Short Description & Story Pitch is required for final submission.' });
        return;
      }

      const hasVideo = videoFile || (videoMode === 'link' && videoUrl.trim());
      if (!hasVideo) {
        setMessage({ type: 'error', text: 'A gameplay demo video (uploaded file or video link) is required for final submission.' });
        return;
      }
    }

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

  // Scratch project ID calculation
  const currentScratchId = extractScratchProjectId(submission?.scratchUrl || scratchUrl);

  // Core Mechanics metrics
  const totalReqCount = challenge?.requirements?.length || 0;
  const doneReqCount = Object.values(checkedMechanics).filter(Boolean).length;
  const mechanicsPercent = totalReqCount > 0 ? Math.round((doneReqCount / totalReqCount) * 100) : 0;
  const allMechanicsDone = totalReqCount > 0 && doneReqCount === totalReqCount;

  return (
    <div className="space-y-6">

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#1e293b] text-white border-2 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc]">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-retro">{toast.text}</span>
          </div>
        </div>
      )}

      {/* Modal Confirmation Portal */}
      {showConfirmModal &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[8px_8px_0px_#bad6fc] max-w-lg w-full space-y-5 animate-scaleUp">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4e97fe] to-[#307fef] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b] leading-tight">
                    CONFIRM FINAL SUBMISSION
                  </h3>
                  <p className="text-xs font-retro text-[#64748b] mt-0.5">
                    This action is <strong>permanent</strong> and locks your project for judging.
                  </p>
                </div>
              </div>

              {/* Warning Notice Block */}
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 space-y-2">
                <p className="text-xs font-bold font-pixel uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Read before confirming:</span>
                </p>
                <ul className="space-y-1.5 text-xs font-retro list-disc list-inside text-amber-800">
                  <li>Your Scratch project URL, story pitch, and gameplay video will be <strong>permanently locked</strong>.</li>
                  <li>Judges will immediately begin evaluating your game based on the official rubric.</li>
                  <li>You will not be able to edit or re-upload your submission after confirmation.</li>
                </ul>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border-2 border-slate-200 hover:bg-slate-50 text-xs font-pixel text-[#64748b] cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleSubmit(false);
                  }}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-pixel font-bold shadow-[2px_2px_0px_#065f46] cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>YES, SUBMIT PROJECT</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Surprise Twist Real-Time Alert Modal */}
      {twistAlertModal &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-4 border-[#ffbe00] shadow-[10px_10px_0px_#ffbe00] max-w-xl w-full space-y-5 animate-scaleUp text-center relative overflow-hidden max-h-[90vh] overflow-y-auto">
              {/* Ambient glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-300/30 rounded-full -mr-16 -mt-16 pointer-events-none blur-2xl" />

              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#ffbe00] via-[#f59e0b] to-[#d97706] text-[#141720] flex items-center justify-center mx-auto shadow-[4px_4px_0px_#b45309] border-2 border-white animate-bounce">
                <Zap className="w-8 h-8 fill-[#141720]" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-[10px] font-pixel font-black uppercase tracking-wider">
                    🚨 SURPRISE TWIST RELEASED!
                  </span>
                </div>

                <h3 className="text-lg sm:text-2xl font-bold font-pixel text-[#1e293b] pt-1">
                  NEW BONUS OBJECTIVES UNLOCKED
                </h3>
                <p className="text-xs font-retro text-[#64748b]">
                  Organizers have released surprise modifiers for this sprint. Implement them in your Scratch game!
                </p>
              </div>

              {/* List of Newly Released Twists */}
              <div className="space-y-3 text-left">
                {(Array.isArray(twistAlertModal) ? twistAlertModal : [twistAlertModal]).map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="p-4 rounded-2xl bg-gradient-to-br from-[#fffdf5] to-[#fef8e7] border-2 border-amber-300 space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold font-pixel text-[#1e293b]">
                        {t.title}
                      </h4>
                      <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#ffbe00] text-[#141720] font-black border border-amber-600 shrink-0">
                        +{t.bonusPoints} PTS
                      </span>
                    </div>
                    <p className="text-xs font-retro text-slate-700 leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] font-retro text-[#64748b]">
                These twists carry bonus points for your project. Judges will check and evaluate them during rubric grading.
              </p>

              <button
                type="button"
                onClick={() => setTwistAlertModal(null)}
                className="w-full py-3 px-6 rounded-2xl bg-[#141720] hover:bg-[#1e293b] text-[#ffbe00] text-xs font-pixel font-black shadow-[4px_4px_0px_#ffbe00] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-[#ffbe00]" />
                <span>GOT IT, CONTINUE CODING! ⚡</span>
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Action Messages */}
      {message.text && (
        <div
          className={`p-4 rounded-2xl text-xs font-retro flex items-center gap-2.5 border-2 animate-fadeIn ${
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
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* MID-SPRINT SURPRISE TWISTS (BONUS OBJECTIVES DISPLAY) */}
      {twists.length > 0 && (
        <div className="bg-gradient-to-br from-[#fffbeb] via-white to-[#fef3c7] rounded-3xl p-6 sm:p-7 border-4 border-[#ffbe00] shadow-[6px_6px_0px_#fde68a] space-y-4 relative overflow-hidden transition-all animate-fadeIn">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-300/20 rounded-full -mr-20 -mt-20 pointer-events-none blur-2xl" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#ffbe00] text-[#141720] flex items-center justify-center font-bold shadow-xs">
                <Zap className="w-5 h-5 fill-[#141720]" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold font-pixel text-[#1e293b] uppercase tracking-wide">
                  SURPRISE TWISTS
                </h3>
                <p className="text-xs font-retro text-[#64748b]">
                  Organizers have broadcasted these surprise twist requirements for all squads! Incorporate them for bonus points.
                </p>
              </div>
            </div>

            <span className="text-[10px] font-pixel text-[#b45309] bg-amber-100 px-3 py-1 rounded-full border border-amber-300 font-bold shrink-0 self-start sm:self-auto">
              EVALUATED BY JUDGES
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            {twists.map((twist) => (
              <div
                key={twist.id}
                className="p-4 rounded-2xl border-2 border-amber-300/90 bg-white/95 shadow-2xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-pixel px-2.5 py-0.5 rounded-md bg-[#ffbe00] text-[#141720] font-black border border-amber-600 shadow-3xs">
                      +{twist.bonusPoints} BONUS PTS
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold font-pixel text-[#1e293b] pt-0.5">
                    {twist.title}
                  </h4>
                  <p className="text-xs font-retro mt-1.5 leading-relaxed text-slate-700">
                    {twist.description}
                  </p>
                </div>

                {twist.releasedAt && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-[11px] font-retro text-[#64748b]">
                    <span className="text-[10px] text-slate-400">
                      Released {new Date(twist.releasedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOP ROW: Split 2-Box Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Top-Left Box: Problem Statement Details (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col justify-between relative overflow-hidden transition-all">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] font-pixel px-2.5 py-1 rounded-full bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase font-black tracking-wider">
                {challenge?.category || 'Arcade Game'}
              </span>
              <span className="text-xs font-retro font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{challenge?.difficulty || 'Intermediate'}</span>
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-bold font-pixel text-[#1e293b] mb-3 leading-snug tracking-tight">
              {challenge?.title || 'Selected Challenge'}
            </h2>

            {/* Styled Problem Statement Details Box */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-[#f8fbff] to-[#f0f7ff] rounded-2xl border-2 border-[#bad6fc] text-xs sm:text-sm font-retro text-[#334155] leading-relaxed shadow-2xs">
              <span className="font-pixel text-[10px] text-[#4e97fe] font-bold block mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#4e97fe]" />
                PROBLEM STATEMENT BRIEFING:
              </span>
              <p className="whitespace-pre-line text-slate-700 leading-relaxed font-normal">
                {challenge?.fullDescription || challenge?.shortDescription || 'Build your interactive Scratch project.'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-pixel text-[#64748b] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>SPEED & POLISH SCORE MULTIPLIER ACTIVE</span>
            </span>
            <span className="text-[10px] font-pixel px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
              ROUND 1 SPRINT
            </span>
          </div>
        </div>

        {/* Top-Right Box: Core Mechanics Checklist (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col justify-between transition-all">
          <div className="space-y-3">
            
            {/* Header & Progress Pill */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-[#4e97fe]" />
                <h3 className="text-xs font-bold font-pixel text-[#1e293b] uppercase tracking-wide">
                  REQUIRED GAME MECHANICS
                </h3>
              </div>
              <span className={`text-[10px] font-pixel px-2.5 py-0.5 rounded-full font-black border ${
                allMechanicsDone
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-[#f0f7ff] text-[#4e97fe] border-[#bad6fc]'
              }`}>
                {doneReqCount} / {totalReqCount} ({mechanicsPercent}%)
              </span>
            </div>

            {/* Dynamic Progress Bar Track */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allMechanicsDone
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-r from-[#4e97fe] to-[#38bdf8]'
                }`}
                style={{ width: `${mechanicsPercent}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2 pt-1">
              {challenge?.requirements &&
                challenge.requirements.map((req, idx) => {
                  const isDone = Boolean(checkedMechanics[idx]);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleMechanic(idx)}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isDone
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200 hover:border-[#bad6fc] hover:bg-white text-[#334155]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                        isDone
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-3xs'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className={`text-xs font-retro leading-snug flex-1 ${
                        isDone ? 'line-through text-emerald-800 opacity-80' : 'text-slate-800'
                      }`}>
                        {req}
                      </span>
                    </div>
                  );
                })}
            </div>

            {allMechanicsDone && (
              <div className="p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-[11px] font-pixel text-center flex items-center justify-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ALL REQUIRED MECHANICS VERIFIED & CODED!</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 text-[11px] font-retro text-[#64748b] text-center">
            Click to track mechanics as you code in Scratch
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Redesigned High-Impact Submission Console */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] space-y-6 transition-all">
        
        {/* Lock Banner */}
        {isLocked && (
          <div className={`p-4 sm:p-5 rounded-2xl border-2 flex items-start gap-3.5 ${
            submission?.status === 'LATE'
              ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
              : 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs'
          }`}>
            <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 ${
              submission?.status === 'LATE' ? 'bg-amber-600 shadow-xs' : 'bg-emerald-500 shadow-xs'
            }`}>
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold font-pixel">
                {submission?.status === 'LATE' ? 'LATE SUBMISSION LOCKED & RECEIVED' : 'SUBMISSION LOCKED & OFFICIALLY RECEIVED'}
              </p>
              <p className="text-xs font-retro mt-0.5 leading-relaxed opacity-90">
                {submission?.status === 'LATE'
                  ? 'Your project was received after the deadline and is marked as Late. Judges will evaluate your Scratch project and gameplay demo video.'
                  : 'Your project is safely locked in the database and is currently under evaluation by the official judging panel.'}
              </p>
            </div>
          </div>
        )}

        {/* Time is Up Alert Banner when not submitted yet */}
        {isTimeUp && !isLocked && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 animate-pulse shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold font-pixel text-rose-900">ROUND 1 SPRINT TIME IS UP!</p>
                <p className="text-xs font-retro text-rose-800 mt-0.5 leading-relaxed">
                  The sprint deadline has passed. Please finalize and submit your project immediately to avoid further late penalties!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFinalSubmitClick}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-pixel font-bold shadow-xs cursor-pointer shrink-0 self-start sm:self-auto active:scale-98"
            >
              FINAL SUBMIT NOW →
            </button>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center font-bold shadow-sm ${
              isLocked
                ? (submission?.status === 'LATE' ? 'bg-amber-600' : 'bg-emerald-500')
                : 'bg-gradient-to-tr from-[#4e97fe] to-[#307fef]'
            }`}>
              {isLocked ? <Lock className="w-6 h-6" /> : <Code2 className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                  {isLocked ? 'VERIFIED SUBMISSION DOSSIER' : 'PROJECT SUBMISSION CONSOLE'}
                </h3>
              </div>
              <p className="text-xs font-retro text-[#64748b] mt-0.5">
                {isLocked
                  ? 'Official locked project records and judge evaluation telemetry.'
                  : 'Submit your public Scratch project URL, story pitch, and gameplay demo video.'}
              </p>
            </div>
          </div>

          {submission?.status && (
            <span
              className={`text-[10px] font-pixel px-3 py-1.5 rounded-full self-start sm:self-auto font-black border uppercase tracking-wider ${
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

        {/* ─── CASE A: PROJECT IS LOCKED (VERIFIED DOSSIER VIEW) ─── */}
        {isLocked ? (
          <div className="space-y-6">
            
            {/* Live Interactive Scratch Arcade Screen */}
            {currentScratchId && (
              <div className="bg-[#1e293b] rounded-3xl p-4 sm:p-5 border-4 border-slate-700 shadow-[6px_6px_0px_#0f172a] text-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-pixel text-xs text-white font-bold tracking-wider">
                      SCRATCH LIVE GAME STAGE (PROJECT #{currentScratchId})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://scratch.mit.edu/projects/${currentScratchId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-lg bg-[#4e97fe] hover:bg-[#307fef] text-white text-[10px] font-pixel font-bold flex items-center gap-1 transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>OPEN ON SCRATCH MIT</span>
                    </a>
                  </div>
                </div>

                {/* Embedded Player Canvas */}
                <div className="relative w-full aspect-[4/3] max-h-[480px] rounded-2xl overflow-hidden bg-black border-2 border-slate-600 shadow-inner flex items-center justify-center">
                  <iframe
                    src={`https://scratch.mit.edu/projects/${currentScratchId}/embed`}
                    allowTransparency="true"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    allowFullScreen
                    className="w-full h-full"
                    title="Submitted Scratch Project"
                  />
                </div>
              </div>
            )}

            {/* Dossier Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Details: Story & Pitch (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Scratch Project URL Card */}
                <div className="p-4 rounded-2xl bg-[#f8fbff] border-2 border-[#bad6fc] space-y-1.5 shadow-2xs">
                  <span className="font-pixel text-[10px] text-[#4e97fe] uppercase font-bold tracking-wide flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    SUBMITTED SCRATCH PROJECT URL
                  </span>
                  <a
                    href={`https://scratch.mit.edu/projects/${currentScratchId || ''}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs sm:text-sm font-mono text-[#1e293b] font-bold hover:text-[#4e97fe] break-all block hover:underline"
                  >
                    {submission.scratchUrl}
                  </a>
                </div>

                {/* Story Pitch Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 space-y-2 shadow-2xs">
                  <span className="font-pixel text-[10px] text-[#64748b] uppercase font-bold tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#4e97fe]" />
                    STORY PITCH & MECHANICS EXPLANATION
                  </span>
                  <p className="text-xs sm:text-sm font-retro text-[#1e293b] whitespace-pre-line leading-relaxed">
                    {submission.shortDescription || 'No pitch provided.'}
                  </p>
                </div>

                {/* Controls & Notes */}
                {submission.notes && (
                  <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-1.5 shadow-2xs">
                    <span className="font-pixel text-[10px] text-[#64748b] uppercase font-bold tracking-wide">
                      CONTROLS & JUDGE NOTES
                    </span>
                    <p className="text-xs font-retro text-[#475569] whitespace-pre-line leading-relaxed">
                      {submission.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Details: Gameplay Video (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#f8fbff] border-2 border-[#bad6fc] space-y-3 shadow-2xs">
                  <span className="font-pixel text-[10px] text-[#4e97fe] uppercase font-bold tracking-wide flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5" />
                    GAMEPLAY VIDEO DEMO
                  </span>

                  {videoPreviewUrl ? (
                    <div className="space-y-2">
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full max-h-52 rounded-xl bg-slate-950 object-contain border border-slate-300 shadow-xs"
                      />
                      <span className="text-[11px] font-retro text-[#64748b] block text-center">
                        Attached video file submitted for judge scoring
                      </span>
                    </div>
                  ) : submission.videoUrl ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-white rounded-xl border border-[#bad6fc] flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-[#1e293b] truncate">
                          {submission.videoUrl}
                        </span>
                        <a
                          href={submission.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg bg-[#4e97fe] hover:bg-[#307fef] text-white text-[10px] font-pixel font-bold shrink-0 flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>PLAY</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-retro text-slate-500 italic">No video demo recorded.</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* ─── CASE B: PROJECT IS EDITABLE / DRAFT MODE ─── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Inputs (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* 1. Scratch Project URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1e293b] font-retro uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="font-pixel text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold">
                      STEP 1
                    </span>
                    <span>Public Scratch Project URL</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </span>
                  <span className="text-[10px] font-pixel text-[#4e97fe] font-black uppercase">
                    REQUIRED
                  </span>
                </label>
                
                <div className="relative">
                  <Gamepad2 className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={scratchUrl}
                    onChange={(e) => setScratchUrl(e.target.value)}
                    placeholder="https://scratch.mit.edu/projects/123456789"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-slate-200 text-xs sm:text-sm font-retro text-[#1e293b] placeholder-slate-400 focus:border-[#4e97fe] focus:ring-2 focus:ring-[#4e97fe]/10 outline-none transition-all bg-slate-50/50 focus:bg-white"
                  />
                </div>

                {/* Live Scratch Detection Indicator & In-App Test Button */}
                {currentScratchId && (
                  <div className="flex items-center justify-between gap-2 pt-1 animate-fadeIn">
                    <span className="text-[11px] font-retro text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Valid Scratch Project #{currentScratchId} detected</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowInAppScratchTest(!showInAppScratchTest)}
                      className="text-[10px] font-pixel text-[#4e97fe] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {showInAppScratchTest ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showInAppScratchTest ? 'Hide Game Player' : 'Test Game Player'}</span>
                    </button>
                  </div>
                )}

                {/* In-App Live Scratch Player Test Accordion */}
                {showInAppScratchTest && currentScratchId && (
                  <div className="mt-2 bg-[#1e293b] rounded-2xl p-3 border-2 border-slate-700 animate-fadeIn space-y-2">
                    <div className="flex items-center justify-between text-white text-[10px] font-pixel">
                      <span>LIVE SCRATCH GAME PREVIEW (PROJECT #{currentScratchId})</span>
                      <a
                        href={`https://scratch.mit.edu/projects/${currentScratchId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#4e97fe] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Scratch MIT ↗
                      </a>
                    </div>
                    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-black">
                      <iframe
                        src={`https://scratch.mit.edu/projects/${currentScratchId}/embed`}
                        allowTransparency="true"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        allowFullScreen
                        title="Scratch Test Embed"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Short Description & Story Pitch */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1e293b] font-retro uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="font-pixel text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold">
                      STEP 2
                    </span>
                    <span>Short Description & Story Pitch</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </span>
                  <span className="text-[10px] font-pixel text-[#4e97fe] font-black uppercase">
                    REQUIRED
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Explain the plot, objectives, game mechanics, and how your project fulfills the challenge theme..."
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-slate-200 text-xs sm:text-sm text-[#1e293b] placeholder-slate-400 focus:border-[#4e97fe] focus:ring-2 focus:ring-[#4e97fe]/10 outline-none resize-none font-retro transition-all bg-slate-50/50 focus:bg-white leading-relaxed"
                />
              </div>

              {/* 3. Controls & Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1e293b] font-retro uppercase tracking-wider flex items-center gap-1.5">
                  <span className="font-pixel text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold">
                    STEP 3
                  </span>
                  <span>Controls & Judge Notes (Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., [WASD] or [Arrows] to move, [Space] to shoot, click sprites to activate bonuses..."
                  className="w-full px-4 py-2 rounded-2xl border-2 border-slate-200 text-xs sm:text-sm text-[#1e293b] placeholder-slate-400 focus:border-[#4e97fe] focus:ring-2 focus:ring-[#4e97fe]/10 outline-none resize-none font-retro transition-all bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Right Column: Gameplay Video Module (5 Cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="p-4 sm:p-5 bg-[#f8fbff] rounded-3xl border-2 border-[#bad6fc] space-y-3 shadow-2xs">
                
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#1e293b] font-retro uppercase tracking-wider flex items-center gap-1.5">
                    <span className="font-pixel text-[10px] px-2 py-0.5 rounded-full bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] font-bold">
                      STEP 4
                    </span>
                    <span>Gameplay Video</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>

                  {/* Switch Between File Upload and Video Link */}
                  <div className="flex items-center bg-white p-1 rounded-xl border border-[#bad6fc] text-[10px] font-pixel shadow-xs gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setVideoMode('file');
                        setVideoError('');
                      }}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 ${
                        videoMode === 'file'
                          ? 'bg-[#4e97fe] text-white shadow-[0_2px_0_#2463bf]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoMode('link');
                        setVideoError('');
                      }}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 ${
                        videoMode === 'link'
                          ? 'bg-[#4e97fe] text-white shadow-[0_2px_0_#2463bf]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Link2 className="w-3 h-3" />
                      <span>Link</span>
                    </button>
                  </div>
                </div>

                {/* Mode A: Direct Video Upload (.MP4 / WebM / MOV) */}
                {videoMode === 'file' ? (
                  <div className="space-y-2">
                    {!videoPreviewUrl ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#bad6fc] rounded-2xl p-6 text-center transition-all bg-white group hover:border-[#4e97fe] hover:bg-[#f0f7ff]/40 cursor-pointer shadow-xs hover:shadow-sm"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f0f7ff] to-[#e0efff] text-[#4e97fe] border border-[#bad6fc] flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 group-hover:bg-[#4e97fe] group-hover:text-white transition-all shadow-xs">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div className="text-xs sm:text-sm font-retro font-bold text-[#1e293b] mb-1">
                          <span>Click to browse video file</span>
                        </div>
                        <p className="text-[11px] font-retro text-[#64748b]">
                          Supports <span className="font-bold text-[#4e97fe]">.MP4, .WEBM, .MOV</span> • Max{' '}
                          <span className="font-bold text-[#4e97fe]">50 MB</span>
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white p-3.5 rounded-2xl border-2 border-[#bad6fc] space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-8 h-8 rounded-lg bg-[#f0f7ff] text-[#4e97fe] flex items-center justify-center shrink-0">
                              <FileVideo className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-retro font-bold text-[#1e293b] truncate">
                              {videoFile ? videoFile.name : submission?.videoFileName || 'Selected Video Demo'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {videoFile && (
                              <span className="text-[10px] font-pixel px-2 py-0.5 rounded-md bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] font-bold">
                                {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={handleRemoveVideoFile}
                              className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Remove video file"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Built-in Video Player Preview */}
                        <video
                          src={videoPreviewUrl}
                          controls
                          className="w-full max-h-44 rounded-xl bg-slate-950 object-contain border border-slate-200"
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
                  <div className="space-y-2">
                    <div className="relative">
                      <Link2 className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=... or Drive link"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border-2 border-slate-200 text-xs font-retro text-[#1e293b] placeholder-slate-400 focus:border-[#4e97fe] outline-none bg-white shadow-2xs"
                      />
                    </div>
                    {videoUrl && (
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-retro text-[#4e97fe] font-bold hover:underline pt-0.5"
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

                {hasAttachedVideoFile && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-retro flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      <strong>Notice:</strong> Video file upload is processed on <strong>FINAL SUBMIT</strong>. To save a draft without finalizing, use a video link or remove the file.
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Full-Width Bottom Action Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
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
                  disabled={submitting || !hasAnyFieldFilled || hasAttachedVideoFile}
                  title={
                    hasAttachedVideoFile
                      ? 'Video file upload is only processed on Final Submission. Remove file or use a video link to save draft.'
                      : !hasAnyFieldFilled
                      ? 'Fill in at least one field to save a draft'
                      : 'Save work-in-progress draft'
                  }
                  className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-pixel transition-all flex items-center justify-center gap-2 font-bold ${
                    !hasAnyFieldFilled || hasAttachedVideoFile || submitting
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                      : 'bg-white hover:bg-slate-100 text-[#334155] border-2 border-[#bad6fc] shadow-[2px_2px_0px_#bad6fc] active:translate-y-0.5 cursor-pointer'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>SAVE DRAFT</span>
                </button>

                {/* Final Submit Button */}
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
              <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-xs font-pixel font-bold shadow-2xs ${
                submission?.status === 'LATE'
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-emerald-100 border-emerald-300 text-emerald-800'
              }`}>
                <CheckCircle2 className="w-4 h-4" />
                <span>{submission?.status === 'LATE' ? 'LATE SUBMISSION LOCKED' : 'PROJECT VERIFIED & LOCKED'}</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
