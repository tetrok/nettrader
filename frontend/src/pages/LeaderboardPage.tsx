import React, { useEffect, useState } from 'react';
import { leaderboardApi } from '../api/leaderboard';
import { PlayerRank, TeamRank } from '../types';
import { Trophy, Users, Search, Medal, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LeaderboardPage: React.FC = () => {
  const [tab, setTab] = useState<'players' | 'teams'>('players');

  // Players state
  const [players, setPlayers] = useState<PlayerRank[]>([]);
  const [periods, setPeriods] = useState<Record<string, string>>({});
  const [currentPeriod, setCurrentPeriod] = useState<string>('');
  const [playerSearch, setPlayerSearch] = useState('');

  // Teams state
  const [teams, setTeams] = useState<TeamRank[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const res = await leaderboardApi.getPlayers({
        search: playerSearch,
        period: currentPeriod,
      });
      setPlayers(res.items);
      setPeriods(res.availablePeriods);
      if (!currentPeriod && res.currentPeriod) {
        setCurrentPeriod(res.currentPeriod);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    setLoading(true);
    try {
      const res = await leaderboardApi.getTeams();
      setTeams(res.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'players') {
      loadPlayers();
    } else {
      loadTeams();
    }
  }, [tab, currentPeriod, playerSearch]);

  const renderMedal = (rank: number) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-amber-400 fill-amber-400/20 inline" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-300 fill-slate-300/20 inline" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700 fill-amber-700/20 inline" />;
    return <span className="font-mono text-slate-400 font-bold">#{rank}</span>;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Classements Officiels</h1>
          <p className="text-xs text-slate-400 mt-1">
            Les meilleures performances et équipes de la simulation boursière NetTrader
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setTab('players')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              tab === 'players' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Traders Individuels
          </button>
          <button
            onClick={() => setTab('teams')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              tab === 'teams' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Équipes & Clubs
          </button>
        </div>
      </div>

      {/* Filters (for Players) */}
      {tab === 'players' && (
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Rechercher un pseudo..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={currentPeriod}
              onChange={(e) => setCurrentPeriod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            >
              {Object.entries(periods).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Players Table */}
      {tab === 'players' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 text-center w-20">Rang</th>
                  <th className="px-5 py-3.5">Trader</th>
                  <th className="px-5 py-3.5">Équipe</th>
                  <th className="px-5 py-3.5 text-right">Capital Actuel</th>
                  <th className="px-5 py-3.5 text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                      Calcul du classement en cours...
                    </td>
                  </tr>
                ) : players.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Aucun joueur trouvé pour cette période.
                    </td>
                  </tr>
                ) : (
                  players.map((p) => {
                    const isGain = p.performance >= 0;
                    return (
                      <tr key={p.userId} className="hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3.5 text-center">{renderMedal(p.rank)}</td>
                        <td className="px-5 py-3.5 font-sans font-medium text-white">{p.pseudo}</td>
                        <td className="px-5 py-3.5 font-sans text-xs">
                          {p.teamName && p.teamId ? (
                            <Link to={`/teams/${p.teamId}`} className="text-emerald-400 hover:underline">
                              [{p.teamName}]
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-slate-200">
                          {p.capital.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right font-bold flex items-center justify-end gap-1 ${
                            isGain ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isGain ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          <span>{isGain ? '+' : ''}{p.performance.toFixed(2)}%</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teams Table */}
      {tab === 'teams' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 text-center w-20">Rang</th>
                  <th className="px-5 py-3.5">Équipe</th>
                  <th className="px-5 py-3.5 text-center">Membres</th>
                  <th className="px-5 py-3.5 text-center">Médailles (O/A/B)</th>
                  <th className="px-5 py-3.5 text-right">Progression Moyenne</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                      Chargement des équipes...
                    </td>
                  </tr>
                ) : teams.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Aucune équipe enregistrée pour le moment.
                    </td>
                  </tr>
                ) : (
                  teams.map((t) => {
                    const isGain = t.performance >= 0;
                    return (
                      <tr key={t.teamId} className="hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3.5 text-center">{renderMedal(t.rank)}</td>
                        <td className="px-5 py-3.5 font-sans font-medium text-white">
                          <Link to={`/teams/${t.teamId}`} className="hover:text-emerald-400 transition">
                            {t.name} <span className="text-xs text-slate-400">[{t.tag}]</span>
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-center text-slate-300">{t.membersCount}</td>
                        <td className="px-5 py-3.5 text-center text-xs">
                          🥇 {t.medals.gold} | 🥈 {t.medals.silver} | 🥉 {t.medals.bronze}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right font-bold flex items-center justify-end gap-1 ${
                            isGain ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isGain ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          <span>{isGain ? '+' : ''}{t.performance.toFixed(2)}%</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
