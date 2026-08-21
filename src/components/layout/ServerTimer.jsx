import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatTimeRemaining } from '../../lib/utils.js';
import socketClient from '../../lib/socket.js';
import { Clock, AlertTriangle, Flame } from 'lucide-react';

export default function ServerTimer() {
  const { user, team, eventConfig, refreshSession } = useAuth();
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
  const isRound2Prep = stage === 'ROUND2_PREP' || (Boolean(eventConfig?.r2StartTime) && !isRound1 && stage !== 'REGISTRATION' && stage !== 'CHALLENGE_SELECTION');
  
  const isParticipant = user?.role === 'PARTICIPANT';
  const isFinalist = Boolean(team?.isFinalist);

  // If in Round 2 prep or live presentation, only show to qualified finalists, judges, and admins
  if ((isRound2 || isRound2Prep) && isParticipant && !isFinalist) {
    return null;
  }

  // If in live sprint, target is round end time; otherwise target is round start time
  const targetEndTime = isRound1
    ? eventConfig?.r1EndTime
    : isRound2
    ? eventConfig?.r2EndTime
    : isRound2Prep
    ? eventConfig?.r2StartTime
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

  const isTimeUp = (isRound1 || isRound2) && timeLeft.isExpired;
  const isUrgent =
    (isRound1 || isRound2) &&
    !timeLeft.isExpired &&
    timeLeft.hours === 0 &&
    timeLeft.minutes < 15;

  const pad = (n) => String(n).padStart(2, '0');

  const hasValidStartCountdown = !isRound1 && !isRound2 && !timeLeft.isExpired && targetEndTime;
  const displayHours = (isRound1 || isRound2) ? pad(timeLeft.hours) : (hasValidStartCountdown ? pad(timeLeft.hours) : '--');
  const displayMinutes = (isRound1 || isRound2) ? pad(timeLeft.minutes) : (hasValidStartCountdown ? pad(timeLeft.minutes) : '--');
  const displaySeconds = (isRound1 || isRound2) ? pad(timeLeft.seconds) : (hasValidStartCountdown ? pad(timeLeft.seconds) : '--');

  // 1. Live Sprints (Round 1 Building or Round 2 Live Presentation)
  if (isRound1 || isRound2) {
    return (
      <div
        className={`rounded-3xl p-5 sm:p-6 border-4 transition-all duration-300 flex flex-col items-center justify-center text-center gap-3 mb-6 relative overflow-hidden ${
          isTimeUp
            ? 'bg-gradient-to-r from-rose-50 to-rose-100/50 border-rose-500 shadow-[6px_6px_0px_#fca5a5]'
            : isUrgent
            ? 'bg-gradient-to-r from-rose-50 to-amber-50 border-rose-500 shadow-[6px_6px_0px_#fca5a5] animate-pulse'
            : 'bg-white border-[#ffbe00] shadow-[6px_6px_0px_#fde68a]'
        }`}
      >
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-32 bg-amber-200/20 rounded-full blur-2xl pointer-events-none" />

        {/* Info Label / Pill */}
        <div className="flex items-center justify-center gap-2 relative z-10">
          <span
            className={`text-[10px] font-pixel px-3.5 py-1 rounded-full font-black tracking-wider uppercase flex items-center gap-1.5 shadow-3xs ${
              isTimeUp
                ? 'bg-rose-600 text-white animate-bounce'
                : isUrgent
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-[#141720] text-[#ffbe00] border border-[#a4640c]'
            }`}
          >
            {isTimeUp ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                <span>{isRound1 ? 'ROUND 1 SPRINT TIME IS UP' : 'ROUND 2 TIME IS UP'}</span>
              </>
            ) : isUrgent ? (
              <>
                <Flame className="w-3.5 h-3.5 text-white" />
                <span>FINAL MINUTES • ENDS IN</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                <span>{isRound1 ? 'ROUND 1 BUILD SPRINT • ENDS IN' : 'ROUND 2 LIVE PRESENTATION • ENDS IN'}</span>
              </>
            )}
          </span>
        </div>

        {/* Centered Digital Countdown Tiles */}
        <div className="flex items-center justify-center gap-2 sm:gap-2.5 relative z-10">
          {/* Hours Tile */}
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 border-slate-700 shadow-[2px_2px_0px_#0f172a] font-pixel text-xl sm:text-3xl font-black tracking-wider text-center min-w-[62px] sm:min-w-[74px] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/5 border-b border-white/10" />
              {displayHours}
            </div>
            <span className="text-[9px] font-pixel text-[#64748b] font-bold mt-1 tracking-wider">HRS</span>
          </div>

          <span className="font-pixel text-xl sm:text-3xl text-slate-400 font-black -mt-4">:</span>

          {/* Minutes Tile */}
          <div className="flex flex-col items-center">
            <div className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 font-pixel text-xl sm:text-3xl font-black tracking-wider text-center min-w-[62px] sm:min-w-[74px] relative overflow-hidden ${
              isUrgent
                ? 'bg-gradient-to-b from-rose-600 to-rose-800 text-white border-rose-700 animate-pulse shadow-[2px_2px_0px_#991b1b]'
                : 'bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white border-slate-700 shadow-[2px_2px_0px_#0f172a]'
            }`}>
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/10 border-b border-white/10" />
              {displayMinutes}
            </div>
            <span className="text-[9px] font-pixel text-[#64748b] font-bold mt-1 tracking-wider">MIN</span>
          </div>

          <span className="font-pixel text-xl sm:text-3xl text-slate-400 font-black -mt-4">:</span>

          {/* Seconds Tile */}
          <div className="flex flex-col items-center">
            <div className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 font-pixel text-xl sm:text-3xl font-black tracking-wider text-center min-w-[62px] sm:min-w-[74px] relative overflow-hidden ${
              isUrgent
                ? 'bg-gradient-to-b from-rose-600 to-rose-800 text-white border-rose-700 shadow-[2px_2px_0px_#991b1b]'
                : 'bg-gradient-to-b from-[#4e97fe] to-[#2563eb] text-white border-[#307fef] shadow-[2px_2px_0px_#1d4ed8]'
            }`}>
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 border-b border-white/10" />
              {displaySeconds}
            </div>
            <span className="text-[9px] font-pixel text-[#64748b] font-bold mt-1 tracking-wider">SEC</span>
          </div>
        </div>

        {isTimeUp && (
          <p className="text-xs font-retro text-rose-700 font-bold relative z-10">
            Submit your Scratch project immediately to minimize late penalty deductions!
          </p>
        )}
      </div>
    );
  }

  // 2. Non-sprint stages (Selection, Registration, Judging, Completed, Countdown)
  const getStageLabel = () => {
    if (hasValidStartCountdown) {
      return isRound2Prep ? 'ROUND 2 PRESENTATION STARTS IN' : 'ROUND 1 SPRINT STARTS IN';
    }
    if (stage === 'REGISTRATION' || stage === 'WAITING_CHALLENGES') {
      return 'WILL START IN';
    }
    if (stage === 'CHALLENGE_SELECTION') {
      return 'CHALLENGE SELECTION • SPRINT STARTS IN';
    }
    if (stage === 'ROUND2_PREP') {
      return 'ROUND 2 PREPARATION • STARTS IN';
    }
    if (stage.includes('JUDGING')) {
      return 'PANEL EVALUATION IN PROGRESS';
    }
    if (stage === 'COMPLETED') {
      return 'TOURNAMENT COMPLETED';
    }
    return 'WILL START IN';
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col items-center justify-center text-center gap-3 mb-6 relative overflow-hidden transition-all">
      {/* Soft background ambient accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-32 bg-[#bad6fc]/20 rounded-full blur-2xl pointer-events-none" />

      {/* Info Label / Pill */}
      <div className="flex items-center justify-center gap-2 relative z-10">
        <span className={`text-[10px] font-pixel px-3.5 py-1 rounded-full font-black uppercase tracking-wider flex items-center gap-1.5 shadow-3xs ${
          hasValidStartCountdown
            ? 'bg-[#ffbe00] text-[#141720] border border-[#d98516]'
            : 'bg-[#4e97fe] text-white'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>{getStageLabel()}</span>
        </span>
      </div>

      {/* Centered Digital Countdown Tiles */}
      <div className="flex items-center justify-center gap-2 sm:gap-2.5 relative z-10">
        {/* Hours Tile */}
        <div className="flex flex-col items-center">
          <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 border-slate-700 shadow-[2px_2px_0px_#0f172a] font-pixel text-xl sm:text-3xl font-black tracking-wider text-center min-w-[62px] sm:min-w-[74px] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/5 border-b border-white/10" />
            {displayHours}
          </div>
          <span className="text-[9px] font-pixel text-[#64748b] font-bold mt-1 tracking-wider">HRS</span>
        </div>

        <span className="font-pixel text-xl sm:text-3xl text-slate-400 font-black -mt-4">:</span>

        {/* Minutes Tile */}
        <div className="flex flex-col items-center">
          <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 border-slate-700 shadow-[2px_2px_0px_#0f172a] font-pixel text-xl sm:text-3xl font-black tracking-wider text-center min-w-[62px] sm:min-w-[74px] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/5 border-b border-white/10" />
            {displayMinutes}
          </div>
          <span className="text-[9px] font-pixel text-[#64748b] font-bold mt-1 tracking-wider">MIN</span>
        </div>

        <span className="font-pixel text-xl sm:text-3xl text-slate-400 font-black -mt-4">:</span>

        {/* Seconds Tile */}
        <div className="flex flex-col items-center">
          <div className="bg-gradient-to-b from-[#4e97fe] to-[#2563eb] text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 border-[#307fef] shadow-[2px_2px_0px_#1d4ed8] font-pixel text-xl sm:text-3xl font-black tracking-wider text-center min-w-[62px] sm:min-w-[74px] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 border-b border-white/10" />
            {displaySeconds}
          </div>
          <span className="text-[9px] font-pixel text-[#64748b] font-bold mt-1 tracking-wider">SEC</span>
        </div>
      </div>
    </div>
  );
}
