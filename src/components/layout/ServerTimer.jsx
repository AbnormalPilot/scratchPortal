import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatTimeRemaining } from '../../lib/utils.js';
import socketClient from '../../lib/socket.js';
import { Clock, AlertTriangle, Sparkles, Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function ServerTimer() {
  const { eventConfig, refreshSession } = useAuth();
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    text: '--:--:--',
  });

  const stage = eventConfig?.currentStage || 'REGISTRATION';
  const isRound1 = stage === 'ROUND1_BUILDING';
  const isRound2 = stage === 'ROUND2_LIVE';
  
  // If in sprint, target is round end time; otherwise target is round start time
  const targetEndTime = isRound1
    ? eventConfig?.r1EndTime
    : isRound2
    ? eventConfig?.r2EndTime
    : eventConfig?.r1StartTime;

  useEffect(() => {
    if (!targetEndTime) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true, text: '--:--:--' });
      return;
    }

    const updateTimer = () => {
      const remaining = formatTimeRemaining(targetEndTime);
      setTimeLeft(remaining);
      if (remaining.isExpired && !isRound1 && !isRound2 && refreshSession) {
        refreshSession();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    const handleTimerAdjust = () => {
      if (refreshSession) refreshSession();
    };
    socketClient.on('timer:adjusted', handleTimerAdjust);
    socketClient.on('stage:changed', handleTimerAdjust);

    return () => {
      clearInterval(interval);
      socketClient.off('timer:adjusted', handleTimerAdjust);
      socketClient.off('stage:changed', handleTimerAdjust);
    };
  }, [targetEndTime, stage]);

  const isUrgent =
    (isRound1 || isRound2) &&
    !timeLeft.isExpired &&
    timeLeft.hours === 0 &&
    timeLeft.minutes < 15;

  const pad = (n) => String(n).padStart(2, '0');

  const hasValidStartCountdown = !isRound1 && !isRound2 && !timeLeft.isExpired && targetEndTime;
  const startHours = hasValidStartCountdown ? pad(timeLeft.hours) : '--';
  const startMinutes = hasValidStartCountdown ? pad(timeLeft.minutes) : '--';
  const startSeconds = hasValidStartCountdown ? pad(timeLeft.seconds) : '--';

  // 1. Live Sprints (Round 1 Building or Round 2 Live Presentation)
  if (isRound1 || isRound2) {
    return (
      <div
        className={`rounded-2xl p-4 sm:p-5 border-4 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${
          isUrgent
            ? 'bg-rose-50 border-rose-500 shadow-[6px_6px_0px_#fca5a5] animate-pulse'
            : 'bg-white border-[#ffbe00] shadow-[6px_6px_0px_#fde68a]'
        }`}
      >
        {/* Left Side: Live Stage & Context */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold border-2 shrink-0 ${
              isUrgent
                ? 'bg-rose-500 text-white border-rose-600'
                : 'bg-[#ffbe00] text-[#141720] border-[#d98516]'
            }`}
          >
            {isUrgent ? '🚨' : '⏱️'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-pixel px-2.5 py-0.5 rounded font-black tracking-wide ${
                  isUrgent
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#141720] text-[#ffbe00]'
                }`}
              >
                {isRound1 ? 'ROUND 1 • BUILD SPRINT' : 'ROUND 2 • LIVE PRESENTATIONS'}
              </span>

              {isUrgent && (
                <span className="text-[10px] font-pixel text-rose-600 font-bold uppercase animate-bounce">
                  ⚡ FINAL MINUTES!
                </span>
              )}
            </div>

            <p className="text-xs font-retro text-[#64748b] mt-1">
              Automated server clock • Scratch projects must be saved before countdown reaches zero.
            </p>
          </div>
        </div>

        {/* Right Side: BIG Digital Pixel Countdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          
          {/* Hours Block */}
          <div className="flex flex-col items-center">
            <div className="bg-[#1e293b] text-white px-3 sm:px-4 py-2 rounded-xl border-2 border-slate-700 shadow-inner font-pixel text-lg sm:text-2xl font-black tracking-wider">
              {pad(timeLeft.hours)}
            </div>
            <span className="text-[9px] font-pixel text-[#64748b] mt-1">HRS</span>
          </div>

          <span className="font-pixel text-lg sm:text-2xl text-[#1e293b] font-black -mt-4">:</span>

          {/* Minutes Block */}
          <div className="flex flex-col items-center">
            <div className={`px-3 sm:px-4 py-2 rounded-xl border-2 font-pixel text-lg sm:text-2xl font-black tracking-wider shadow-inner ${
              isUrgent
                ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                : 'bg-[#1e293b] text-white border-slate-700'
            }`}>
              {pad(timeLeft.minutes)}
            </div>
            <span className="text-[9px] font-pixel text-[#64748b] mt-1">MIN</span>
          </div>

          <span className="font-pixel text-lg sm:text-2xl text-[#1e293b] font-black -mt-4">:</span>

          {/* Seconds Block */}
          <div className="flex flex-col items-center">
            <div className={`px-3 sm:px-4 py-2 rounded-xl border-2 font-pixel text-lg sm:text-2xl font-black tracking-wider shadow-inner ${
              isUrgent
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-[#4e97fe] text-white border-[#307fef]'
            }`}>
              {pad(timeLeft.seconds)}
            </div>
            <span className="text-[9px] font-pixel text-[#64748b] mt-1">SEC</span>
          </div>

        </div>
      </div>
    );
  }

  // 2. Non-sprint stages (Selection, Registration, Judging, Completed, Countdown) -> Shows "WILL START IN : -- : -- : --"
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#f0f7ff] border-2 border-[#bad6fc] text-xl flex items-center justify-center shrink-0 text-[#4e97fe]">
          {hasValidStartCountdown ? '⏱️' : stage === 'CHALLENGE_SELECTION' ? '🎮' : stage.includes('JUDGING') ? '⚖️' : stage === 'COMPLETED' ? '🏆' : '🚀'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-pixel px-2.5 py-0.5 rounded font-bold uppercase ${
              hasValidStartCountdown
                ? 'bg-[#ffbe00] text-[#141720]'
                : 'bg-[#4e97fe] text-white'
            }`}>
              {hasValidStartCountdown
                ? '⚡ SPRINT KICKOFF COUNTDOWN'
                : stage === 'REGISTRATION' || stage === 'WAITING_CHALLENGES'
                ? 'TOURNAMENT STATUS: STANDBY'
                : `TOURNAMENT STAGE: ${stage.replace(/_/g, ' ')}`}
            </span>
          </div>
          <p className="text-xs font-retro text-[#64748b] mt-1">
            {hasValidStartCountdown
              ? 'Round 1 sprint is scheduled. Build consoles and project submissions will unlock automatically when countdown reaches zero.'
              : stage === 'CHALLENGE_SELECTION'
              ? 'Problem statements selection is open. Squads can review and claim problem statements.'
              : stage.includes('JUDGING')
              ? 'Panel evaluations currently in progress. Scores being tallied live.'
              : stage === 'COMPLETED'
              ? 'Tournament concluded. Official final results published on leaderboard.'
              : 'Squad registration active. Awaiting tournament kickoff by organizers.'}
          </p>
        </div>
      </div>

      {/* Right Side: Digital "WILL START IN : -- : -- : --" */}
      <div className="flex flex-col items-start sm:items-end gap-1 self-start sm:self-auto shrink-0">
        <span className="text-[9px] font-pixel text-[#64748b] uppercase tracking-wider">
          WILL START IN :
        </span>

        <div className="flex items-center gap-1.5">
          <div className="flex flex-col items-center">
            <div className="bg-slate-100 text-[#475569] px-2.5 py-1.5 rounded-xl border border-slate-300 font-pixel text-xs sm:text-sm font-bold tracking-wider shadow-inner">
              {startHours}
            </div>
            <span className="text-[8px] font-pixel text-[#94a3b8] mt-0.5">HRS</span>
          </div>

          <span className="font-pixel text-xs sm:text-sm text-slate-400 font-bold -mt-3">:</span>

          <div className="flex flex-col items-center">
            <div className="bg-slate-100 text-[#475569] px-2.5 py-1.5 rounded-xl border border-slate-300 font-pixel text-xs sm:text-sm font-bold tracking-wider shadow-inner">
              {startMinutes}
            </div>
            <span className="text-[8px] font-pixel text-[#94a3b8] mt-0.5">MIN</span>
          </div>

          <span className="font-pixel text-xs sm:text-sm text-slate-400 font-bold -mt-3">:</span>

          <div className="flex flex-col items-center">
            <div className="bg-slate-100 text-[#475569] px-2.5 py-1.5 rounded-xl border border-slate-300 font-pixel text-xs sm:text-sm font-bold tracking-wider shadow-inner">
              {startSeconds}
            </div>
            <span className="text-[8px] font-pixel text-[#94a3b8] mt-0.5">SEC</span>
          </div>
        </div>
      </div>

    </div>
  );
}
