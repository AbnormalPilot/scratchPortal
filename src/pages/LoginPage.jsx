import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Trophy, AlertCircle, Flag, Play } from 'lucide-react';

export default function LoginPage({ onNavigateLeaderboard }) {
  const { login, eventConfig } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const stage = eventConfig?.currentStage || 'REGISTRATION';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(identifier, password);
    } catch (err) {
      setError(err.message || 'ACCESS DENIED. INVALID SQUAD CREDENTIALS.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef4fc] text-[#2c3e50] flex flex-col justify-between font-retro selection:bg-[#4e97fe] selection:text-[#ffffff] relative overflow-hidden">
      
      {/* Background Pixel Grid in Soft Scratch Blue */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(#bad6fc_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-60 pointer-events-none" 
      />

      {/* Top Scratch Blue Header Bar */}
      <header className="relative z-10 bg-[#4e97fe] text-[#ffffff] shadow-md py-3.5 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl drop-shadow">🐱</span>
          <span className="text-[#ffffff] text-sm sm:text-base font-bold font-pixel tracking-tight drop-shadow-sm">
            SCRATCH ARENA 2026
          </span>
        </div>

        <button
          onClick={onNavigateLeaderboard}
          className="text-xs sm:text-sm text-[#141720] bg-[#ffbe00] hover:bg-[#ffd036] px-3 py-1.5 font-pixel transition-all flex items-center gap-1.5 rounded-md shadow-[2px_2px_0px_#b87515]"
        >
          <Trophy className="w-3.5 h-3.5 text-[#141720]" />
          <span>HALL OF FAME</span>
        </button>
      </header>

      {/* Main Quest Login Box */}
      <main className="relative z-10 my-auto py-8 max-w-lg mx-auto w-full px-4">
        
        {/* Pure White Scratch Dialogue Block Container */}
        <div className="pixel-box-scratch-light p-6 sm:p-8 text-center space-y-5 bg-[#ffffff]">
          
          {/* Scratch Events Orange 'when green flag clicked' block */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f6ab3c] text-[#ffffff] border-2 border-[#d98516] font-pixel text-[10px] sm:text-xs rounded-lg shadow-[2px_3px_0px_#a4640c]">
            <Flag className="w-3.5 h-3.5 fill-[#10b981] text-[#10b981]" />
            <span>WHEN GREEN FLAG CLICKED</span>
          </div>

          {/* Title & Game Story Text */}
          <div>
            <h1 className="text-xl sm:text-2xl font-pixel text-[#2c3e50] tracking-tight">
              ENTER THE ARENA
            </h1>
            
            {/* Story Briefing */}
            <div className="mt-3.5 p-3.5 bg-[#f0f7ff] border-2 border-[#bad6fc] rounded-lg text-left text-xs sm:text-sm text-[#334155] leading-relaxed font-retro">
              <span className="text-[#4e97fe] font-bold block mb-1">
                ▶ MISSION BRIEFING [STAGE: {stage}]:
              </span>
              12 Scratch problem statements are sealed in the vault. Enter your squad credentials to unlock your cartridge and start building.
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-lg text-rose-700 text-xs sm:text-sm font-retro flex items-center justify-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Minimalist Scratch Light Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs sm:text-sm font-pixel text-[#4e97fe] mb-1.5 tracking-wider font-bold">
                PLAYER_ID / SQUAD_CODE :
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. PIX2026 or email"
                className="w-full pixel-input-scratch-light px-4 py-2.5 text-[#1e293b] placeholder-[#94a3b8] focus:outline-none uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-pixel text-[#4e97fe] mb-1.5 tracking-wider font-bold">
                SECRET_PASSCODE :
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pixel-input-scratch-light px-4 py-2.5 text-[#1e293b] placeholder-[#94a3b8] focus:outline-none font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full pixel-btn-scratch-blue py-3.5 text-xs sm:text-sm font-pixel tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[3px_4px_0px_#2463bf]"
              >
                {loading ? (
                  <span>LOADING SCRIPT...</span>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-[#ffffff]" />
                    <span>PRESS START / ENTER</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Minimalist Scratch Footnote */}
          <div className="pt-1 text-[11px] sm:text-xs text-[#64748b] font-retro">
            CREDENTIALS ISSUED BY HACKATHON COMMITTEE • READY PLAYER ONE
          </div>
        </div>

      </main>
    </div>
  );
}
