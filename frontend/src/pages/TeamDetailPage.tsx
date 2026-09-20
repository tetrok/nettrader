import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { leaderboardApi } from '../api/leaderboard';
import { TeamDetail, TeamMember } from '../types';
import { ArrowLeft, Users, Trophy, Globe, Crown, RefreshCw } from 'lucide-react';

export const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      leaderboardApi
        .getTeam(parseInt(id, 10))
        .then(setTeam)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-white">Équipe introuvable</h2>
        <Link to="/leaderboards" className="text-sm text-emerald-400 hover:underline">
          &larr; Retour aux classements
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Link
        to="/leaderboards"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux classements
      </Link>

      {/* Team Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{team.name}</h1>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                [{team.tag}]
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3 pt-1">
              <span className="flex items-center gap-1 text-slate-300">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Chef d'équipe : <strong>{team.leader.pseudo}</strong>
              </span>
              {team.website && (
                <>
                  <span>•</span>
                  <a
                    href={team.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-emerald-400 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Site officiel
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs">
            <span>Palmarès :</span>
            <span className="font-semibold text-amber-400">🥇 {team.medals.gold}</span>
            <span className="font-semibold text-slate-300">🥈 {team.medals.silver}</span>
            <span className="font-semibold text-amber-700">🥉 {team.medals.bronze}</span>
          </div>
        </div>

        {team.description && (
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-sm text-slate-300 leading-relaxed">
            {team.description}
          </div>
        )}
      </div>

      {/* Team Roster */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          Composition du Club ({team.members.length} membres)
        </h3>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Trader</th>
                <th className="px-5 py-3.5">Date d'adhésion</th>
                <th className="px-5 py-3.5 text-right">Capital Entrée</th>
                <th className="px-5 py-3.5 text-right">Capital Actuel</th>
                <th className="px-5 py-3.5 text-right">Progression</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {team.members.map((m: TeamMember) => {
                const isGain = m.performance >= 0;
                return (
                  <tr key={m.userId} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-sans font-medium text-white flex items-center gap-2">
                      {m.isLeader && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{m.pseudo}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-sans">{m.joinDate}</td>
                    <td className="px-5 py-3.5 text-right text-slate-400">{m.capitalJoin.toFixed(2)} €</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-200">
                      {m.currentCapital.toFixed(2)} €
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right font-bold ${
                        isGain ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isGain ? '+' : ''}{m.performance.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
