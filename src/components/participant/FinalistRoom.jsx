import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fireConfetti } from '../../lib/utils.js';
import {
  Trophy,
  Sparkles,
  Presentation,
  Award,
  Crown,
  ExternalLink,
  CheckCircle2,
  Mic,
  Monitor,
  Gamepad2,
  Clock,
} from 'lucide-react';

export default function FinalistRoom({ onNavigateLeaderboard }) {
  const { team, eventConfig } = useAuth();
  const isFinalist = Boolean(team?.isFinalist);
  const stage = eventConfig?.currentStage || 'REGISTRATION';

  useEffect(() => {
    if (isFinalist) {
      fireConfetti();
    }
  }, [isFinalist]);

  if (!isFinalist) {
    return null;
  }

  const submission = team?.submissions?.[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Hero Celebratory Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-4 border-[#ffbe00] shadow-[8px_8px_0px_#fde68a] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-b from-[#fffdf5] to-white">
        
        {/* Confetti / Glow accents */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-200/40 rounded-full -mr-16 -mt-16 pointer-events-none blur-2xl" />

        <div className="relative z-10 flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ffbe00] to-[#f6ab3c] border-2 border-white flex items-center justify-center text-3xl shadow-[3px_3px_0px_#a4640c] shrink-0">
            🏆
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#ffbe00] text-[#141720] flex items-center gap-1 font-pixel shadow-xs">
                <Crown className="w-3 h-3" /> OFFICIAL ROUND 2 FINALIST
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-pixel font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ADVANCED
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1e293b] font-pixel tracking-tight">
              CONGRATULATIONS, {team?.name}!
            </h2>
            <p className="text-xs font-retro text-[#64748b] mt-1 max-w-lg leading-relaxed">
              Your Scratch project scored highest in <strong className="text-[#4e97fe]">{team?.challenge?.title || 'your challenge category'}</strong>! Your squad has advanced to the official Round 2 live presentation stage.
            </p>
          </div>
        </div>

        {/* Presentation Slot Pill */}
        <div className="relative z-10 bg-[#f0f7ff] px-6 py-4 rounded-2xl border-2 border-[#bad6fc] shadow-sm text-center shrink-0 min-w-[170px]">
          <span className="text-[10px] uppercase font-pixel font-bold text-[#64748b] block tracking-wide">
            LIVE PITCH QUEUE
          </span>
          <span className="text-2xl font-black font-pixel text-[#4e97fe] block mt-0.5">
            SLOT #{team?.r2PresentationSlot || 1}
          </span>
          <span className="text-[10px] font-retro text-[#64748b] block mt-0.5">
            {stage === 'ROUND2_LIVE' ? '🔴 Live Stage Active' : 'Standby for Presentation'}
          </span>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {onNavigateLeaderboard && (
          <button
            type="button"
            onClick={onNavigateLeaderboard}
            className="px-5 py-2.5 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel font-bold transition-all shadow-[3px_3px_0px_#2463bf] cursor-pointer inline-flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            <span>VIEW LIVE LEADERBOARD STANDINGS ↗</span>
          </button>
        )}

        {submission?.scratchUrl && (
          <a
            href={submission.scratchUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#1e293b] border-2 border-slate-300 text-xs font-pixel font-bold transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Gamepad2 className="w-4 h-4 text-[#4e97fe]" />
            <span>LAUNCH SCRATCH DEMO ↗</span>
          </a>
        )}
      </div>

      {/* 10-Minute Presentation Blueprint & Live Pitch Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* 10-Minute Presentation Blueprint (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs sm:text-sm font-bold font-pixel text-[#1e293b] flex items-center gap-2">
              <Presentation className="w-4 h-4 text-[#4e97fe]" />
              10-MINUTE LIVE PRESENTATION BLUEPRINT
            </h3>
            <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
              ROUND 2 RUBRIC
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#f0f7ff] border-2 border-[#bad6fc] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold font-pixel text-xs text-[#4e97fe]">1. Concept & Vision</span>
                <span className="text-[10px] font-mono font-bold text-[#64748b]">2 Mins</span>
              </div>
              <p className="text-[11px] font-retro text-[#64748b]">
                Introduce your squad, game mechanics, and how you solved the problem statement.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold font-pixel text-xs text-emerald-800">2. Live Gameplay</span>
                <span className="text-[10px] font-mono font-bold text-emerald-700">4 Mins</span>
              </div>
              <p className="text-[11px] font-retro text-emerald-900/80">
                Play through your Scratch game live, demonstrating sprites, collisions, and win/loss states.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold font-pixel text-xs text-amber-900">3. Code Architecture</span>
                <span className="text-[10px] font-mono font-bold text-amber-800">2 Mins</span>
              </div>
              <p className="text-[11px] font-retro text-amber-950/80">
                Switch to 'See Inside' on Scratch to showcase custom blocks, variables, broadcasts, and loops.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50 border-2 border-purple-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold font-pixel text-xs text-purple-900">4. Judge Q&A</span>
                <span className="text-[10px] font-mono font-bold text-purple-800">2 Mins</span>
              </div>
              <p className="text-[11px] font-retro text-purple-950/80">
                Answer technical judge questions and highlight each teammate's individual contribution.
              </p>
            </div>
          </div>
        </div>

        {/* Live Presentation Readiness Checklist (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs sm:text-sm font-bold font-pixel text-[#1e293b] flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#ffbe00]" />
              PITCH READINESS CHECKLIST
            </h3>
          </div>

          <div className="space-y-2.5 text-xs font-retro">
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold font-pixel text-[11px] text-[#1e293b] block">Open Project in New Tab</span>
                <span className="text-[11px] text-[#64748b]">Have your Scratch project loaded with the green flag ready.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold font-pixel text-[11px] text-[#1e293b] block">Test Microphone & Screenshare</span>
                <span className="text-[11px] text-[#64748b]">Ensure all presenters can be heard clearly by the judges.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold font-pixel text-[11px] text-[#1e293b] block">Speaking Roles Divided</span>
                <span className="text-[11px] text-[#64748b]">Ensure every squad member speaks during the 10-minute presentation.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
