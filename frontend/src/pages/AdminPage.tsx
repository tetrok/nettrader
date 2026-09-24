import React, { useEffect, useState } from 'react';
import { adminApi, AdminDashboardData } from '../api/admin';
import { AdminForumManagement } from '../components/admin/AdminForumManagement';
import { AdminMarketSync } from '../components/admin/AdminMarketSync';
import { AdminStockManagement } from '../components/admin/AdminStockManagement';
import { AdminYahooDiscovery } from '../components/admin/AdminYahooDiscovery';
import {
  Shield,
  Play,
  Users,
  Clock,
  Database,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Activity,
  MessageSquare,
  Search,
  TrendingUp,
  Layers,
  Globe,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'supervision' | 'stocks' | 'yahoo' | 'marketSync' | 'players' | 'forum'>('supervision');
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [playersTotal, setPlayersTotal] = useState(0);
  const [playersPage, setPlayersPage] = useState(1);
  const [playersTotalPages, setPlayersTotalPages] = useState(1);
  const [playersSearch, setPlayersSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [d, p] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getPlayers(playersPage, 20, playersSearch),
      ]);
      setDashboard(d);
      setPlayers(p.items);
      setPlayersTotal(p.total);
      setPlayersTotalPages(p.totalPages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [playersPage]);

  const handleSearchPlayers = (e: React.FormEvent) => {
    e.preventDefault();
    setPlayersPage(1);
    adminApi.getPlayers(1, 20, playersSearch).then((p) => {
      setPlayers(p.items);
      setPlayersTotal(p.total);
      setPlayersTotalPages(p.totalPages);
    });
  };

  const handleExecuteOrders = async () => {
    setRunningJob(true);
    setFeedback(null);
    try {
      await adminApi.executeOrdersJob();
      setFeedback("L'algorithme d'exécution des ordres boursiers a été exécuté avec succès.");
      loadData();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRunningJob(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Shield className="w-4 h-4" />
          <span>Espace Administrateur</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Supervision & Administration</h1>
        <p className="text-xs text-slate-400 mt-1">
          Surveillance système, modération du forum et gestion des participants
        </p>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('supervision')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'supervision'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Supervision Système</span>
        </button>
        <button
          onClick={() => setActiveTab('stocks')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'stocks'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Catalogue Actions</span>
        </button>
        <button
          onClick={() => setActiveTab('yahoo')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'yahoo'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Découverte Yahoo</span>
        </button>
        <button
          onClick={() => setActiveTab('marketSync')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'marketSync'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Suivi des Cotations</span>
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'players'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Joueurs Enregistrés ({playersTotal})</span>
        </button>
        <button
          onClick={() => setActiveTab('forum')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'forum'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Administration du Forum</span>
        </button>
      </div>

      {/* TAB 1: SUPERVISION */}
      {activeTab === 'supervision' && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <div className="text-xs text-slate-400">Joueurs Inscrits</div>
              <div className="text-2xl font-bold font-mono text-white">{dashboard?.totalPlayers}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <div className="text-xs text-slate-400">Ordres en Attente</div>
              <div className="text-2xl font-bold font-mono text-amber-400">{dashboard?.pendingOrders}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <div className="text-xs text-slate-400">Sessions Actives</div>
              <div className="text-2xl font-bold font-mono text-emerald-400">{dashboard?.activeSessions}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <div className="text-xs text-slate-400">Titres Référencés</div>
              <div className="text-2xl font-bold font-mono text-sky-400">{dashboard?.totalStocks}</div>
            </div>
          </div>

          {/* Action panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-bold text-white">Actions de Maintenance</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleExecuteOrders}
                disabled={runningJob}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
              >
                {runningJob ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span>Exécuter les Ordres en Attente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CATALOGUE DES ACTIONS */}
      {activeTab === 'stocks' && <AdminStockManagement />}

      {/* TAB: DECOUVERTE & INDICES YAHOO */}
      {activeTab === 'yahoo' && <AdminYahooDiscovery />}

      {/* TAB: SUIVI DES COTATIONS */}
      {activeTab === 'marketSync' && <AdminMarketSync />}

      {/* TAB: PLAYERS */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          <form
            onSubmit={handleSearchPlayers}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={playersSearch}
                onChange={(e) => setPlayersSearch(e.target.value)}
                placeholder="Rechercher par pseudonyme ou adresse e-mail..."
                className="bg-transparent text-white placeholder-slate-400 focus:outline-none w-full"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              Rechercher
            </button>
          </form>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Pseudonyme</th>
                  <th className="px-5 py-3.5">E-mail</th>
                  <th className="px-5 py-3.5 text-right">Cashback</th>
                  <th className="px-5 py-3.5 text-center">Niveau</th>
                  <th className="px-5 py-3.5 text-right">Dernière Activité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {players.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 text-slate-400">#{p.id}</td>
                    <td className="px-5 py-3 font-sans font-medium text-white">{p.pseudo}</td>
                    <td className="px-5 py-3 text-slate-400">{p.email}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-400">
                      {p.cashback.toFixed(2)} €
                    </td>
                    <td className="px-5 py-3 text-center font-sans">Niveau {p.level}</td>
                    <td className="px-5 py-3 text-right text-slate-400">
                      {p.lastActive ? new Date(p.lastActive * 1000).toLocaleString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {playersTotalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <div>Page {playersPage} sur {playersTotalPages}</div>
              <div className="flex gap-1.5">
                <button
                  disabled={playersPage <= 1}
                  onClick={() => setPlayersPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  Précédent
                </button>
                <button
                  disabled={playersPage >= playersTotalPages}
                  onClick={() => setPlayersPage((p) => Math.min(playersTotalPages, p + 1))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FORUM ADMINISTRATION */}
      {activeTab === 'forum' && <AdminForumManagement />}
    </div>
  );
};

