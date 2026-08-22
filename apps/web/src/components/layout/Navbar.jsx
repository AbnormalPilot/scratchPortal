import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Gamepad2,
  Trophy,
  Shield,
  Award,
  Users,
  LogOut,
  LayoutDashboard,
  LogIn,
} from 'lucide-react';

export default function Navbar({ activeTab: propActiveTab, setActiveTab: propSetActiveTab }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  const handleNav = (path, tabKey) => {
    if (propSetActiveTab) {
      propSetActiveTab(tabKey);
    }
    navigate(path);
  };

  const handleLogoClick = () => {
    if (!user) {
      navigate('/login');
    } else if (user.role === 'ORGANIZER') {
      handleNav('/admin', 'admin');
    } else if (user.role === 'JUDGE') {
      handleNav('/judge', 'judge');
    } else {
      handleNav('/dashboard', 'overview');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdminActive = currentPath === '/admin' || currentPath === '/mission-control' || propActiveTab === 'admin';
  const isTeamsActive = currentPath === '/admin/teams' || currentPath === '/teams' || propActiveTab === 'teams';
  const isJudgeActive = currentPath === '/judge' || propActiveTab === 'judge';
  const isDashboardActive = (currentPath === '/dashboard' || currentPath === '/') && (!user || user.role === 'PARTICIPANT') || propActiveTab === 'overview';
  const isChallengesActive = currentPath === '/challenges' || propActiveTab === 'challenges';
  const isLeaderboardActive = currentPath === '/leaderboard' || propActiveTab === 'leaderboard';

  return (
    <header className="sticky top-0 z-40 bg-[#4e97fe] text-white shadow-[0_4px_0px_#2463bf] border-b-2 border-[#307fef] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16 sm:h-18">
          
          {/* Logo & Brand (Left) */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none group shrink-0" 
            onClick={handleLogoClick}
          >
            {/* 3D Pixel Gamepad Crest */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ffbe00] to-[#f59e0b] text-[#141720] flex items-center justify-center font-bold shadow-[2px_2px_0px_#a4640c] border border-white/40 group-hover:scale-105 group-hover:shadow-[3px_3px_0px_#a4640c] transition-all">
              <Gamepad2 className="w-5 h-5 drop-shadow-xs" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base font-pixel tracking-tight text-white drop-shadow-sm group-hover:text-amber-200 transition-colors">
                  Scratch Storm
                </span>
                <span className="text-[9px] font-pixel px-2 py-0.5 rounded-md bg-[#ffbe00] text-[#141720] font-black shadow-3xs border border-[#d98516]">
                  2026
                </span>
              </div>
              <div className="flex items-center gap-1 text-[13px] font-retro text-white/90 -mt-0.5 tracking-wide">
                <span>hosted by</span>
                <span className="font-bold text-white bg-white/15 px-1.5 py-0.2 rounded border border-white/20">NST-SDC</span>
                <span>×</span>
                <span className="font-bold text-white bg-white/25 px-1.5 py-0.2 rounded border border-white/25">REY</span>
              </div>
            </div>
          </div>

          {/* Navigation Items (Exact Screen Center) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#3c86ee] p-1.5 rounded-2xl border border-white/20 shadow-inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            
            {/* 1. Organizer Primary Tabs */}
            {user?.role === 'ORGANIZER' && (
              <>
                <button
                  onClick={() => handleNav('/admin', 'admin')}
                  className={`px-3.5 py-1.5 rounded-xl text-[10px] font-pixel transition-all flex items-center gap-1.5 cursor-pointer ${
                    isAdminActive
                      ? 'bg-[#f6ab3c] text-white shadow-[2px_2px_0px_#a4640c] font-bold border border-white/30'
                      : 'text-amber-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>MISSION CONTROL</span>
                </button>
                <button
                  onClick={() => handleNav('/admin/teams', 'teams')}
                  className={`px-3.5 py-1.5 rounded-xl text-[10px] font-pixel transition-all flex items-center gap-1.5 cursor-pointer ${
                    isTeamsActive
                      ? 'bg-[#ffbe00] text-[#141720] shadow-[2px_2px_0px_#a4640c] font-black border border-white/40'
                      : 'text-amber-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>SQUADS & SUBMISSIONS</span>
                </button>
              </>
            )}

            {/* 2. Judge Primary Tab */}
            {user?.role === 'JUDGE' && (
              <button
                onClick={() => handleNav('/judge', 'judge')}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-pixel transition-all flex items-center gap-1.5 cursor-pointer ${
                  isJudgeActive
                    ? 'bg-[#ffbe00] text-[#141720] shadow-[2px_2px_0px_#a4640c] font-black border border-white/40'
                    : 'text-[#ffbe00] hover:text-white hover:bg-white/10'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>JUDGE STUDIO</span>
              </button>
            )}

            {/* 3. Participant Primary Tab */}
            {(!user || user.role === 'PARTICIPANT') && (
              <button
                onClick={() => handleNav('/dashboard', 'overview')}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-pixel transition-all flex items-center gap-1.5 cursor-pointer ${
                  isDashboardActive
                    ? 'bg-white text-[#1e293b] shadow-[2px_2px_0px_#2463bf] font-bold border border-white'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>DASHBOARD</span>
              </button>
            )}

            {/* Shared Catalog Tab */}
            <button
              onClick={() => handleNav('/challenges', 'challenges')}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-pixel transition-all flex items-center gap-1.5 cursor-pointer ${
                isChallengesActive
                  ? 'bg-white text-[#1e293b] shadow-[2px_2px_0px_#2463bf] font-bold border border-white'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>THEMES</span>
            </button>

            {/* Shared Leaderboard Tab */}
            <button
              onClick={() => handleNav('/leaderboard', 'leaderboard')}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-pixel transition-all flex items-center gap-1.5 cursor-pointer ${
                isLeaderboardActive
                  ? 'bg-white text-[#1e293b] shadow-[2px_2px_0px_#2463bf] font-bold border border-white'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-[#ffbe00]" />
              <span>LEADERBOARD</span>
            </button>
          </nav>

          {/* Right Section: Sign In / Logout */}
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={handleLogout}
                title="Sign out"
                className="px-3.5 py-2 rounded-xl bg-[#e63946] hover:bg-[#d90429] text-white text-xs font-pixel transition-all shadow-[2px_2px_0px_#7f1d1d] cursor-pointer flex items-center gap-1.5 font-bold active:translate-y-0.5 border border-white/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>LOGOUT</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 py-2 rounded-xl bg-[#ffbe00] hover:bg-[#ebae00] text-[#141720] text-xs font-pixel transition-all shadow-[2px_2px_0px_#a4640c] cursor-pointer flex items-center gap-1.5 font-black active:translate-y-0.5 border border-white/40"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>SIGN IN</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
