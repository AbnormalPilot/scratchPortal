import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import Round1BuildConsole from './Round1BuildConsole.jsx';
import FinalistRoom from './FinalistRoom.jsx';
import {
  Gamepad2,
  Check,
  Copy,
  Crown,
  Users,
  Key,
  Trophy,
  ShieldAlert,
  Flame,
  Award,
  Shield,
  ExternalLink,
  Sparkles,
  Rocket,
  Zap,
  Lock,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export default function ParticipantOverview({ onNavigateLeaderboard, onNavigateChallenges }) {
  const { user, team, eventConfig } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (team?.accessCode) {
      navigator.clipboard.writeText(team.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasClaimedChallenge = Boolean(team?.challengeId || team?.challenge);
  const stage = eventConfig?.stage || 'REGISTRATION';

  // Check if squad is an official Round 2 finalist
  const isFinalist = Boolean(team?.isFinalist);

  // Check if tournament has moved past Round 1 evaluation
  const isPastRound1 = ['ROUND2_PREP', 'ROUND2_LIVE', 'ROUND2_JUDGING', 'COMPLETED'].includes(stage);

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] text-center max-w-md mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold font-pixel text-[#1e293b]">PARTICIPANT ACCESS REQUIRED</h2>
        <p className="text-xs text-[#64748b] mt-2 font-retro">Please sign in to access your squad dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Redesigned 8-Bit Squad Hero Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-[#4e97fe] shadow-[6px_6px_0px_#bad6fc] relative overflow-hidden transition-all">
        
        {/* Subtle Background Radial Pattern */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#bad6fc]/25 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none blur-xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left: Squad Identity & Members */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            
            {/* Squad Pixel Crest */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#4e97fe] via-[#3b82f6] to-[#2563eb] text-white flex flex-col items-center justify-center font-bold text-xl shadow-[3px_3px_0px_#2463bf] shrink-0 border-2 border-white gap-0.5 relative group">
              <Gamepad2 className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-xs" />
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f0f7ff] hover:bg-[#e0efff] border-2 border-[#bad6fc] text-xs font-pixel text-[#4e97fe] transition-all cursor-pointer shadow-2xs active:translate-y-0.5"
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
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-pixel text-[#64748b] uppercase tracking-wider self-center font-bold">
                  ROSTER:
                </span>

                {team?.members && team.members.length > 0 ? (
                  team.members.map((member) => (
                    <div
                      key={member.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-2xs hover:bg-white transition-colors"
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
                        <span className="font-pixel text-[8px] text-[#d97706] bg-[#fffbeb] px-1.5 py-0.5 rounded border border-[#fde68a] font-black leading-none shadow-3xs">
                          LEADER
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-2xs">
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
              <div 
                onClick={onNavigateChallenges}
                className="bg-[#f0f7ff] hover:bg-[#e4efff] p-4 rounded-2xl border-2 border-[#bad6fc] shadow-[3px_3px_0px_#bad6fc] flex items-center gap-3.5 min-w-[250px] transition-all cursor-pointer group"
                title="Click to view full quest details"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#4e97fe] to-[#307fef] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-pixel uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-black">
                      QUEST LOCKED
                    </span>
                    <span className="text-[10px] font-retro text-[#64748b] truncate">
                      {team.challenge.category}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#1e293b] font-pixel mt-1 truncate group-hover:text-[#4e97fe] transition-colors">
                    {team.challenge.title}
                  </h4>
                </div>
              </div>
            ) : (
              <div 
                onClick={onNavigateChallenges}
                className="bg-gradient-to-br from-[#fffbeb] to-[#fef3c7] hover:from-[#fef3c7] hover:to-[#fde68a] p-4 rounded-2xl border-2 border-[#ffbe00] shadow-[3px_3px_0px_#fde68a] flex items-center gap-3.5 min-w-[250px] cursor-pointer transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#ffbe00] to-[#f59e0b] text-[#141720] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform border border-white/50">
                  <Flame className="w-5 h-5 drop-shadow-xs" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                    <span className="text-[9px] font-pixel uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300 font-black">
                      NO QUEST CLAIMED
                    </span>
                  </div>
                  <p className="text-xs font-retro text-[#4e97fe] mt-1 font-bold hover:underline flex items-center gap-1">
                    Claim challenge on catalog →
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
      ) : isPastRound1 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-10 border-4 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] text-center max-w-2xl mx-auto space-y-5 my-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-pixel px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold uppercase">
              ROUND 1 EVALUATION COMPLETE
            </span>
            <h3 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] pt-1">
              THANK YOU FOR PARTICIPATING, {team?.name || user.fullName}!
            </h3>
            <p className="text-xs sm:text-sm font-retro text-[#64748b] max-w-lg mx-auto leading-relaxed">
              Sorry, your squad did not qualify for the <strong className="text-[#1e293b]">Round 2 Finalist Live Pitches</strong>. You gave an incredible effort and built an awesome Scratch game! You can check the official standings, scores, and advancing finalists on the leaderboard.
            </p>
          </div>

          {/* Team Score & Problem Statement Summary Pill */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {team?.round1Score !== null && team?.round1Score !== undefined && (
              <div className="px-4 py-2 bg-[#f0f7ff] rounded-xl border border-[#bad6fc] text-center">
                <span className="text-[9px] font-pixel text-[#64748b] block uppercase">Your Round 1 Score</span>
                <span className="text-sm font-pixel font-bold text-[#4e97fe]">
                  {team.round1Score} / 100 PTS
                </span>
              </div>
            )}

            {team?.challenge && (
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[9px] font-pixel text-[#64748b] block uppercase">Problem Statement</span>
                <span className="text-xs font-pixel font-bold text-[#1e293b]">
                  {team.challenge.title}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {onNavigateLeaderboard && (
              <button
                type="button"
                onClick={onNavigateLeaderboard}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel font-bold transition-all shadow-[3px_3px_0px_#2463bf] cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                <span>VIEW TOURNAMENT LEADERBOARD →</span>
              </button>
            )}

            {team?.submissions?.[0]?.scratchUrl && (
              <a
                href={team.submissions[0].scratchUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-[#475569] border-2 border-slate-300 text-xs font-pixel font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <span>OPEN YOUR SCRATCH PROJECT ↗</span>
              </a>
            )}
          </div>
        </div>
      ) : !hasClaimedChallenge ? (
        /* High-Impact Esports Quest Dispatch Arena */
        <div className="bg-white rounded-3xl p-6 sm:p-10 border-4 border-[#bad6fc] shadow-[8px_8px_0px_#bad6fc] relative overflow-hidden transition-all">
          
          {/* Ambient Glow Aura */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#bad6fc]/30 via-[#f0f7ff]/50 to-transparent rounded-full -mr-28 -mt-28 pointer-events-none blur-2xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#ffbe00]/10 to-transparent rounded-full -ml-20 -mb-20 pointer-events-none blur-2xl" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            
            {/* Header Crest & Step Badge */}
            <div className="space-y-3">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-[#4e97fe] via-[#3b82f6] to-[#2563eb] text-white flex items-center justify-center mx-auto shadow-[4px_4px_0px_#2463bf] border-2 border-white animate-float-subtle">
                <Gamepad2 className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow-xs" />
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] shadow-3xs">
                <Sparkles className="w-3.5 h-3.5 text-[#4e97fe]" />
                <span className="text-[10px] font-pixel font-black uppercase tracking-wider">
                  MISSION DIRECTIVE • STEP 1 OF 2
                </span>
              </div>

              <h2 className="text-xl sm:text-3xl font-bold font-pixel text-[#1e293b] tracking-tight pt-1">
                CHOOSE YOUR SCRATCH QUEST
              </h2>

              <p className="text-xs sm:text-sm font-retro text-[#64748b] max-w-xl mx-auto leading-relaxed">
                Explore the Scratch problem statements on the Challenges catalog and claim your squad's seat on a first-come, first-served basis.
              </p>
            </div>

            {/* 3 Gamified Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 text-left">
              
              {/* Card 1: Problem Statements */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-[#f8fbff] to-[#f0f7ff] border-2 border-[#bad6fc] space-y-1.5 shadow-2xs hover:border-[#4e97fe] transition-all">
                <div className="w-8 h-8 rounded-xl bg-[#4e97fe] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold font-pixel text-[#1e293b] pt-1">
                  Scratch Quests
                </h4>
                <p className="text-[11px] font-retro text-[#64748b] leading-snug">
                  Arcade, Platformer, Physics & Puzzle tracks with custom game mechanics.
                </p>
              </div>

              {/* Card 2: Real-Time Seat Locking */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-[#f8fbff] to-[#f0f7ff] border-2 border-[#bad6fc] space-y-1.5 shadow-2xs hover:border-[#4e97fe] transition-all">
                <div className="w-8 h-8 rounded-xl bg-[#ffbe00] text-[#141720] flex items-center justify-center font-bold text-xs shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold font-pixel text-[#1e293b] pt-1">
                  Instant Seat Locking
                </h4>
                <p className="text-[11px] font-retro text-[#64748b] leading-snug">
                  Claim challenge to lock it for your squad on a first-come, first-served basis.
                </p>
              </div>

              {/* Card 3: Round 1 Sprint */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-[#f8fbff] to-[#f0f7ff] border-2 border-[#bad6fc] space-y-1.5 shadow-2xs hover:border-[#4e97fe] transition-all">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Rocket className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold font-pixel text-[#1e293b] pt-1">
                  Round 1 Sprint
                </h4>
                <p className="text-[11px] font-retro text-[#64748b] leading-snug">
                  Code in Scratch, save draft progress, and submit with gameplay demo video.
                </p>
              </div>

            </div>

            {/* Giant Arcade CTA Button */}
            <div className="pt-3">
              <button
                onClick={onNavigateChallenges}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#4e97fe] via-[#3b82f6] to-[#2563eb] hover:from-[#3c86ee] hover:to-[#1d4ed8] text-white text-xs sm:text-sm font-pixel font-bold transition-all shadow-[4px_4px_0px_#1d4ed8] hover:shadow-[5px_5px_0px_#1d4ed8] active:translate-y-1 active:shadow-[1px_1px_0px_#1d4ed8] cursor-pointer inline-flex items-center justify-center gap-3 border-2 border-white/40 group"
              >
                <Gamepad2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>VIEW & CLAIM TOURNAMENT CHALLENGES</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

          </div>
        </div>
      ) : (
        <Round1BuildConsole />
      )}
    </div>
  );
}
