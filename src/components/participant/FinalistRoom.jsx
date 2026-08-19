import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fireConfetti } from '../../lib/utils.js';
import {
  Trophy,
  Sparkles,
  Presentation,
  Award,
} from 'lucide-react';

export default function FinalistRoom() {
  const { team } = useAuth();
  const isFinalist = team?.isFinalist;

  useEffect(() => {
    if (isFinalist) {
      fireConfetti();
    }
  }, [isFinalist]);

  if (!isFinalist) {
    return (
      <div className="bg-white rounded-xl p-8 border-2 border-[#bad6fc] text-center max-w-lg mx-auto shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-[#eef4fc] border border-[#bad6fc] flex items-center justify-center mx-auto mb-3 text-[#4e97fe]">
          <Award className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#1e293b]">Round 1 Evaluation Complete</h3>
        <p className="text-xs text-[#64748b] mt-1.5 leading-relaxed">
          Thank you for building with Scratch, <strong className="text-[#1e293b]">{team?.name}</strong>! 
          Round 2 presentations are currently underway. Check the leaderboard for final standings!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Hero Celebratory Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border-4 border-[#ffbe00] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-b from-[#fffdf5] to-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#fff9e6] border-2 border-[#ffbe00] flex items-center justify-center text-[#ffbe00] shrink-0">
            <Trophy className="w-8 h-8 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#ffbe00] text-[#141720] flex items-center gap-1 font-pixel">
                <Sparkles className="w-3 h-3" /> ROUND 2 FINALIST
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1e293b]">
              Congratulations, {team?.name}!
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5 max-w-lg">
              Your Scratch project scored highest in <strong className="text-[#4e97fe]">{team?.challenge?.title}</strong>. 
              You advance to the live presentation stage!
            </p>
          </div>
        </div>

        <div className="bg-[#f0f7ff] px-5 py-3 rounded-xl border border-[#bad6fc] text-center shrink-0">
          <span className="text-[10px] uppercase font-mono text-[#64748b] block">Presentation Queue</span>
          <span className="text-xl font-bold text-[#4e97fe]">
            Slot #{team?.r2PresentationSlot || 1}
          </span>
        </div>
      </div>

      {/* Blueprint */}
      <div className="bg-white rounded-xl p-6 border-2 border-[#bad6fc] shadow-sm">
        <h3 className="text-sm font-bold text-[#1e293b] mb-3 flex items-center gap-2">
          <Presentation className="w-4 h-4 text-[#4e97fe]" />
          10-Minute Presentation Blueprint
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#f0f7ff] border border-[#bad6fc]">
            <span className="font-bold text-[#4e97fe] block mb-0.5">1. Concept & Problem (2 mins)</span>
            <p className="text-[#64748b]">Introduce your squad and creative gameplay vision.</p>
          </div>
          <div className="p-3 rounded-lg bg-[#f0f7ff] border border-[#bad6fc]">
            <span className="font-bold text-[#4e97fe] block mb-0.5">2. Live Gameplay (4 mins)</span>
            <p className="text-[#64748b]">Play through the game live on Scratch, showing physics and win states.</p>
          </div>
          <div className="p-3 rounded-lg bg-[#f0f7ff] border border-[#bad6fc]">
            <span className="font-bold text-[#4e97fe] block mb-0.5">3. Script Walkthrough (2 mins)</span>
            <p className="text-[#64748b]">Explain your Scratch block logic, variables, and clones.</p>
          </div>
          <div className="p-3 rounded-lg bg-[#f0f7ff] border border-[#bad6fc]">
            <span className="font-bold text-[#4e97fe] block mb-0.5">4. Judge Q&A (2 mins)</span>
            <p className="text-[#64748b]">Defend technical decisions and team role breakdown.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
