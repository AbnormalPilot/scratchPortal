import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatTimeRemaining } from '../../lib/utils.js';
import { Clock, AlertTriangle } from 'lucide-react';

export default function ServerTimer() {
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
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold shadow-sm ${
      isUrgent
        ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
        : 'bg-[#3c86ee] text-white border-white/30'
    }`}>
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>{isRound1 ? 'R1 SPRINT' : 'R2 DEMO'}:</span>
      <span className="tracking-wider">{timeLeft.text}</span>
    </div>
  );
}
