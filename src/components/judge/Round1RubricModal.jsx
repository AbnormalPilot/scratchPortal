import React, { useState, useEffect } from 'react';
import api from '../../lib/api.js';
import {
  X,
  Award,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Gamepad2,
  Sparkles,
  Film,
  Plus,
  Minus,
  RotateCcw,
  Zap,
  FileText,
  Keyboard,
  BookOpen,
} from 'lucide-react';

function getScratchProjectId(url) {
  if (!url) return null;
  const match = url.match(/projects\/(\d+)/i);
  return match ? match[1] : null;
}

export default function Round1RubricModal({ team, existingScore, onClose, onScoreSaved }) {
  const [basic, setBasic] = useState(existingScore?.basicWorkingScore ?? 0);
  const [visual, setVisual] = useState(existingScore?.visualSpritesScore ?? 0);
  const [creativity, setCreativity] = useState(existingScore?.creativityScore ?? 0);
  const [comments, setComments] = useState(existingScore?.comments ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useTurboWarp, setUseTurboWarp] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);

  const total = Number((basic + visual + creativity).toFixed(1));
  const r1Sub = team?.submissions?.find((s) => s.roundNumber === 1) || team?.r1Submission;
  const challenge = team?.challenge;
  const scratchProjectId = getScratchProjectId(r1Sub?.scratchUrl);

  const handleScoreChange = (setter, val, max) => {
    const num = Math.min(max, Math.max(0, Number(val) || 0));
    setter(num);
  };

  const adjustScore = (setter, current, delta, max) => {
    const next = Math.min(max, Math.max(0, current + delta));
    setter(next);
  };

  const reloadPlayer = () => {
    setPlayerKey((k) => k + 1);
  };

  const handleSubmit = async (isFinal = true) => {
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/judge/score/r1', {
        teamId: team.id,
        basicWorkingScore: basic,
        visualSpritesScore: visual,
        creativityScore: creativity,
        comments,
        isFinal,
      });

      if (onScoreSaved) onScoreSaved(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit score.');
    } finally {
      setLoading(false);
    }
  };

  const embedSrc = scratchProjectId
    ? useTurboWarp
      ? `https://turbowarp.org/${scratchProjectId}/embed?autoplay=1`
      : `https://scratch.mit.edu/projects/${scratchProjectId}/embed`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div 
        className={`relative w-full ${
          scratchProjectId ? 'max-w-6xl' : 'max-w-3xl'
        } bg-white rounded-3xl border-3 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] my-auto max-h-[95vh] flex flex-col overflow-hidden transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Themed Retro/Pixel Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-3xl z-30 flex items-center justify-center p-6 text-center animate-fadeIn">
            <div className="bg-white rounded-3xl border-3 border-[#bad6fc] shadow-[6px_6px_0px_#bad6fc] p-7 max-w-sm w-full flex flex-col items-center space-y-3.5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#4e97fe] to-[#2563eb] text-white flex items-center justify-center shadow-[3px_3px_0px_#1d4ed8] border-2 border-white animate-bounce">
                <Award className="w-8 h-8 text-white" />
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-bold font-pixel text-slate-800 tracking-wide">
                  SAVING EVALUATION...
                </p>
                <p className="text-xs font-retro text-slate-500">
                  Recording rubric scores & updating standings...
                </p>
              </div>

              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-[#4e97fe] to-emerald-500 animate-pulse w-full" />
              </div>

              <span className="text-[10px] font-pixel text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 font-bold">
                ROUND 1 SPRINT
              </span>
            </div>
          </div>
        )}
        
        {/* Header Bar */}
        <div className="px-5 sm:px-7 py-4 bg-white border-b-2 border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#4e97fe] to-[#2563eb] text-white flex items-center justify-center shrink-0 border-2 border-white shadow-[2px_2px_0px_#2563eb]">
              <Award className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold font-pixel text-slate-900 tracking-tight">
                  {team.name}
                </h2>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs">
                  CODE: {team.accessCode || team.id?.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <p className="text-xs font-retro text-slate-500 truncate">
                Round 1 Evaluation • 3 Criteria Rubric (Max 100 Pts)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Live Total Score Pill */}
            <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-right flex items-baseline gap-1 shadow-[2px_2px_0px_#a7f3d0]">
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600">
                {total}
              </span>
              <span className="text-xs font-bold text-emerald-700/60 font-mono">/ 100</span>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer font-bold shrink-0 shadow-[2px_2px_0px_#cbd5e1] active:translate-y-0.5"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-left space-y-4">
          
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className={`grid grid-cols-1 ${scratchProjectId ? 'lg:grid-cols-12' : ''} gap-5 items-start`}>
            
            {/* Left Pane: Embedded Scratch Player + Multiline Pitch & Controls */}
            {scratchProjectId && (
              <div className="lg:col-span-6 space-y-3.5 flex flex-col">
                
                {/* Interactive Player Card */}
                <div className="p-3.5 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Gamepad2 className="w-4 h-4 text-blue-400" /> Interactive Scratch Demo
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={reloadPlayer}
                        title="Reload Player"
                        className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setUseTurboWarp(!useTurboWarp)}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                          useTurboWarp
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                        title="Toggle high-performance TurboWarp 60fps player"
                      >
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-300" /> {useTurboWarp ? 'Turbo 60FPS' : 'Standard'}
                        </span>
                      </button>

                      {r1Sub?.scratchUrl && (
                        <a
                          href={r1Sub.scratchUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open project in new Scratch tab"
                          className="p-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* The Iframe Player */}
                  <div className="relative w-full aspect-[485/402] bg-slate-950 rounded-xl overflow-hidden border border-slate-700/80 shadow-inner">
                    <iframe
                      key={playerKey}
                      src={embedSrc}
                      allowTransparency="true"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      allowFullScreen
                      allow="autoplay; fullscreen; gamepad"
                      className="w-full h-full"
                      title="Scratch Project Player"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>Click green flag to test gameplay</span>
                    {r1Sub?.scratchUrl && (
                      <a
                        href={r1Sub.scratchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Open on Scratch.mit.edu ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Assigned Theme & Story Context Card */}
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3 text-xs">
                  {/* Theme Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-800 text-sm">
                          {challenge?.title || 'Creative Theme'}
                        </span>
                      </div>
                      {challenge && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded shadow-2xs">
                          ASSIGNED THEME
                        </span>
                      )}
                    </div>

                    {challenge?.shortDescription && (
                      <p className="text-slate-600 leading-relaxed break-words whitespace-normal">
                        {challenge.shortDescription}
                      </p>
                    )}
                  </div>

                  {/* Multiline Game Story & Mechanics Pitch */}
                  {r1Sub?.shortDescription && (
                    <div className="pt-2.5 border-t border-blue-200/70 space-y-1">
                      <span className="font-bold text-slate-700 uppercase text-[10px] flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        Game Story & Mechanics Pitch:
                      </span>
                      <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-blue-200/70 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap break-words break-all shadow-2xs">
                        {r1Sub.shortDescription}
                      </div>
                    </div>
                  )}

                  {/* Multiline Controls & Instructions */}
                  {r1Sub?.notes && (
                    <div className="pt-2.5 border-t border-blue-200/70 space-y-1">
                      <span className="font-bold text-slate-700 uppercase text-[10px] flex items-center gap-1">
                        <Keyboard className="w-3.5 h-3.5 text-blue-600" />
                        Controls & Team Instructions:
                      </span>
                      <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-blue-200/70 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap break-words break-all shadow-2xs">
                        {r1Sub.notes}
                      </div>
                    </div>
                  )}

                  {/* Video Attachment Link */}
                  {r1Sub?.videoUrl && (
                    <div className="pt-2 border-t border-blue-200/70">
                      <a
                        href={r1Sub.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Watch Demo Video Clip ↗</span>
                      </a>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Right Pane (or Main Pane): The 3 Scoring Criteria Sliders */}
            <div className={`${scratchProjectId ? 'lg:col-span-6' : 'w-full'} space-y-3.5`}>
              
              {/* Context bar if NO embedded player is active */}
              {!scratchProjectId && (
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-500 uppercase">Theme:</span>
                      <span className="font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                        {challenge?.title || 'No Theme Locked'}
                      </span>
                    </div>

                    <span className="text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      No Scratch URL
                    </span>
                  </div>

                  {challenge?.shortDescription && (
                    <p className="text-slate-600 leading-relaxed break-words">
                      {challenge.shortDescription}
                    </p>
                  )}

                  {r1Sub?.shortDescription && (
                    <div className="pt-2 border-t border-blue-200/70 space-y-1">
                      <span className="font-bold text-slate-700 uppercase text-[10px] block">
                        Story Pitch:
                      </span>
                      <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-blue-200/70 leading-relaxed whitespace-pre-wrap break-words break-all">
                        {r1Sub.shortDescription}
                      </div>
                    </div>
                  )}

                  {r1Sub?.notes && (
                    <div className="pt-2 border-t border-blue-200/70 space-y-1">
                      <span className="font-bold text-slate-700 uppercase text-[10px] block">
                        Controls & Team Notes:
                      </span>
                      <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-blue-200/70 leading-relaxed whitespace-pre-wrap break-words break-all">
                        {r1Sub.notes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Criterion 1: BASIC GAME WORKING (40%) */}
              <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-300 transition-all space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        1. Basic Game Working
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        40% (Max 40)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Core gameplay, controls, win/lose states, mechanics stability
                    </p>
                  </div>

                  {/* Score Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => adjustScore(setBasic, basic, -1, 40)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50/80 border-2 border-blue-200">
                      <input
                        type="number"
                        min="0"
                        max="40"
                        step="1"
                        value={basic}
                        onChange={(e) => handleScoreChange(setBasic, e.target.value, 40)}
                        className="w-9 bg-transparent text-right font-mono font-bold text-base text-blue-700 outline-none"
                      />
                      <span className="text-xs font-bold text-slate-500 font-mono">/ 40</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustScore(setBasic, basic, 1, 40)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Preset Buttons & Range Slider */}
                <div className="space-y-1.5 pt-0.5">
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={basic}
                    onChange={(e) => setBasic(Number(e.target.value))}
                    className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      {[0, 15, 25, 30, 35, 40].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBasic(preset)}
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer ${
                            basic === preset
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-medium text-slate-400 font-mono">0–40</span>
                  </div>
                </div>
              </div>

              {/* Criterion 2: SPRITES & VISUAL IMPLEMENTATION (25%) */}
              <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-purple-300 transition-all space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        2. Sprites & Visuals
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        25% (Max 25)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Appropriate sprites, animation, sound, readability
                    </p>
                  </div>

                  {/* Score Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => adjustScore(setVisual, visual, -1, 25)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50/80 border-2 border-purple-200">
                      <input
                        type="number"
                        min="0"
                        max="25"
                        step="1"
                        value={visual}
                        onChange={(e) => handleScoreChange(setVisual, e.target.value, 25)}
                        className="w-9 bg-transparent text-right font-mono font-bold text-base text-purple-700 outline-none"
                      />
                      <span className="text-xs font-bold text-slate-500 font-mono">/ 25</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustScore(setVisual, visual, 1, 25)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Preset Buttons & Range Slider */}
                <div className="space-y-1.5 pt-0.5">
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={visual}
                    onChange={(e) => setVisual(Number(e.target.value))}
                    className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      {[0, 10, 15, 20, 22, 25].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setVisual(preset)}
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer ${
                            visual === preset
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-medium text-slate-400 font-mono">0–25</span>
                  </div>
                </div>
              </div>

              {/* Criterion 3: CREATIVITY & GAME DESIGN (35%) */}
              <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-300 transition-all space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        3. Creativity & Design
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        35% (Max 35)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Originality, clever mechanics, challenge balance
                    </p>
                  </div>

                  {/* Score Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => adjustScore(setCreativity, creativity, -1, 35)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50/80 border-2 border-amber-200">
                      <input
                        type="number"
                        min="0"
                        max="35"
                        step="1"
                        value={creativity}
                        onChange={(e) => handleScoreChange(setCreativity, e.target.value, 35)}
                        className="w-10 bg-transparent text-right font-mono font-bold text-base text-amber-800 outline-none"
                      />
                      <span className="text-xs font-bold text-slate-500 font-mono">/ 35</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustScore(setCreativity, creativity, 1, 35)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Preset Buttons & Range Slider */}
                <div className="space-y-1.5 pt-0.5">
                  <input
                    type="range"
                    min="0"
                    max="35"
                    step="1"
                    value={creativity}
                    onChange={(e) => setCreativity(Number(e.target.value))}
                    className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      {[0, 15, 20, 25, 30, 35].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCreativity(preset)}
                          className={`px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono transition-all cursor-pointer ${
                            creativity === preset
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-medium text-slate-400 font-mono">0–35</span>
                  </div>
                </div>
              </div>

              {/* Judge Feedback Comments */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Judge Feedback & Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Share strengths and tips for mechanics, sprites, or balance..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none shadow-2xs bg-white"
                />
              </div>

            </div>

          </div>

        </div>

        {/* Sticky Action Footer */}
        <div className="px-5 sm:px-7 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <span>Score Calculation:</span>
            <strong className="text-slate-900 font-mono font-bold">
              {basic} + {visual} + {creativity} = {total} / 100 PTS
            </strong>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : `Submit Final Grade (${total})`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
