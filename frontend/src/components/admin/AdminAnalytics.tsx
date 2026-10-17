/**
 * NetTrader 2 — Tableau de Bord d'Analytique & Diagnostic (AdminAnalytics)
 *
 * Usage:
 *   Visualisation des usages utilisateurs, des pratiques métier de trading
 *   et du journal en temps réel des erreurs et incidents rencontrés par les joueurs.
 */

import React, { useEffect, useState } from 'react';
import { adminAnalyticsApi, AnalyticsOverviewData } from '../../api/admin-analytics';
import {
  Activity,
  Users,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Bug,
  Compass,
} from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsOverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [days, setDays] = useState<number>(7);
  const [expandedErrorId, setExpandedErrorId] = useState<number | null>(null);
  const [errorFilter, setErrorFilter] = useState<string>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminAnalyticsApi.getOverview(days);
      setData(res);
    } catch (err: any) {
      console.error("Erreur de chargement de l'analytique :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  if (loading && !data) {
    return (
      <div className="h-72 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mr-3" />
        <span>Chargement des métriques d'analytique...</span>
      </div>
    );
  }

  const kpis = data?.kpis;
  const usages = data?.usages;
  const trading = data?.trading;
  const errors = data?.errors;

  const filteredErrors = errors?.recent.filter((err) => {
    if (errorFilter === 'ALL') return true;
    return err.type === errorFilter;
  }) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Barre d'outils supérieure */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            <Activity className="w-5 h-5 text-emerald-400 mr-2" />
            Télémétrie, Usages & Santé du Système
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Surveillance en temps réel des parcours utilisateurs, du trading et des problèmes signalés.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value={1}>Dernières 24 heures</option>
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Cartes KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Événements Capturés</p>
              <h3 className="text-2xl font-black text-white mt-1">{kpis?.totalEvents.toLocaleString('fr-FR') || 0}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 flex items-center">
            <span className="text-emerald-400 mr-1 font-semibold">Usages</span> sur la période
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sessions Uniques</p>
              <h3 className="text-2xl font-black text-white mt-1">{kpis?.uniqueSessions.toLocaleString('fr-FR') || 0}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 flex items-center">
            Navigateurs / appareils distincts
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Traders Actifs</p>
              <h3 className="text-2xl font-black text-white mt-1">{kpis?.activeUsers.toLocaleString('fr-FR') || 0}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 flex items-center">
            Comptes identifiés connectés
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Problèmes Signalés</p>
              <h3 className={`text-2xl font-black mt-1 ${kpis?.totalErrors && kpis.totalErrors > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {kpis?.totalErrors.toLocaleString('fr-FR') || 0}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl border ${kpis?.totalErrors && kpis.totalErrors > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 flex items-center">
            Erreurs API, rejets & crashs UI
          </p>
        </div>
      </div>

      {/* Section 1 & 2 : Usages & Pratiques de Trading */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usages : Pages les plus consultées */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center mb-4">
            <FileText className="w-4 h-4 text-emerald-400 mr-2" />
            Fréquentation : Pages les Plus Vues
          </h3>

          {usages?.topPages && usages.topPages.length > 0 ? (
            <div className="space-y-3">
              {usages.topPages.map((page, idx) => {
                const maxViews = usages.topPages[0]?.views || 1;
                const percentage = Math.round((page.views / maxViews) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-mono text-slate-300">{page.path}</span>
                      <span className="text-slate-400">{page.views} vues</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-slate-500 text-xs italic">
              Aucune navigation enregistrée sur cette période
            </div>
          )}
        </div>

        {/* Pratiques : Activité de Trading */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400 mr-2" />
            Pratiques Métier : Entonnoir & Passage d'Ordres
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-center">
              <span className="text-xs text-slate-400 block mb-1">Tickets Ouverts</span>
              <span className="text-lg font-bold text-white">{trading?.summary.modalOpened || 0}</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-center">
              <span className="text-xs text-slate-400 block mb-1">Ordres Soumis</span>
              <span className="text-lg font-bold text-emerald-400">{trading?.summary.submitted || 0}</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-center">
              <span className="text-xs text-slate-400 block mb-1">Règles Bloquantes</span>
              <span className="text-lg font-bold text-amber-400">{trading?.summary.blocked || 0}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Répartition par Sens
            </div>
            {trading?.sens && trading.sens.length > 0 ? (
              <div className="flex gap-4">
                {trading.sens.map((s, idx) => {
                  const isBuy = s.sens.toLowerCase() === 'achat';
                  return (
                    <div
                      key={idx}
                      className={`flex-1 flex items-center justify-between p-3 rounded-xl border ${
                        isBuy
                          ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-300'
                          : 'bg-rose-950/20 border-rose-900/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        <span className="capitalize font-medium text-xs">{s.sens}</span>
                      </div>
                      <span className="font-bold text-sm">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-slate-500 text-xs italic py-2">
                Aucun ordre soumis sur cette période
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 3 : Journal de Résolution des Problèmes & Erreurs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center">
              <ShieldAlert className="w-4 h-4 text-rose-400 mr-2" />
              Journal des Problèmes & Diagnostic des Incidents
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historique des erreurs API (4xx/5xx), rejets de contraintes de jeu et crashs React.
            </p>
          </div>

          {/* Filtres par type d'erreur */}
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'API_ERROR', 'ORDER_REJECTED', 'UI_CRASH', 'NETWORK_ERROR'].map((filter) => (
              <button
                key={filter}
                onClick={() => setErrorFilter(filter)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                  errorFilter === filter
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {filter === 'ALL' ? 'Tous' : filter}
              </button>
            ))}
          </div>
        </div>

        {filteredErrors.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">Aucun problème ou incident détecté !</p>
            <p className="text-xs text-slate-500 mt-1">L'ensemble des services et interactions fonctionnent parfaitement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Joueur</th>
                  <th className="px-4 py-3">Message d'Erreur</th>
                  <th className="px-4 py-3 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredErrors.map((err) => {
                  const isExpanded = expandedErrorId === err.id;
                  const dateFormatted = new Date(err.createdAt).toLocaleString('fr-FR');

                  return (
                    <React.Fragment key={err.id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{dateFormatted}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              err.type === 'UI_CRASH'
                                ? 'bg-red-900/40 text-red-300 border border-red-800/50'
                                : err.type === 'ORDER_REJECTED'
                                ? 'bg-amber-900/40 text-amber-300 border border-amber-800/50'
                                : 'bg-rose-900/40 text-rose-300 border border-rose-800/50'
                            }`}
                          >
                            {err.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 max-w-[150px] truncate">{err.route || '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{err.userId ? `#${err.userId}` : 'Anonyme'}</td>
                        <td className="px-4 py-3 text-slate-200 font-sans max-w-sm truncate">{err.message}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setExpandedErrorId(isExpanded ? null : err.id)}
                            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-950/90">
                          <td colSpan={6} className="px-6 py-4 space-y-3 font-sans">
                            <div className="flex items-center space-x-2 text-rose-300 font-mono text-xs">
                              <Bug className="w-4 h-4" />
                              <span>{err.message}</span>
                              {err.statusCode && (
                                <span className="bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-800 text-[10px]">
                                  HTTP {err.statusCode}
                                </span>
                              )}
                            </div>

                            {err.context && (
                              <div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                  Contexte & Paramètres :
                                </span>
                                <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
                                  {JSON.stringify(err.context, null, 2)}
                                </pre>
                              </div>
                            )}

                            {err.stackTrace && (
                              <div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                  Trace d'appel (Stack Trace) :
                                </span>
                                <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-red-300/80 overflow-x-auto max-h-40">
                                  {err.stackTrace}
                                </pre>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
