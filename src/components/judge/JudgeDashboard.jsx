import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { socketClient } from '../../lib/socket.js';
import Round1RubricModal from './Round1RubricModal.jsx';
import Round2RubricModal from './Round2RubricModal.jsx';
import {
  Award,
  Gamepad2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Sparkles,
  Presentation,
  ShieldAlert,
} from 'lucide-react';

export default function JudgeDashboard() {
  const { user, eventConfig } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [modalRound, setModalRound] = useState(1); // 1 or 2
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

    const handleUpdate = () => {
      fetchTeams();
    };

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

  // Filter teams list
  const filteredTeams = teams.filter((t) => {
    if (isRound2 && !t.isFinalist) return false;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.challenge?.title?.toLowerCase().includes(search.toLowerCase());
    const matchesChallenge = selectedChallengeFilter === 'ALL' || t.challenge?.title === selectedChallengeFilter;
    return matchesSearch && matchesChallenge;
  });

  const uniqueChallenges = Array.from(new Set(teams.map((t) => t.challenge?.title).filter(Boolean)));

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-slate-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                  {isRound2 ? 'Round 2 Finalist Judging' : 'Round 1 Code & Gameplay Evaluation'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
                Judge Evaluation Studio
              </h2>
              <p className="text-xs text-slate-400">
                Evaluating as: <strong className="text-slate-200">{user?.fullName}</strong>
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 flex items-center gap-6">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Assigned Queue</span>
              <span className="text-base font-black text-purple-400 font-mono">
                {filteredTeams.length} Teams
              </span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Evaluated by You</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                {filteredTeams.filter((t) => (isRound2 ? t.myR2Score : t.myR1Score)).length} / {filteredTeams.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team or challenge..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500 hidden sm:block" />
          <select
            value={selectedChallengeFilter}
            onChange={(e) => setSelectedChallengeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-all w-full sm:w-auto"
          >
            <option value="ALL">All Problem Statements</option>
            {uniqueChallenges.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Teams Evaluation Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-48 rounded-2xl bg-slate-900/40 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center text-slate-400 text-xs">
          No teams found matching the active round filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((team) => {
            const hasMyScore = isRound2 ? Boolean(team.myR2Score) : Boolean(team.myR1Score);
            const myScoreValue = isRound2 ? team.myR2Score?.totalScore : team.myR1Score?.totalScore;
            const r1Sub = team.r1Submission;

            return (
              <div
                key={team.id}
                className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-purple-500/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {team.challenge?.title || 'Unassigned'}
                    </span>
                    {team.isFinalist && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Finalist #{team.r2PresentationSlot || 1}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-100">{team.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Members: {team.members?.map((m) => m.fullName).join(', ')}
                  </p>

                  {/* Submission Status Pill */}
                  <div className="mt-3 flex items-center justify-between text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400">Submission:</span>
                    {r1Sub?.scratchUrl ? (
                      <a
                        href={r1Sub.scratchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Scratch Link
                      </a>
                    ) : (
                      <span className="text-amber-400 text-[11px]">Pending Submission</span>
                    )}
                  </div>
                </div>

                {/* Score & Action Row */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-slate-500 block">Your Score</span>
                    {hasMyScore ? (
                      <span className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {myScoreValue} / 100
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 font-medium">Ungraded</span>
                    )}
                  </div>

                  <button
                    onClick={() => openEvaluation(team, isRound2 ? 2 : 1)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-purple-400 to-indigo-400 hover:from-purple-300 hover:to-indigo-300 shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" /> {hasMyScore ? 'Edit Score' : 'Evaluate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Round 1 Scoring Modal */}
      {selectedTeam && modalRound === 1 && (
        <Round1RubricModal
          team={selectedTeam}
          existingScore={selectedTeam.myR1Score}
          onClose={() => setSelectedTeam(null)}
          onScoreSaved={() => {
            fetchTeams();
          }}
        />
      )}

      {/* Round 2 Scoring Modal */}
      {selectedTeam && modalRound === 2 && (
        <Round2RubricModal
          team={selectedTeam}
          existingScore={selectedTeam.myR2Score}
          onClose={() => setSelectedTeam(null)}
          onScoreSaved={() => {
            fetchTeams();
          }}
        />
      )}
    </div>
  );
}
