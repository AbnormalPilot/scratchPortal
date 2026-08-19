import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatTimeRemaining } from '../../lib/utils.js';
import { Clock, AlertTriangle, PlayCircle, ShieldCheck } from 'lucide-react';

export default function ServerTimer({ className = '' }) {
  const { eventConfig } = useAuth();
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false, text: '00:00:00' });

  const stage = eventConfig?.currentStage;
  const isRound1 = stage === 'ROUND1_BUILDING';
  const isRound2 = stage === 'ROUND2_LIVE';
  const targetEndTime = isRound1 ? eventConfig?.r1EndTime : isRound2 ? eventConfig?.r2EndTime : null;

  useEffect(() => {
    if (!targetEndTime) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: false, text: '--:--:--' });
      return;
    }

    const updateTimer = () => {
      setTimeLeft(formatTimeRemaining(targetEndTime));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetEndTime]);

  if (!isRound1 && !isRound2) {
    return null;
  }

  const isUrgent = !timeLeft.isExpired && timeLeft.hours === 0 && timeLeft.minutes < 15;

  return (
    <div
      className={`glass-panel rounded-2xl p-4 sm:p-6 border ${
        isUrgent
          ? 'border-amber-500/60 bg-amber-950/20'
          : isRound1
          ? 'border-cyan-500/40 bg-cyan-950/20'
          : 'border-purple-500/40 bg-purple-950/20'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isUrgent
                ? 'bg-amber-500/20 text-amber-400'
                : isRound1
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-purple-500/20 text-purple-400'
            }`}
          >
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {isRound1 ? 'Round 1 Build Sprint' : 'Round 2 Presentation'}
              </span>
              {isUrgent && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> FINAL MINUTES
                </span>
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-200">
              {isRound1 ? 'Build, test, and submit your Scratch project' : 'Live demo and judge technical Q&A'}
            </h3>
          </div>
        </div>

        {/* Big Countdown */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950/80 px-5 py-2.5 rounded-xl border border-slate-800 shadow-inner">
            <span
              className={`font-mono-numbers text-3xl sm:text-4xl font-black tracking-widest ${
                isUrgent ? 'text-amber-400 animate-pulse' : isRound1 ? 'text-cyan-400' : 'text-purple-400'
              }`}
            >
              {timeLeft.text}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono uppercase tracking-widest -rotate-90 hidden sm:block">
            TIME LEFT
          </span>
        </div>
      </div>
    </div>
  );
}
