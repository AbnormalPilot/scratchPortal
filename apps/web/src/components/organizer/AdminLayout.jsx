import { useState } from 'react';
import { useNavigate, useLocation, Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import ServerTimer from '../layout/ServerTimer.jsx';
import { formatStageLabel } from '../../lib/utils.js';
import {
  Gamepad2,
  LayoutDashboard,
  Clock,
  Trophy,
  Zap,
  Users,
  Wrench,
  ExternalLink,
  Award,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Radio,
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout, eventConfig } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const stage = eventConfig?.currentStage || 'REGISTRATION';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/admin',
      end: true,
      label: 'Overview',
      icon: LayoutDashboard,
      desc: 'Telemetry & status',
    },
    {
      to: '/admin/round1',
      label: 'Round 1 Sprint',
      icon: Clock,
      desc: 'Timer & standings',
      badge: stage === 'ROUND1_BUILDING' ? 'LIVE' : null,
      badgeColor: 'bg-emerald-500 text-white animate-pulse',
    },
    {
      to: '/admin/round2',
      label: 'Round 2 Finale',
      icon: Trophy,
      desc: 'Presentations & final',
      badge: stage === 'ROUND2_LIVE' ? 'LIVE' : null,
      badgeColor: 'bg-amber-500 text-white animate-pulse',
    },
    {
      to: '/admin/twists',
      label: 'Surprise Twists',
      icon: Zap,
      desc: 'Mid-sprint modifiers',
    },
    {
      to: '/admin/teams',
      label: 'Squads & Submissions',
      icon: Users,
      desc: 'Grading & drilldown',
    },
    {
      to: '/admin/themes',
      label: 'Themes Matrix',
      icon: Gamepad2,
      desc: 'Quotas & quests',
    },
    {
      to: '/admin/system',
      label: 'System & Emergency',
      icon: Wrench,
      desc: 'Timers & data reset',
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#eef4fc] text-[#2c3e50] relative selection:bg-[#4e97fe] selection:text-white">
      
      {/* Ambient Background Matrix */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(#bad6fc_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#4e97fe]/15 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#ffbe00]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-[#3b82f6]/10 rounded-full blur-3xl" />
      </div>

      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#4e97fe] text-white border-b-2 border-[#307fef] shadow-md z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#ffbe00] text-[#141720] flex items-center justify-center font-bold">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-pixel text-xs font-bold text-white block">Scratch Storm</span>
              <span className="text-[10px] font-retro text-amber-200 block -mt-1 font-bold">Admin Command</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-white/20 text-white font-bold">
            {formatStageLabel(stage)}
          </span>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 animate-fadeIn"
        />
      )}

      {/* Left Navigation Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r-4 border-[#bad6fc] shadow-[6px_0px_0px_rgba(186,214,252,0.5)] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Branding + Live Stage */}
        <div className="p-5 border-b-2 border-slate-100 space-y-4">
          <div
            onClick={() => {
              navigate('/admin');
              setMobileDrawerOpen(false);
            }}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#ffbe00] to-[#f59e0b] text-[#141720] flex items-center justify-center font-bold shadow-[2px_2px_0px_#a4640c] border-2 border-white group-hover:scale-105 transition-all shrink-0">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm font-pixel tracking-tight text-[#1e293b] group-hover:text-[#4e97fe] transition-colors">
                  Scratch Storm
                </span>
                <span className="text-[8px] font-pixel px-1.5 py-0.2 rounded bg-[#ffbe00] text-[#141720] font-black">
                  2026
                </span>
              </div>
              <span className="text-[10px] font-pixel text-[#4e97fe] uppercase font-bold tracking-wider block">
                ORGANIZER PORTAL
              </span>
            </div>
          </div>

          {/* Live Stage Widget */}
          <div className="p-3 rounded-2xl bg-[#f0f7ff] border-2 border-[#bad6fc] space-y-1">
            <div className="flex items-center justify-between text-[9px] font-pixel text-[#64748b] font-bold">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-[#4e97fe] animate-pulse" /> TOURNAMENT STAGE
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-xs font-pixel font-black text-[#1e293b] truncate">
              {formatStageLabel(stage)}
            </p>
          </div>
        </div>

        {/* Middle: Main Navigation Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
          <span className="text-[9px] font-pixel text-slate-400 uppercase tracking-wider px-3 pb-1 block font-bold">
            ADMIN MODULES
          </span>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-pixel transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-[#4e97fe] text-white font-bold shadow-[2px_2px_0px_#2463bf] border border-[#307fef]'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#4e97fe]'
                        }`}
                      />
                      <div className="text-left min-w-0">
                        <span className="block truncate font-bold text-[11px] leading-tight">
                          {item.label}
                        </span>
                        <span
                          className={`block text-[9px] font-retro truncate ${
                            isActive ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {item.desc}
                        </span>
                      </div>
                    </div>

                    {item.badge && (
                      <span className={`text-[8px] font-pixel px-1.5 py-0.5 rounded font-black shrink-0 ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          <div className="pt-3 pb-1">
            <div className="border-t border-slate-100 my-1" />
            <span className="text-[9px] font-pixel text-slate-400 uppercase tracking-wider px-3 py-1 block font-bold">
              EXTERNAL ACCESS
            </span>
          </div>

          <a
            href="/leaderboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3.5 py-2 rounded-2xl text-[11px] font-pixel text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Public Leaderboard</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
          </a>

          <a
            href="/judge"
            className="flex items-center justify-between px-3.5 py-2 rounded-2xl text-[11px] font-pixel text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-purple-500" />
              <span>Judge Studio</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
          </a>
        </div>

        {/* Bottom: User Profile & Logout */}
        <div className="p-4 border-t-2 border-slate-100 bg-slate-50/70 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#4e97fe] text-white flex items-center justify-center font-bold font-pixel text-xs shrink-0 shadow-xs">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold font-pixel text-[#1e293b] block truncate leading-tight">
                  {user?.fullName || 'Organizer'}
                </span>
                <span className="text-[9px] font-pixel px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300 inline-block">
                  ORGANIZER
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 pt-16 lg:pt-0">
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10 space-y-6">
          <ServerTimer />
          <Outlet />
        </main>
      </div>

    </div>
  );
}
