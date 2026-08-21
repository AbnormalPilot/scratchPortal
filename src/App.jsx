import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Navbar from './components/layout/Navbar.jsx';
import ParticipantOverview from './components/participant/ParticipantOverview.jsx';
import ChallengeClaimGrid from './components/participant/ChallengeClaimGrid.jsx';
import JudgeDashboard from './components/judge/JudgeDashboard.jsx';
import MissionControl from './components/organizer/MissionControl.jsx';
import TeamDetailsView from './components/organizer/TeamDetailsView.jsx';
import PublicLeaderboard from './components/public/PublicLeaderboard.jsx';
import ServerTimer from './components/layout/ServerTimer.jsx';
import { ShieldAlert, Gamepad2, ArrowLeft, LogIn, Trophy } from 'lucide-react';

// Protected Route Wrapper with Role-Based Access Control
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef4fc] flex items-center justify-center text-[#64748b]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#4e97fe] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold font-pixel text-[#4e97fe]">AUTHENTICATING SQUAD...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="bg-white rounded-3xl p-10 border-4 border-[#bad6fc] shadow-[8px_8px_0px_#bad6fc] text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7 text-rose-500" />
        </div>
        <h2 className="text-base font-bold font-pixel text-[#1e293b]">RESTRICTED ACCESS ZONE</h2>
        <p className="text-xs font-retro text-[#64748b]">
          Your account role (<span className="font-bold text-[#4e97fe] font-pixel text-[10px]">{user.role}</span>) does not have authorization to view this command view.
        </p>
        <div className="pt-2">
          <a
            href={user.role === 'ORGANIZER' ? '/admin' : user.role === 'JUDGE' ? '/judge' : '/dashboard'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4e97fe] text-white text-xs font-pixel font-bold shadow-sm hover:bg-[#3c86ee] transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Return to My Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}

// App Layout with sticky Navbar and Server Timer
function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#eef4fc] text-[#2c3e50] selection:bg-[#4e97fe] selection:text-white">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ServerTimer />
        <Outlet />
      </main>
    </div>
  );
}

// Home Route Redirector based on user role
function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef4fc] flex items-center justify-center text-[#64748b]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#4e97fe] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold font-pixel text-[#4e97fe]">INITIALIZING PORTAL...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ORGANIZER') {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === 'JUDGE') {
    return <Navigate to="/judge" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

// 404 Game Over View
function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#eef4fc] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 sm:p-12 border-4 border-[#bad6fc] shadow-[8px_8px_0px_#bad6fc] text-center max-w-md w-full space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border-3 border-[#ffbe00] flex items-center justify-center mx-auto shadow-sm">
          <Gamepad2 className="w-8 h-8 text-[#f6ab3c]" />
        </div>
        <h1 className="text-xl font-bold font-pixel text-[#1e293b]">404 • STAGE NOT FOUND</h1>
        <p className="text-xs font-retro text-[#64748b]">
          The game coordinates you entered do not exist on the Scratch Storm network.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel font-bold shadow-[2px_2px_0px_#2463bf] cursor-pointer transition-all inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> RETURN TO ARENA
        </button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* 1. Public Authentication Route */}
      <Route path="/login" element={<LoginPage onNavigateLeaderboard={() => navigate('/leaderboard')} />} />

      {/* 2. Main Platform Layout Routes */}
      <Route element={<AppLayout />}>
        {/* Dynamic Home Route */}
        <Route path="/" element={<HomeRedirect />} />

        {/* Participant Workspace */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['PARTICIPANT', 'ORGANIZER']}>
              <ParticipantOverview
                onNavigateLeaderboard={() => navigate('/leaderboard')}
                onNavigateChallenges={() => navigate('/challenges')}
              />
            </ProtectedRoute>
          }
        />

        {/* Problem Statements & Challenges Catalog */}
        <Route
          path="/challenges"
          element={
            <ProtectedRoute allowedRoles={['PARTICIPANT', 'ORGANIZER', 'JUDGE']}>
              <ChallengeClaimGrid onChallengeClaimed={() => navigate('/dashboard')} />
            </ProtectedRoute>
          }
        />

        {/* Public & Participant Tournament Leaderboard */}
        <Route path="/leaderboard" element={<PublicLeaderboard />} />

        {/* Judge Studio & Rubric Evaluation */}
        <Route
          path="/judge"
          element={
            <ProtectedRoute allowedRoles={['JUDGE', 'ORGANIZER']}>
              <JudgeDashboard />
            </ProtectedRoute>
          }
        />

        {/* Organizer Mission Control */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ORGANIZER']}>
              <MissionControl
                onNavigateLeaderboard={() => navigate('/leaderboard')}
                onNavigateTeams={() => navigate('/admin/teams')}
              />
            </ProtectedRoute>
          }
        />

        {/* Organizer Mission Control Alias */}
        <Route
          path="/mission-control"
          element={
            <ProtectedRoute allowedRoles={['ORGANIZER']}>
              <MissionControl
                onNavigateLeaderboard={() => navigate('/leaderboard')}
                onNavigateTeams={() => navigate('/admin/teams')}
              />
            </ProtectedRoute>
          }
        />

        {/* Organizer Squads & Submissions Directory */}
        <Route
          path="/admin/teams"
          element={
            <ProtectedRoute allowedRoles={['ORGANIZER']}>
              <TeamDetailsView
                onNavigateLeaderboard={() => navigate('/leaderboard')}
                onNavigateMissionControl={() => navigate('/admin')}
              />
            </ProtectedRoute>
          }
        />

        {/* Squads Directory Alias */}
        <Route
          path="/teams"
          element={
            <ProtectedRoute allowedRoles={['ORGANIZER']}>
              <TeamDetailsView
                onNavigateLeaderboard={() => navigate('/leaderboard')}
                onNavigateMissionControl={() => navigate('/admin')}
              />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 3. 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
