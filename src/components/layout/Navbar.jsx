import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import ServerTimer from './ServerTimer.jsx';
import {
  Gamepad2,
  Trophy,
  Shield,
  Award,
  Users,
  LogOut,
  LayoutDashboard,
  Key,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, team, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#4e97fe] text-white shadow-[0_4px_0px_#2463bf] border-b-2 border-[#307fef]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16 sm:h-18">
          
          {/* Logo & Brand (Left) */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none group shrink-0" 
            onClick={() => setActiveTab('overview')}
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform">
              🐱
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base font-pixel tracking-tight text-white drop-shadow">
                  Scratch Storm
                </span>
                <span className="text-[9px] font-pixel px-1.5 py-0.5 rounded bg-[#ffbe00] text-[#141720] font-black">
                  2026
                </span>
              </div>
              <span className="text-[11px] font-retro text-white/90 block -mt-0.5">
                HACKATHON COMMAND CENTER
              </span>
            </div>
          </div>

          {/* Navigation Items (Exact Screen Center) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#3c86ee] p-1.5 rounded-xl border border-white/20 shadow-inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            
            {/* 1. Organizer Primary Tab */}
            {user?.role === 'ORGANIZER' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-pixel transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#f6ab3c] text-white shadow-[2px_2px_0px_#a4640c]'
                    : 'text-amber-200 hover:bg-white/10'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>MISSION CONTROL</span>
              </button>
            )}

            {/* 2. Judge Primary Tab */}
            {user?.role === 'JUDGE' && (
              <button
                onClick={() => setActiveTab('judge')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-pixel transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'judge'
                    ? 'bg-[#ffbe00] text-[#141720] shadow-[2px_2px_0px_#a4640c]'
                    : 'text-[#ffbe00] hover:bg-white/10'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>JUDGE STUDIO</span>
              </button>
            )}

            {/* 3. Participant Primary Tab */}
            {(!user || user.role === 'PARTICIPANT') && (
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-pixel transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-white text-[#2c3e50] shadow-[2px_2px_0px_#bad6fc]'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>DASHBOARD</span>
              </button>
            )}

            {/* Shared Catalog & Leaderboard Tabs */}
            <button
              onClick={() => setActiveTab('challenges')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-pixel transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'challenges'
                  ? 'bg-white text-[#2c3e50] shadow-[2px_2px_0px_#bad6fc]'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>CHALLENGES</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-pixel transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-[#2c3e50] shadow-[2px_2px_0px_#bad6fc]'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-[#ffbe00]" />
              <span>LEADERBOARD</span>
            </button>
          </nav>

          {/* Right Section: Logout */}
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={logout}
                title="Sign out"
                className="px-3.5 py-2 rounded-xl bg-[#e63946] hover:bg-[#d90429] text-white text-xs font-pixel transition-all shadow-[2px_2px_0px_#7f1d1d] cursor-pointer flex items-center gap-1.5 font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>LOGOUT</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
