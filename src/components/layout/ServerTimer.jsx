import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatTimeRemaining } from '../../lib/utils.js';
import socketClient from '../../lib/socket.js';
import { Clock, AlertTriangle, Sparkles, Flame, ShieldAlert, CheckCircle2, Gamepad2, Award, Trophy } from 'lucide-react';

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
  const startHours = hasValidStartCountdown ? pad(timeLeft.hours) : '--';
  const startMinutes = hasValidStartCountdown ? pad(timeLeft.minutes) : '--';
  const startSeconds = hasValidStartCountdown ? pad(timeLeft.seconds) : '--';

  // 1. Live Sprints (Round 1 Building or Round 2 Live Presentation)
  if (isRound1 || isRound2) {
    return (
      <div
        className={`rounded-3xl p-5 sm:p-6 border-4 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 relative overflow-hidden ${
          isTimeUp
            ? 'bg-gradient-to-r from-rose-50 to-rose-100/50 border-rose-500 shadow-[6px_6px_0px_#fca5a5]'
            : isUrgent
            ? 'bg-gradient-to-r from-rose-50 to-amber-50 border-rose-500 shadow-[6px_6px_0px_#fca5a5] animate-pulse'
            : 'bg-white border-[#ffbe00] shadow-[6px_6px_0px_#fde68a]'
        }`}
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-200/30 rounded-full -mr-16 -mt-16 pointer-events-none blur-xl" />

        {/* Left Side: Live Stage & Context */}
        <div className="flex items-center gap-4 relative z-10">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold border-2 shrink-0 shadow-[3px_3px_0px_rgba(0,0,0,0.15)] ${
              isTimeUp
                ? 'bg-rose-600 text-white border-rose-700 animate-bounce shadow-[3px_3px_0px_#991b1b]'
                : isUrgent
                ? 'bg-gradient-to-tr from-rose-600 to-amber-500 text-white border-rose-600'
                : 'bg-gradient-to-tr from-[#ffbe00] to-[#f59e0b] text-[#141720] border-white shadow-[3px_3px_0px_#a4640c]'
            }`}
          >
            {isTimeUp ? (
              <AlertTriangle className="w-7 h-7 text-white" />
            ) : isUrgent ? (
              <Flame className="w-7 h-7 text-white" />
            ) : (
              <Clock className="w-7 h-7 text-[#141720]" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`text-[10px] font-pixel px-3 py-1 rounded-full font-black tracking-wide flex items-center gap-1.5 shadow-xs ${
                  isTimeUp
                    ? 'bg-rose-600 text-white'
                    : isUrgent
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#141720] text-[#ffbe00]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                {isTimeUp
                  ? (isRound1 ? 'ROUND 1 TIME IS UP!' : 'ROUND 2 TIME IS UP!')
                  : isRound1
                  ? 'ROUND 1 • BUILD SPRINT'
                  : 'ROUND 2 • LIVE PRESENTATIONS'}
              </span>

              {isTimeUp ? (
                <span className="text-[10px] font-pixel text-rose-700 font-bold uppercase animate-pulse">
                  SUBMIT IMMEDIATELY (MINIMIZE DEDUCTIONS)
                </span>
              ) : isUrgent ? (
                <span className="text-[10px] font-pixel text-rose-600 font-bold uppercase animate-bounce">
                  FINAL MINUTES!
                </span>
              ) : (
                <span className="text-[10px] font-pixel text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                  SERVER TIMER ACTIVE
                </span>
              )}
            </div>

            <p className="text-xs font-retro text-[#64748b] leading-relaxed">
              {isTimeUp
                ? 'Round 1 sprint window has ended! If you haven\'t submitted your project yet, do it fast to minimize late penalty grade deductions.'
                : 'Automated synchronized server clock • Save and finalize your Scratch project before the countdown ends.'}
            </p>
          </div>
        </div>

        {/* Right Side: BIG Tactical Digital Flip-Clock Countdown */}
        <div className="flex items-center gap-2 self-start md:self-auto relative z-10">
          
          {/* Hours Tile */}
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white px-3.5 sm:px-4 py-2.5 rounded-2xl border-2 border-slate-700 shadow-[2px_2px_0px_#0f172a] font-pixel text-xl sm:text-2xl font-black tracking-wider text-center min-w-[54px] sm:min-w-[60px] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/5 border-b border-white/10" />
              {pad(timeLeft.hours)}
            </div>
            <span className="text-[9px] font-pixel text-[#64748b] font-bold mt-1 tracking-wider">HRS</span>
          </div>

          <span className="font-pixel text-xl sm:text-2xl text-slate-400 font-black -mt-4">:</span>

          {/* Minutes Tile */}
          <div className="flex flex-col items-center">
            <div className={`px-3.5 sm:px-4 py-2.5 rounded-2xl border-2 font-pixel text-xl sm:text-2xl font-black tracking-wider text-center min-w-[54px] sm:min-w-[60px] relative overflow-hidden ${
              isUrgent
                ? 'bg-gradient-to-b from-rose-600 to-rose-800 text-white border-rose-700 animate-pulse shadow-[2px_2px_0px_#991b1b]'
                : 'bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white border-slate-700 shadow-[2px_2px_0px_#0f172a]'
            }`}>
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/10 border-b border-white/10" />
              {pad(timeLeft.minutes)}
            </div>
            <span className="text-[9px] font-pixel text-[#64748b] font-bold mt-1 tracking-wider">MIN</span>
          </div>

          <span className="font-pixel text-xl sm:text-2xl text-slate-400 font-black -mt-4">:</span>

          {/* Seconds Tile */}
          <div className="flex flex-col items-center">
            <div className={`px-3.5 sm:px-4 py-2.5 rounded-2xl border-2 font-pixel text-xl sm:text-2xl font-black tracking-wider text-center min-w-[54px] sm:min-w-[60px] relative overflow-hidden ${
              isUrgent
                ? 'bg-gradient-to-b from-rose-600 to-rose-800 text-white border-rose-700 shadow-[2px_2px_0px_#991b1b]'
                : 'bg-gradient-to-b from-[#4e97fe] to-[#2563eb] text-white border-[#307fef] shadow-[2px_2px_0px_#1d4ed8]'
            }`}>
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 border-b border-white/10" />
              {pad(timeLeft.seconds)}
            </div>
            <span className="text-[9px] font-pixel text-[#64748b] font-bold mt-1 tracking-wider">SEC</span>
          </div>

        </div>
      </div>
    );
  }

  // 2. Non-sprint stages (Selection, Registration, Judging, Completed, Countdown) -> Shows "WILL START IN : -- : -- : --"
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#f0f7ff] border-2 border-[#bad6fc] flex items-center justify-center shrink-0 text-[#4e97fe]">
          {hasValidStartCountdown ? (
            <Clock className="w-5 h-5" />
          ) : stage === 'CHALLENGE_SELECTION' ? (
            <Gamepad2 className="w-5 h-5" />
          ) : stage.includes('JUDGING') ? (
            <Award className="w-5 h-5" />
          ) : stage === 'COMPLETED' ? (
            <Trophy className="w-5 h-5 text-amber-500" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-pixel px-2.5 py-0.5 rounded font-bold uppercase ${
              hasValidStartCountdown
                ? isRound2Prep
                  ? 'bg-[#ffbe00] text-[#141720]'
                  : 'bg-[#ffbe00] text-[#141720]'
                : 'bg-[#4e97fe] text-white'
            }`}>
              {hasValidStartCountdown
                ? isRound2Prep
                  ? 'ROUND 2 PRESENTATION COUNTDOWN'
                  : 'ROUND 1 SPRINT COUNTDOWN'
                : stage === 'REGISTRATION' || stage === 'WAITING_CHALLENGES'
                ? 'TOURNAMENT STATUS: STANDBY'
                : stage === 'ROUND2_PREP'
                ? 'ROUND 2 FINALIST PREPARATION'
                : `TOURNAMENT STAGE: ${stage.replace(/_/g, ' ')}`}
            </span>
          </div>
          <p className="text-xs font-retro text-[#64748b] mt-1">
            {hasValidStartCountdown
              ? isRound2Prep
                ? 'Round 2 Live Presentations are scheduled. The live presentation stage and judge rubric will unlock automatically when countdown reaches zero.'
                : 'Round 1 sprint is scheduled. Build consoles and project submissions will unlock automatically when countdown reaches zero.'
              : stage === 'CHALLENGE_SELECTION'
              ? 'Problem statements selection is open. Squads can review and claim problem statements.'
              : stage === 'ROUND2_PREP'
              ? 'Finalists have been nominated. Organizers are preparing the Round 2 live presentation schedule.'
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
