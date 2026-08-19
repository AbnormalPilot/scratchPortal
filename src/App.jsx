import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Navbar from './components/layout/Navbar.jsx';
import ParticipantOverview from './components/participant/ParticipantOverview.jsx';
import ChallengeClaimGrid from './components/participant/ChallengeClaimGrid.jsx';
import JudgeDashboard from './components/judge/JudgeDashboard.jsx';
import MissionControl from './components/organizer/MissionControl.jsx';
import PublicLeaderboard from './components/public/PublicLeaderboard.jsx';
import ServerTimer from './components/layout/ServerTimer.jsx';
import { Trophy, ArrowLeft } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isPublicLeaderboard, setIsPublicLeaderboard] = useState(false);

  // Set default tab based on role upon login
  React.useEffect(() => {
    if (user) {
      if (user.role === 'ORGANIZER') {
        setActiveTab('admin');
      } else if (user.role === 'JUDGE') {
        setActiveTab('judge');
      } else {
        setActiveTab('overview');
      }
    }
  }, [user?.id, user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef4fc] flex items-center justify-center text-[#64748b]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#4e97fe] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold font-pixel text-[#4e97fe]">LOADING ...</span>
        </div>
      </div>
    );
  }

  // 1. If not logged in and viewing public leaderboard
  if (!user && isPublicLeaderboard) {
    return (
      <div className="min-h-screen bg-[#eef4fc] text-[#2c3e50] flex flex-col justify-between">
        <header className="bg-[#4e97fe] text-white py-3.5 px-6 sm:px-12 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐱</span>
            <span className="font-bold text-sm sm:text-base font-pixel text-white">
              Scratch Storm 2026
            </span>
          </div>
          <button
            onClick={() => setIsPublicLeaderboard(false)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#141720] bg-[#ffbe00] hover:bg-[#ffd036] transition-all flex items-center gap-1.5 shadow-sm font-pixel"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </button>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
          <PublicLeaderboard />
        </main>
      </div>
    );
  }

  // 2. If not logged in, render Dedicated Login Page
  if (!user) {
    return <LoginPage onNavigateLeaderboard={() => setIsPublicLeaderboard(true)} />;
  }

  // 3. Logged-in Competition Dashboard
  return (
    <div className="min-h-screen flex flex-col bg-[#eef4fc] text-[#2c3e50] selection:bg-[#4e97fe] selection:text-white">

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Prominent High-Impact Tournament Timer & Stage Banner */}
        <ServerTimer />

        {activeTab === 'overview' && (
          <ParticipantOverview
            onNavigateLeaderboard={() => setActiveTab('leaderboard')}
            onNavigateChallenges={() => setActiveTab('challenges')}
          />
        )}

        {activeTab === 'challenges' && (
          <ChallengeClaimGrid onChallengeClaimed={() => setActiveTab('overview')} />
        )}

        {activeTab === 'leaderboard' && <PublicLeaderboard />}

        {activeTab === 'judge' && (
          user.role === 'JUDGE' || user.role === 'ORGANIZER' ? (
            <JudgeDashboard />
          ) : (
            <div className="bg-white rounded-xl p-8 border-2 border-[#bad6fc] text-center text-xs text-[#64748b]">
              Only authorized judges have access to the evaluation studio.
            </div>
          )
        )}

        {activeTab === 'admin' && (
          user.role === 'ORGANIZER' ? (
            <MissionControl onNavigateLeaderboard={() => setActiveTab('leaderboard')} />
          ) : (
            <div className="bg-white rounded-xl p-8 border-2 border-[#bad6fc] text-center text-xs text-[#64748b]">
              Only organizers have access to the mission control center.
            </div>
          )
        )}
      </main>
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
