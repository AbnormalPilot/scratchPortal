import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Navbar from './components/layout/Navbar.jsx';
import ParticipantOverview from './components/participant/ParticipantOverview.jsx';
import ChallengeClaimGrid from './components/participant/ChallengeClaimGrid.jsx';
import JudgeDashboard from './components/judge/JudgeDashboard.jsx';
import MissionControl from './components/organizer/MissionControl.jsx';
import PublicLeaderboard from './components/public/PublicLeaderboard.jsx';
import { Gamepad2, Trophy, ArrowLeft } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isPublicLeaderboard, setIsPublicLeaderboard] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Connecting to Scratch Arena...</span>
        </div>
      </div>
    );
  }

  // 1. If not logged in and viewing public leaderboard
  if (!user && isPublicLeaderboard) {
    return (
      <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-between">
        <header className="border-b border-slate-800/80 bg-slate-950/60 py-4 px-6 sm:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-cyan-300" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-200">
              SCRATCH ARENA 2026
            </span>
          </div>
          <button
            onClick={() => setIsPublicLeaderboard(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </button>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PublicLeaderboard />
        </main>

        <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
          Scratch Arena 2026 • Official Standings
        </footer>
      </div>
    );
  }

  // 2. If not logged in, render the Dedicated Login Page
  if (!user) {
    return <LoginPage onNavigateLeaderboard={() => setIsPublicLeaderboard(true)} />;
  }

  // 3. Logged-in Competition Dashboard
  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Dashboard Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'overview' && (
          <ParticipantOverview
            onNavigateLeaderboard={() => setActiveTab('leaderboard')}
          />
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-cyan-400" />
                Problem Statements Catalog
              </h2>
              <p className="text-xs text-slate-400">
                Browse all 12 challenges and check live seat availability in real time.
              </p>
            </div>
            <ChallengeClaimGrid onChallengeClaimed={() => setActiveTab('overview')} />
          </div>
        )}

        {activeTab === 'leaderboard' && <PublicLeaderboard />}

        {activeTab === 'judge' && (
          user.role === 'JUDGE' || user.role === 'ORGANIZER' ? (
            <JudgeDashboard />
          ) : (
            <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center text-xs text-slate-400">
              Only authorized judges have access to the evaluation studio.
            </div>
          )
        )}

        {activeTab === 'admin' && (
          user.role === 'ORGANIZER' ? (
            <MissionControl onNavigateLeaderboard={() => setActiveTab('leaderboard')} />
          ) : (
            <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center text-xs text-slate-400">
              Only organizers have access to the mission control center.
            </div>
          )
        )}
      </main>

      {/* Dashboard Footer */}
      <footer className="glass-panel border-t border-slate-800/80 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Scratch Arena 2026</span>
            <span>•</span>
            <span>Live Competition Control Platform</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>Server Time Synced with PostgreSQL & Socket.IO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
