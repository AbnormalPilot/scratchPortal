import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import socketClient from '../../lib/socket.js';
import Round1RubricModal from './Round1RubricModal.jsx';
import Round2RubricModal from './Round2RubricModal.jsx';
import {
  Award,
  Gamepad2,
  ExternalLink,
  CheckCircle2,
  Search,
  Filter,
} from 'lucide-react';

export default function JudgeDashboard() {
  const { user, eventConfig } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [modalRound, setModalRound] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedChallengeFilter, setSelectedChallengeFilter] = useState('ALL');

  const stage = eventConfig?.currentStage || 'ROUND1_JUDGING';
  const isRound2 = stage === 'ROUND2_PREP' || stage === 'ROUND2_LIVE' || stage === 'ROUND2_JUDGING';

  const fetchTeams = async () => {
    try {
      const data = await api.get('/judge/teams');
      setTeams(data.teams || []);
    } catch (err) {
      console.error('Failed to load judge teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();

    const handleUpdate = () => fetchTeams();
    socketClient.on('submission:updated', handleUpdate);
    socketClient.on('score:updated', handleUpdate);
    socketClient.on('stage:changed', handleUpdate);

    return () => {
      socketClient.off('submission:updated', handleUpdate);
      socketClient.off('score:updated', handleUpdate);
      socketClient.off('stage:changed', handleUpdate);
    };
  }, []);

  const openEvaluation = (team, roundNum) => {
    setSelectedTeam(team);
    setModalRound(roundNum);
  };

  const filteredTeams = teams.filter((t) => {
    if (isRound2 && !t.isFinalist) return false;
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.challenge?.title?.toLowerCase().includes(search.toLowerCase());
    const matchesChallenge =
      selectedChallengeFilter === 'ALL' || t.challenge?.title === selectedChallengeFilter;
    return matchesSearch && matchesChallenge;
  });

  const uniqueChallenges = Array.from(new Set(teams.map((t) => t.challenge?.title).filter(Boolean)));

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-xl p-5 border-2 border-[#bad6fc] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#4e97fe] text-white flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1e293b]">Judge Evaluation Studio</h2>
            <p className="text-xs text-[#64748b]">
              Official Judge: <span className="font-bold text-[#1e293b]">{user.fullName}</span>
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team or challenge..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-[#1e293b] focus:border-[#4e97fe] outline-none w-48 sm:w-56"
            />
          </div>

          <select
            value={selectedChallengeFilter}
            onChange={(e) => setSelectedChallengeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-[#1e293b] bg-white focus:border-[#4e97fe] outline-none"
          >
            <option value="ALL">All Challenges</option>
            {uniqueChallenges.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-xl bg-white/70 animate-pulse border border-[#bad6fc]" />
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border-2 border-[#bad6fc] text-center text-xs text-[#64748b]">
          No teams found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((t) => {
            const r1Sub = t.submissions?.find((s) => s.roundNumber === 1);
            const myR1Score = t.round1Scores?.find((s) => s.judgeId === user.id);
            const myR2Score = t.round2Scores?.find((s) => s.judgeId === user.id);

            return (
              <div
                key={t.id}
                className="bg-white rounded-xl p-5 border-2 border-[#bad6fc] shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc]">
                      ID: {t.accessCode}
                    </span>
                    {t.isFinalist && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        FINALIST
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#1e293b]">{t.name}</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">{t.challenge?.title || 'No challenge selected'}</p>

                  {/* Submission Link */}
                  {r1Sub?.scratchUrl ? (
                    <a
                      href={r1Sub.scratchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-[#4e97fe] font-bold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Launch Scratch Project
                    </a>
                  ) : (
                    <div className="mt-3 text-xs text-amber-600 font-semibold">
                      Waiting for team submission...
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    {myR1Score ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> R1: {myR1Score.totalScore}/100
                      </span>
                    ) : (
                      <span className="text-slate-400">Not Graded</span>
                    )}
                  </div>

                  <button
                    onClick={() => openEvaluation(t, isRound2 ? 2 : 1)}
                    className="px-3 py-1.5 rounded-lg bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Grade Rubric
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rubric Modals */}
      {selectedTeam && modalRound === 1 && (
        <Round1RubricModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          onScoreSaved={() => {
            fetchTeams();
            setSelectedTeam(null);
          }}
        />
      )}

      {selectedTeam && modalRound === 2 && (
        <Round2RubricModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          onScoreSaved={() => {
            fetchTeams();
            setSelectedTeam(null);
          }}
        />
      )}
    </div>
  );
}
