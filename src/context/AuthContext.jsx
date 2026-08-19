import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { socketClient } from '../lib/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [eventConfig, setEventConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current session
  const refreshSession = async () => {
    try {
      if (!api.getToken()) {
        // Still fetch public event state
        const publicState = await api.get('/public/event-state');
        setEventConfig(publicState);
        setUser(null);
        setTeam(null);
        setLoading(false);
        return;
      }

      const data = await api.get('/auth/me');
      setUser(data.user);
      setTeam(data.user.team || null);
      setEventConfig(data.eventConfig || null);

      if (data.user.teamId) {
        socketClient.joinTeam(data.user.teamId);
      }
    } catch (err) {
      console.warn('Session check failed or expired:', err.message);
      api.clearToken();
      setUser(null);
      setTeam(null);
      // Fetch public event state fallback
      const publicState = await api.get('/public/event-state').catch(() => null);
      if (publicState) setEventConfig(publicState);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    socketClient.connect();
    refreshSession();

    // Listen for global real-time events
    socketClient.on('stage:changed', (payload) => {
      console.log('⚡ Stage changed via Socket.IO:', payload.stage);
      setEventConfig((prev) => ({
        ...prev,
        currentStage: payload.stage,
        ...payload.data,
      }));
      // If participant, refresh team status
      if (api.getToken()) {
        refreshSession();
      }
    });

    socketClient.on('timer:adjusted', (payload) => {
      console.log('⚡ Timer adjusted via Socket.IO:', payload.newEndTime);
      setEventConfig((prev) => ({
        ...prev,
        r1EndTime: payload.newEndTime,
      }));
    });

    socketClient.on('leaderboard:published', () => {
      console.log('⚡ Leaderboard published via Socket.IO');
      setEventConfig((prev) => ({
        ...prev,
        isLeaderboardPublished: true,
      }));
    });

    return () => {
      // cleanup listeners
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    api.setToken(res.token);
    setUser(res.user);
    setTeam(res.team);
    if (res.team?.id) {
      socketClient.joinTeam(res.team.id);
    }
    await refreshSession();
    return res;
  };

  const registerTeam = async (formData) => {
    const res = await api.post('/auth/register-team', formData);
    api.setToken(res.token);
    setUser(res.user);
    setTeam(res.team);
    if (res.team?.id) {
      socketClient.joinTeam(res.team.id);
    }
    await refreshSession();
    return res;
  };

  const joinTeam = async (formData) => {
    const res = await api.post('/auth/join-team', formData);
    api.setToken(res.token);
    setUser(res.user);
    setTeam(res.team);
    if (res.team?.id) {
      socketClient.joinTeam(res.team.id);
    }
    await refreshSession();
    return res;
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    setTeam(null);
    socketClient.disconnect();
    socketClient.connect();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        team,
        eventConfig,
        loading,
        login,
        registerTeam,
        joinTeam,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
