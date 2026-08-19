import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import ChallengeClaimGrid from './ChallengeClaimGrid.jsx';
import Round1BuildConsole from './Round1BuildConsole.jsx';
import FinalistRoom from './FinalistRoom.jsx';
import {
  Gamepad2,
  Users,
  KeyRound,
  ShieldCheck,
  Award,
  Sparkles,
  Trophy,
  ArrowRight,
  Clock,
} from 'lucide-react';

export default function ParticipantOverview({ onOpenRegister, onOpenLogin, onNavigateLeaderboard }) {
  const { user, team, eventConfig } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);

  const stage = eventConfig?.currentStage || 'REGISTRATION';
  const hasClaimed = Boolean(team?.challengeId);

  const copyAccessCode = () => {
    if (team?.accessCode) {
      navigator.clipboard.writeText(team.accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // If user is not logged in, show Hero Welcome & Register Call to Action
  if (!user) {
    return (
      <div className="space-y-8 py-6">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-slate-800 text-center relative overflow-hidden bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Scratch Game Hackathon 2026
          </span>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-100 tracking-tight max-w-3xl mx-auto leading-tight">
            Build, Compete, and Showcase Your Game on{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
              Scratch
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 mt-4 max-w-xl mx-auto leading-relaxed">
            A 2-round competitive game-dev tournament. 10–15 challenges claimed first-come first-served. 
            4-hour build sprint followed by live finalist presentations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 text-slate-950 font-bold text-xs shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" /> Sign In to Team / Judge / Admin Dashboard
            </button>
          </div>
        </div>

        {/* Public Challenges Preview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-cyan-400" />
              Tournament Problem Statements Vault
            </h3>
            <span className="text-xs text-slate-400">Locked Until Release</span>
          </div>
          <ChallengeClaimGrid />
        </div>
      </div>
    );
  }

  // Logged-in Participant Command Center
  return (
    <div className="space-y-6">
      
      {/* Team Header Status Bar */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 bg-slate-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-cyan-500/20 shrink-0">
              {team?.name ? team.name.substring(0, 2).toUpperCase() : 'TM'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-100">{team?.name}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                  {user.isTeamLeader ? 'Team Leader' : 'Team Member'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Roster ({team?.members?.length || 1}/3):</span>
                <span className="text-slate-300 font-medium">
                  {team?.members?.map((m) => m.fullName).join(', ')}
                </span>
              </p>
            </div>
          </div>

          {/* Access Code Pill */}
          {team?.accessCode && (
            <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 self-start sm:self-auto">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-500 block">Team Access Code</span>
                <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider">
                  {team.accessCode}
                </span>
              </div>
              <button
                onClick={copyAccessCode}
                className="ml-2 text-[10px] font-semibold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              >
                {copiedCode ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic State Router for Participant */}
      {stage === 'REGISTRATION' || stage === 'WAITING_CHALLENGES' ? (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center">
            <Clock className="w-10 h-10 text-cyan-400 mx-auto mb-3 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-100">Waiting for Challenge Release</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              The organizer has not released challenges yet. Review the catalog below and coordinate with your teammates before claiming begins!
            </p>
          </div>
          <ChallengeClaimGrid />
        </div>
      ) : stage === 'CHALLENGE_SELECTION' ? (
        !hasClaimed ? (
          <ChallengeClaimGrid />
        ) : (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-emerald-500/40 bg-emerald-950/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4" /> Challenge Confirmed
                </span>
                <h3 className="text-base font-bold text-slate-100">
                  Locked for Round 1: {team.challenge?.title}
                </h3>
              </div>
            </div>
            <ChallengeClaimGrid />
          </div>
        )
      ) : stage === 'ROUND1_BUILDING' ? (
        hasClaimed ? (
          <Round1BuildConsole />
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs">
              ⚠️ Round 1 has started! Please claim an available challenge immediately below to begin building.
            </div>
            <ChallengeClaimGrid />
          </div>
        )
      ) : stage === 'ROUND1_JUDGING' ? (
        <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center max-w-2xl mx-auto my-6">
          <Award className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-bounce" />
          <h3 className="text-xl font-bold text-slate-100">Round 1 Evaluation in Progress</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Judges are currently reviewing your Scratch game across Basic Working (40), Sprites & Visuals (25), and Creativity (35). 
            Finalists advancing to Round 2 will be announced shortly!
          </p>
        </div>
      ) : stage === 'ROUND2_PREP' || stage === 'ROUND2_LIVE' || stage === 'ROUND2_JUDGING' ? (
        <FinalistRoom />
      ) : (
        /* COMPLETED / LEADERBOARD */
        <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center max-w-2xl mx-auto my-6">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-100">Scratch Hackathon 2026 Concluded!</h3>
          <p className="text-xs text-slate-400 mt-2 mb-6 leading-relaxed">
            All judging rounds are finished. Check the final leaderboard to see the champions and full score breakdowns!
          </p>
          <button
            onClick={onNavigateLeaderboard}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 inline-flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" /> View Final Leaderboard
          </button>
        </div>
      )}
    </div>
  );
}
