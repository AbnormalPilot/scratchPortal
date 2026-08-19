import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fireConfetti } from '../../lib/utils.js';
import ServerTimer from '../layout/ServerTimer.jsx';
import {
  Trophy,
  Sparkles,
  Presentation,
  CheckCircle2,
  Clock,
  Video,
  Award,
  HelpCircle,
  Users,
} from 'lucide-react';

export default function FinalistRoom() {
  const { team, user } = useAuth();
  const isFinalist = team?.isFinalist;

  useEffect(() => {
    if (isFinalist) {
      fireConfetti();
    }
  }, [isFinalist]);

  if (!isFinalist) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Award className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100">Round 1 Evaluation Complete</h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Thank you for building an amazing Scratch project, <strong className="text-slate-200">{team?.name}</strong>! 
          Round 2 finalist presentations are currently underway. You can watch live or check the final leaderboard once scores are published.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 2-Hour Live Timer */}
      <ServerTimer />

      {/* Hero Celebratory Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-slate-950/60 shadow-2xl shadow-amber-950/30">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-xl shadow-amber-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 animate-bounce" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-md shadow-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5" /> ROUND 2 FINALIST
                </span>
                <span className="text-xs font-mono text-amber-300">Top Team in Challenge</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
                Congratulations, {team?.name}!
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Your Scratch game scored the highest in <strong className="text-cyan-300">{team?.challenge?.title}</strong>. 
                You are advancing to the live demonstration and presentation round!
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 px-6 py-4 rounded-2xl border border-amber-500/40 text-center shrink-0">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Presentation Queue</span>
            <span className="text-2xl font-black text-amber-400">
              Slot #{team?.r2PresentationSlot || 1}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Stage Presentation</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recommended Presentation Structure (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Presentation className="w-5 h-5 text-amber-400" />
              Recommended 10-Minute Presentation Blueprint
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <h5 className="font-bold text-slate-200">Problem & Concept Overview (1-2 mins)</h5>
                  <p className="text-slate-400 mt-0.5">Introduce your team, the problem statement interpretation, and your creative vision.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <h5 className="font-bold text-slate-200">Live Gameplay Demonstration (3-4 mins)</h5>
                  <p className="text-slate-400 mt-0.5">Demonstrate core mechanics, obstacle scaling, player controls, and win/lose states live on Scratch.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <h5 className="font-bold text-slate-200">Technical Code Explanation (2-3 mins)</h5>
                  <p className="text-slate-400 mt-0.5">Walk judges through your Scratch scripts: broadcast messages, clone lifecycle, list variables, and math formulas.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <div>
                  <h5 className="font-bold text-slate-200">Judge Q&A & Defending Decisions (2-3 mins)</h5>
                  <p className="text-slate-400 mt-0.5">Answer technical questions regarding optimization, potential bugs, and team role distribution.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Round 2 Rubric & Score Calculation Formula (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              Round 2 Judging Rubric (100 Pts)
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h6 className="font-bold text-slate-200">Presentation Quality</h6>
                  <p className="text-[11px] text-slate-400">Structure, clarity, confidence</p>
                </div>
                <span className="text-xs font-mono font-bold text-purple-400 px-2 py-1 bg-purple-950/60 rounded-lg">
                  30 Pts
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h6 className="font-bold text-slate-200">Project Logic & Code Walkthrough</h6>
                  <p className="text-[11px] text-slate-400">Depth of Scratch script explanation</p>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-1 bg-cyan-950/60 rounded-lg">
                  40 Pts
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h6 className="font-bold text-slate-200">Technical Q&A Defense</h6>
                  <p className="text-[11px] text-slate-400">Handling questions & edge cases</p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 px-2 py-1 bg-amber-950/60 rounded-lg">
                  20 Pts
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h6 className="font-bold text-slate-200">Team Contribution</h6>
                  <p className="text-[11px] text-slate-400">Balanced participation & teamwork</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-1 bg-emerald-950/60 rounded-lg">
                  10 Pts
                </span>
              </div>
            </div>

            {/* Final Calculation Formula Formula */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-purple-950/40 to-cyan-950/40 border border-purple-800/40 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Official Final Score Calculation
              </span>
              <div className="font-mono text-xs sm:text-sm font-black text-cyan-300">
                Final Score = (Round 1 × 0.40) + (Round 2 × 0.60)
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
