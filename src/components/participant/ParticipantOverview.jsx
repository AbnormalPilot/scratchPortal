import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import ChallengeClaimGrid from './ChallengeClaimGrid.jsx';
import Round1BuildConsole from './Round1BuildConsole.jsx';
import FinalistRoom from './FinalistRoom.jsx';
import {
  Gamepad2,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Key,
  Copy,
  Check,
  Crown,
  ShieldAlert,
  Flame,
} from 'lucide-react';

export default function ParticipantOverview({ onNavigateLeaderboard, onNavigateChallenges }) {
  const { user, team, eventConfig } = useAuth();
  const [copied, setCopied] = useState(false);
  const stage = eventConfig?.currentStage || 'REGISTRATION';

  const hasClaimedChallenge = Boolean(team?.challengeId);
  const isFinalist = Boolean(team?.isFinalist);

  const handleCopyCode = () => {
    if (team?.accessCode) {
      navigator.clipboard.writeText(team.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Unauthenticated fallback
  if (!user) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-xl font-bold text-[#2c3e50] font-pixel">Scratch Hackathon Arena</h2>
        <p className="text-xs text-[#64748b] mt-2 font-retro">Please sign in to access your squad dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Redesigned 8-Bit Squad Hero Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#4e97fe] shadow-[6px_6px_0px_#bad6fc] relative overflow-hidden">
        
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f0f7ff] rounded-full -mr-20 -mt-20 pointer-events-none opacity-50" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left: Squad Identity & Members */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            
            {/* Squad Pixel Crest */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#4e97fe] to-[#307fef] text-white flex flex-col items-center justify-center font-bold text-xl shadow-[3px_3px_0px_#2463bf] shrink-0 border-2 border-white">
              <span className="text-2xl sm:text-3xl">🐱</span>
              <span className="text-[9px] font-pixel font-black tracking-widest uppercase">
                {team?.name ? team.name.substring(0, 3) : 'TM'}
              </span>
            </div>

            {/* Squad Info */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg sm:text-2xl font-bold text-[#1e293b] font-pixel tracking-tight">
                  {team?.name || user.fullName}
                </h1>

                {/* Copyable Squad Access Code */}
                {team?.accessCode && (
                  <button
                    onClick={handleCopyCode}
                    title="Click to copy squad code"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#f0f7ff] hover:bg-[#e0efff] border-2 border-[#bad6fc] text-xs font-pixel text-[#4e97fe] transition-all cursor-pointer shadow-sm"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>CODE: {team.accessCode}</span>
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#64748b] ml-0.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Player Roster Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <span className="text-[10px] font-pixel text-[#64748b] uppercase tracking-wider self-center">
                  ROSTER:
                </span>

                {team?.members && team.members.length > 0 ? (
                  team.members.map((member) => (
                    <div
                      key={member.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm"
                    >
                      {member.isTeamLeader ? (
                        <Crown className="w-3.5 h-3.5 text-[#ffbe00] fill-[#ffbe00] shrink-0" />
                      ) : (
                        <Users className="w-3.5 h-3.5 text-[#4e97fe] shrink-0" />
                      )}
                      <span className="font-pixel text-[10px] text-[#1e293b] font-bold leading-none">
                        {member.fullName}
                      </span>
                      {member.isTeamLeader && (
                        <span className="font-pixel text-[8px] text-[#d97706] bg-[#fffbeb] px-1.5 py-0.5 rounded border border-[#fde68a] font-black leading-none">
                          LEADER
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm">
                    <Crown className="w-3.5 h-3.5 text-[#ffbe00] fill-[#ffbe00] shrink-0" />
                    <span className="font-pixel text-[10px] text-[#1e293b] font-bold leading-none">
                      {user.fullName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quest Status Module */}
          <div className="shrink-0">
            {team?.challenge ? (
              <div className="bg-[#f0f7ff] p-4 rounded-xl border-2 border-[#bad6fc] shadow-sm flex items-center gap-3.5 min-w-[240px]">
                <div className="w-10 h-10 rounded-lg bg-[#4e97fe] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-pixel uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      QUEST LOCKED
                    </span>
                    <span className="text-[10px] font-retro text-[#64748b]">
                      {team.challenge.category}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#1e293b] font-pixel mt-1 line-clamp-1">
                    {team.challenge.title}
                  </h4>
                </div>
              </div>
            ) : (
              <div 
                onClick={onNavigateChallenges}
                className="bg-[#fff9e6] hover:bg-[#fff5d0] p-4 rounded-xl border-2 border-[#ffbe00] shadow-sm flex items-center gap-3.5 min-w-[240px] cursor-pointer transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-[#ffbe00] text-[#141720] flex items-center justify-center shrink-0 shadow-sm">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-pixel uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                    NO QUEST CLAIMED
                  </span>
                  <p className="text-xs font-retro text-[#4e97fe] mt-0.5 font-bold hover:underline flex items-center gap-1">
                    Choose on Challenges page →
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Content Router */}
      {isFinalist ? (
        <FinalistRoom onNavigateLeaderboard={onNavigateLeaderboard} />
      ) : !hasClaimedChallenge ? (
        <div className="bg-white rounded-2xl p-8 sm:p-10 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] text-center max-w-xl mx-auto space-y-4 my-4">
          <div className="w-16 h-16 rounded-2xl bg-[#f0f7ff] border-2 border-[#bad6fc] text-[#4e97fe] flex items-center justify-center mx-auto shadow-sm">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] font-pixel px-2.5 py-1 rounded-md bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] font-bold uppercase">
              NEXT STEP : SELECT CHALLENGE
            </span>
            <h3 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b] mt-3">
              CHOOSE YOUR SCRATCH QUEST
            </h3>
            <p className="text-xs font-retro text-[#64748b] mt-1.5 max-w-md mx-auto leading-relaxed">
              Explore the 12 Scratch problem statements on the Challenges page and claim your squad's seat on a first-come, first-served basis.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onNavigateChallenges}
              className="px-6 py-3 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#2463bf] cursor-pointer inline-flex items-center gap-2"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>VIEW & CLAIM CHALLENGES →</span>
            </button>
          </div>
        </div>
      ) : (
        <Round1BuildConsole />
      )}
    </div>
  );
}
