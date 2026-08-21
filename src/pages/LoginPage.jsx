import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Trophy,
  AlertCircle,
  Flag,
  Play,
  Eye,
  EyeOff,
  Sparkles,
  Gamepad2,
  HelpCircle,
  X,
  CheckCircle2,
  Lock,
  User,
  ArrowRight,
  Target,
  BookOpen,
  Cpu,
  Boxes,
  Scale,
} from 'lucide-react';

export default function LoginPage({ onNavigateLeaderboard }) {
  const { login, user, eventConfig } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [copiedDemo, setCopiedDemo] = useState('');

  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (user.role === 'ORGANIZER') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'JUDGE') {
        navigate('/judge', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate, location]);

  const stage = eventConfig?.currentStage || 'ROUND_1_ACTIVE';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(identifier, password);
      if (res.user.role === 'ORGANIZER') {
        navigate('/admin');
      } else if (res.user.role === 'JUDGE') {
        navigate('/judge');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'ACCESS DENIED. INVALID SQUAD CREDENTIALS.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (acc) => {
    setIdentifier(acc.id);
    setPassword(acc.pass || 'team123');
    setError('');
    setCopiedDemo(acc.id);
    setTimeout(() => setCopiedDemo(''), 1500);
  };

  const demoSquads = [
    { id: 'PIX2026', label: 'Pixel Warriors', pass: 'team123' },
    { id: 'CODE99', label: 'Code Masters', pass: 'team123' },
    { id: 'NINJA7', label: 'Scratch Ninjas', pass: 'team123' },
    { id: 'BYTE42', label: 'Byte Brawlers', pass: 'team123' },
    { id: 'NEON88', label: 'Neon Glitchers', pass: 'team123' },
    { id: 'MEOW99', label: 'Quantum Cats', pass: 'team123' },
  ];

  return (
    <div className="min-h-screen bg-[#eef4fc] text-[#2c3e50] flex flex-col justify-between selection:bg-[#4e97fe] selection:text-white relative overflow-hidden font-retro">
      {/* Background Pixel Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#bad6fc_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      {/* Ambient Gradient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#4e97fe]/20 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#ffbe00]/15 rounded-full blur-3xl pointer-events-none animate-float-reverse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#9966ff]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Decorative Scratch Code Blocks */}
      <div className="hidden lg:block absolute top-24 left-8 pointer-events-none animate-float-slow z-0 opacity-85">
        <div className="scratch-block scratch-block-events px-3.5 py-2 text-[11px] flex items-center gap-2 shadow-lg">
          <Flag className="w-3.5 h-3.5 fill-[#10b981] text-[#10b981]" />
          <span>when green flag clicked</span>
        </div>
      </div>

      <div className="hidden lg:block absolute top-40 right-10 pointer-events-none animate-float-reverse z-0 opacity-85">
        <div className="scratch-block scratch-block-variables px-3.5 py-2 text-[11px] flex items-center gap-2 shadow-lg">
          <span>change</span>
          <span className="scratch-input-slot font-bold text-[10px]">score</span>
          <span>by (100)</span>
        </div>
      </div>

      <div className="hidden xl:block absolute bottom-32 left-10 pointer-events-none animate-float-reverse z-0 opacity-80">
        <div className="scratch-block scratch-block-looks px-3.5 py-2 text-[11px] flex items-center gap-2 shadow-lg">
          <span>say</span>
          <span className="scratch-input-slot font-bold text-[10px]">Ready to Code!</span>
          <span>for 2 secs</span>
        </div>
      </div>

      <div className="hidden xl:block absolute bottom-24 right-12 pointer-events-none animate-float-slow z-0 opacity-80">
        <div className="scratch-block scratch-block-motion px-3.5 py-2 text-[11px] flex items-center gap-2 shadow-lg">
          <span>point in direction (90°)</span>
        </div>
      </div>

      {/* Top Scratch Header Bar */}
      <header className="relative z-20 bg-[#4e97fe] text-white shadow-[0_4px_0px_#2463bf] border-b-2 border-[#307fef] py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5">
            <span className="text-white text-base sm:text-lg font-bold font-pixel tracking-tight drop-shadow-sm">
              Scratch Storm
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#ffbe00] text-[#141720] font-pixel text-[9px] font-bold shadow-xs">
              2026
            </span>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Guide / Rules Trigger */}
            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="text-xs text-white hover:text-[#1e293b] bg-white/15 hover:bg-white px-3 py-2 font-pixel transition-all flex items-center gap-1.5 rounded-lg border border-white/30 cursor-pointer shadow-xs"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">RULES & GUIDE</span>
            </button>

            {/* Hall of Fame / Leaderboard */}
            <button
              type="button"
              onClick={() => (onNavigateLeaderboard ? onNavigateLeaderboard() : navigate('/leaderboard'))}
              className="text-xs text-[#141720] bg-[#ffbe00] hover:bg-[#ffd036] px-3.5 py-2 font-pixel transition-all flex items-center gap-1.5 rounded-lg shadow-[2px_3px_0px_#b87515] active:translate-y-0.5 cursor-pointer border border-[#e09425]"
            >
              <Trophy className="w-4 h-4 text-[#141720]" />
              <span>HALL OF FAME</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Quest Container */}
      <main className="relative z-10 my-auto py-8 max-w-lg mx-auto w-full px-4">
        {/* Centered Squad Login Box */}
        <div className="pixel-box-scratch-light p-6 sm:p-8 bg-[#ffffff] relative shadow-[8px_8px_0px_#bad6fc] space-y-6">
          
          {/* Header */}
          <div>
            <h1 className="text-xl sm:text-2xl font-pixel text-[#1e293b] tracking-tight">
              ENTER THE ARENA
            </h1>
            <p className="text-xs sm:text-sm text-[#64748b] font-retro mt-1">
              Enter your squad code or team credentials to unlock your cartridge and start building.
            </p>
          </div>

          {/* Error Alert Message with gentle shake animation */}
          {error && (
            <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-700 text-xs font-retro flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Main Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier Field */}
            <div>
              <label className="block text-xs font-pixel text-[#4e97fe] mb-1.5 tracking-wider font-bold">
                PLAYER_ID / SQUAD_CODE :
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-[#94a3b8]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. PIX2026 or team email"
                  className="w-full pixel-input-scratch-light pl-10 pr-4 py-2.5 text-[#1e293b] placeholder-[#94a3b8] focus:outline-none font-mono text-sm tracking-wide transition-all"
                />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <label className="block text-xs font-pixel text-[#4e97fe] mb-1.5 tracking-wider font-bold">
                SECRET_PASSCODE :
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-[#94a3b8]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pixel-input-scratch-light pl-10 pr-11 py-2.5 text-[#1e293b] placeholder-[#94a3b8] focus:outline-none font-mono text-sm tracking-wide transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-[#94a3b8] hover:text-[#4e97fe] p-1 cursor-pointer transition-colors"
                  title={showPassword ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full pixel-btn-scratch-blue py-3.5 text-xs sm:text-sm font-pixel tracking-wider flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer shadow-[4px_4px_0px_#2463bf] hover:shadow-[5px_5px_0px_#2463bf] active:shadow-[1px_1px_0px_#2463bf] transition-all"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>VERIFYING SCRIPT...</span>
                  </div>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>PRESS START / ENTER</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Squads Section */}
          <div className="pt-4 border-t-2 border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-pixel text-[#64748b]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#ffbe00]" />
                <span>DEMO SQUADS (1-CLICK TEST):</span>
              </span>
              {copiedDemo && (
                <span className="text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-3 h-3" /> Selected {copiedDemo}
                </span>
              )}
            </div>

            {/* Demo Account Pills */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-[10px] font-pixel">
              {demoSquads.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#f0f7ff] hover:bg-[#e0efff] text-[#2c3e50] border border-[#bad6fc] transition-all cursor-pointer hover:border-[#4e97fe] hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="font-bold text-[#4e97fe]">{acc.id}</span>
                  <span className="text-[9px] text-[#64748b]">({acc.label})</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Rules & Guide Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#bad6fc] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-[10px_10px_0px_#bad6fc] overflow-hidden animate-float-subtle">
            {/* Modal Header */}
            <div className="bg-[#4e97fe] text-white p-4 sm:p-5 flex items-center justify-between border-b-3 border-[#307fef]">
              <div>
                <h3 className="font-pixel text-sm sm:text-base text-white">
                  SCRATCH STORM 2026 GUIDEBOOK
                </h3>
                <span className="text-xs font-retro text-white/80">Rules, Categories & Judging Rubrics</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-left text-xs sm:text-sm font-retro text-[#334155]">
              {/* Mission Brief */}
              <div className="p-4 bg-[#f0f7ff] border-2 border-[#bad6fc] rounded-xl space-y-1.5">
                <h4 className="font-pixel text-xs text-[#4e97fe] flex items-center gap-1.5 font-bold">
                  <Flag className="w-3.5 h-3.5 text-[#10b981] fill-[#10b981]" />
                  MISSION OVERVIEW
                </h4>
                <p className="leading-relaxed">
                  Teams have 120 minutes to develop an innovative game or interactive story inside Scratch 3.0. Projects are evaluated on Code Architecture, Game Mechanics, Creativity, and Polish.
                </p>
              </div>

              {/* Challenge Tracks */}
              <div>
                <h4 className="font-pixel text-xs text-[#1e293b] mb-2 font-bold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#4e97fe]" />
                  <span>4 COMPETITION TRACKS</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-retro">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-pixel text-[10px] text-[#4e97fe] flex items-center gap-1 mb-1 font-bold">
                      <Gamepad2 className="w-3 h-3" /> ARCADE & RETRO
                    </span>
                    Platformers, shoot-em-ups, maze runners, boss battlers.
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-pixel text-[10px] text-[#9966ff] flex items-center gap-1 mb-1 font-bold">
                      <BookOpen className="w-3 h-3" /> STORY & CINEMATICS
                    </span>
                    Interactive novels, rich animations, branching dialogues.
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-pixel text-[10px] text-[#59c059] flex items-center gap-1 mb-1 font-bold">
                      <Cpu className="w-3 h-3" /> PHYSICS & SIMULATION
                    </span>
                    Gravity engines, vehicle handling, ecosystem simulations.
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-pixel text-[10px] text-[#ffbe00] flex items-center gap-1 mb-1 font-bold">
                      <Boxes className="w-3 h-3" /> AI & PUZZLE ENGINES
                    </span>
                    Pathfinding, chess/grid AI, procedural maze solvers.
                  </div>
                </div>
              </div>

              {/* Judging Rubric Breakdown */}
              <div>
                <h4 className="font-pixel text-xs text-[#1e293b] mb-2 font-bold flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#ffbe00]" />
                  <span>OFFICIAL SCORING WEIGHTS</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="font-pixel text-base text-[#4e97fe] font-bold">30%</div>
                    <div className="font-pixel text-[9px] text-[#1e293b] mt-0.5">Code Cleanliness</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="font-pixel text-base text-[#9966ff] font-bold">30%</div>
                    <div className="font-pixel text-[9px] text-[#1e293b] mt-0.5">Gameplay & Fun</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="font-pixel text-base text-emerald-600 font-bold">20%</div>
                    <div className="font-pixel text-[9px] text-[#1e293b] mt-0.5">Visuals & Audio</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="font-pixel text-base text-[#ffbe00] font-bold">20%</div>
                    <div className="font-pixel text-[9px] text-[#1e293b] mt-0.5">Innovation</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="px-5 py-2 rounded-xl bg-[#4e97fe] hover:bg-[#3b87f0] text-white font-pixel text-xs shadow-[2px_2px_0px_#2463bf] cursor-pointer transition-all"
              >
                GOT IT, LET'S HACK!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 py-4 px-6 text-center text-xs font-retro text-[#64748b]">
        <p className="tracking-wider">
          scratchstorm hosted by <span className="font-bold text-[#4e97fe]">NST-SDC</span> x <span className="font-bold text-[#f6ab3c]">REY</span>
        </p>
      </footer>
    </div>
  );
}
