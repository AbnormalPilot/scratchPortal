import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatStageLabel } from '../../lib/utils.js';
import {
  Gamepad2,
  Trophy,
  Shield,
  Award,
  Users,
  LogOut,
  LogIn,
  UserPlus,
  Radio,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';

export default function Navbar({ onOpenLogin, onOpenRegister, activeTab, setActiveTab }) {
  const { user, team, eventConfig, logout } = useAuth();
  const stage = eventConfig?.currentStage || 'REGISTRATION';

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                  SCRATCH ARENA
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                  2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">National Scratch Game Hackathon</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </button>

            <button
              onClick={() => setActiveTab('challenges')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'challenges'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              Challenges
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'leaderboard'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Leaderboard
            </button>

            {user?.role === 'JUDGE' && (
              <button
                onClick={() => setActiveTab('judge')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'judge'
                    ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                    : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/40'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Judge Studio
              </button>
            )}

            {user?.role === 'ORGANIZER' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Mission Control
              </button>
            )}
          </nav>

          {/* Right Action Bar / Profile */}
          <div className="flex items-center gap-3">
            {/* Live Stage Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-slate-400 uppercase text-[10px] tracking-wider">Stage:</span>
              <span className="font-semibold text-slate-200">{formatStageLabel(stage)}</span>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200">{user.fullName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                        user.role === 'ORGANIZER'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : user.role === 'JUDGE'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                  {team && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-cyan-400" />
                      {team.name}
                    </span>
                  )}
                </div>

                <button
                  onClick={logout}
                  title="Log out"
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
