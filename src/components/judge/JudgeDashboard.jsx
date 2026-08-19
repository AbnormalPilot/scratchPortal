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
  Layers,
  Sparkles,
  Presentation,
  Clock,
  AlertCircle,
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
      <div className="bg-white rounded-2xl p-6 sm:p-7 border-4 border-[#4e97fe] shadow-[6px_6px_0px_#bad6fc] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4e97fe] to-[#307fef] text-white flex items-center justify-center text-2xl shadow-[3px_3px_0px_#2463bf] shrink-0 border-2 border-white">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold font-pixel text-[#1e293b] tracking-tight">
                JUDGE EVALUATION STUDIO
              </h1>
              <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-[#ffbe00] text-[#141720] font-black">
                {isRound2 ? 'ROUND 2 FINALISTS' : 'ROUND 1 COHORT'}
              </span>
            </div>
            <p className="text-xs font-retro text-[#64748b] mt-0.5">
              Official Judge: <span className="font-bold text-[#1e293b] font-pixel text-[11px]">{user?.fullName || 'Senior Judge'}</span>
            </p>
          </div>
        </div>

        {/* Live Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search squad or quest..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border-2 border-slate-200 text-xs sm:text-sm font-retro text-[#1e293b] focus:border-[#4e97fe] outline-none shadow-inner"
            />
          </div>

          {uniqueChallenges.length > 0 && (
            <select
              value={selectedChallengeFilter}
              onChange={(e) => setSelectedChallengeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-retro text-[#1e293b] focus:border-[#4e97fe] outline-none"
            >
              <option value="ALL">All Problem Statements</option>
              {uniqueChallenges.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-white/70 animate-pulse border-2 border-[#bad6fc]" />
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border-4 border-[#bad6fc] text-center shadow-sm max-w-md mx-auto my-6 space-y-2">
          <Gamepad2 className="w-10 h-10 text-[#64748b] mx-auto" />
          <h3 className="text-sm font-bold font-pixel text-[#1e293b]">NO SQUADS MATCHED</h3>
          <p className="text-xs font-retro text-[#64748b]">Try clearing your search or filter parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((t) => {
            const r1Sub = t.submissions?.find((s) => s.roundNumber === 1);
            const myR1Score = t.round1Scores?.find((sc) => sc.judgeId === user?.id);
            const myR2Score = t.round2Scores?.find((sc) => sc.judgeId === user?.id);

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border-4 border-[#bad6fc] shadow-[4px_4px_0px_#bad6fc] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#bad6fc] transition-all flex flex-col justify-between"
              >
                <div>
                  
                  {/* Top Meta: Challenge Pill + Finalist Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#f0f7ff] text-[#4e97fe] border border-[#bad6fc] uppercase font-bold truncate max-w-[170px]">
                      {t.challenge?.title || 'Unassigned'}
                    </span>
                    {t.isFinalist && (
                      <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-[#ffbe00] text-[#141720] font-black shrink-0">
                        FINALIST
                      </span>
                    )}
                  </div>

                  {/* Team Name */}
                  <h3 className="text-base sm:text-lg font-bold font-pixel text-[#1e293b] leading-tight">
                    {t.name}
                  </h3>

                  <span className="text-xs font-retro text-[#64748b] font-bold block mt-0.5">
                    CODE: {t.accessCode}
                  </span>

                  {/* Submission Status */}
                  <div className="mt-3.5 p-3 rounded-xl bg-[#f8fbff] border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-retro text-[#64748b]">Submission:</span>
                    {r1Sub?.scratchUrl ? (
                      <a
                        href={r1Sub.scratchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-pixel text-[#4e97fe] hover:underline flex items-center gap-1 font-bold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Scratch Link
                      </a>
                    ) : (
                      <span className="text-[11px] font-retro text-amber-700 italic">
                        Pending upload
                      </span>
                    )}
                  </div>
                </div>

                {/* Score Status & Action Button */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-3">
                  
                  {/* My Score Badge */}
                  <div className="flex items-center justify-between text-xs font-retro">
                    <span className="text-[#64748b]">Your Evaluation:</span>
                    {myR1Score ? (
                      <span className="font-pixel text-xs text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {myR1Score.totalScore} / 100 PTS
                      </span>
                    ) : (
                      <span className="font-pixel text-[10px] text-amber-600 font-bold">
                        ⏳ NOT SCORED
                      </span>
                    )}
                  </div>

                  {/* Button */}
                  {isRound2 && t.isFinalist ? (
                    <button
                      onClick={() => openEvaluation(t, 2)}
                      className="w-full py-2.5 rounded-xl bg-[#f6ab3c] hover:bg-[#e69828] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#a4640c] flex items-center justify-center gap-1.5 cursor-pointer font-black"
                    >
                      <Presentation className="w-3.5 h-3.5" />
                      <span>{myR2Score ? 'UPDATE ROUND 2 SCORE' : 'EVALUATE ROUND 2'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openEvaluation(t, 1)}
                      className="w-full py-2.5 rounded-xl bg-[#4e97fe] hover:bg-[#3c86ee] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#2463bf] flex items-center justify-center gap-1.5 cursor-pointer font-black"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{myR1Score ? 'UPDATE ROUND 1 SCORE' : 'EVALUATE ROUND 1'}</span>
                    </button>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selectedTeam && modalRound === 1 && (
        <Round1RubricModal
          team={selectedTeam}
          existingScore={selectedTeam.round1Scores?.find((s) => s.judgeId === user?.id)}
          onClose={() => setSelectedTeam(null)}
          onScoreSaved={fetchTeams}
        />
      )}

      {selectedTeam && modalRound === 2 && (
        <Round2RubricModal
          team={selectedTeam}
          existingScore={selectedTeam.round2Scores?.find((s) => s.judgeId === user?.id)}
          onClose={() => setSelectedTeam(null)}
          onScoreSaved={fetchTeams}
        />
      )}

    </div>
  );
}
