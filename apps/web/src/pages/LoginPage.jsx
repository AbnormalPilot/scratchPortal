import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Trophy, AlertCircle, Flag, Play, Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';

export default function LoginPage({ onNavigateLeaderboard }) {
  const { login, user, eventConfig } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
                SQUAD_CODE :
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
                  placeholder="e.g. PIX2026"
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

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 px-6 text-center text-[18px] font-retro text-[#64748b]">
        <p className="tracking-wider">
          scratchstorm hosted by <span className="font-bold text-[#4e97fe]">NST-SDC</span> x <span className="font-bold text-[#f6ab3c]">REY</span>
        </p>
      </footer>
    </div>
  );
}
