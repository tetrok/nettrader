import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin';
import {
  MarketSyncOverview,
  MarketSyncLogItem,
  MarketSyncStockItem,
} from '../../types';
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Filter,
  Power,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  History,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminMarketSync: React.FC = () => {
  const [overview, setOverview] = useState<MarketSyncOverview | null>(null);
  const [logs, setLogs] = useState<MarketSyncLogItem[]>([]);
  const [stocks, setStocks] = useState<MarketSyncStockItem[]>([]);
  const [totalStocks, setTotalStocks] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(25);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('fail_count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingStockCode, setSyncingStockCode] = useState<number | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadOverviewAndLogs = async () => {
    try {
      const res = await adminApi.getMarketSyncOverview();
      setOverview(res.overview);
      setLogs(res.recentLogs);
    } catch (err: any) {
      console.error('Erreur chargement aperçu marché:', err);
    }
  };

  const loadStocks = async (targetPage = page) => {
    try {
      const res = await adminApi.getMarketSyncStocks({
        page: targetPage,
        limit,
        search,
        status: statusFilter,
        sort: sortField,
        order: sortOrder,
      });
      setStocks(res.items);
      setTotalStocks(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('Erreur chargement valeurs marché:', err);
    }
  };

  const reloadView = async () => {
    setRefreshing(true);
    setActionFeedback(null);
    setActionError(null);
    try {
      await Promise.all([loadOverviewAndLogs(), loadStocks(page)]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleForceMarketSync = async () => {
    setSyncingAll(true);
    setActionFeedback(null);
    setActionError(null);
    try {
      const res = await adminApi.forceMarketSync();
      setActionFeedback(
        `Actualisation forcée réussie : ${res.successCount}/${res.totalStocks} valeurs synchronisées depuis Yahoo Finance en ${res.durationSeconds}s.`
      );
      await Promise.all([loadOverviewAndLogs(), loadStocks(page)]);
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de l’actualisation forcée des cotations.');
      setTimeout(() => setActionError(null), 6000);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleForceStockSync = async (codesico: number, ticker: string) => {
    setSyncingStockCode(codesico);
    try {
      const res = await adminApi.forceStockSync(codesico);
      if (res.successCount > 0) {
        setActionFeedback(`Cotation actualisée avec succès pour ${ticker} (${res.durationSeconds}s).`);
      } else {
        setActionError(`Impossible de récupérer la cotation pour ${ticker}.`);
      }
      await Promise.all([loadOverviewAndLogs(), loadStocks(page)]);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionError(err.message || `Erreur lors de l’actualisation de ${ticker}.`);
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setSyncingStockCode(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadOverviewAndLogs(), loadStocks(1)]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    setPage(1);
    loadStocks(1);
  }, [statusFilter, sortField, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadStocks(1);
  };

  const handleToggleTracking = async (codesico: number, currentTracked: boolean) => {
    try {
      await adminApi.toggleStockTracking(codesico);
      setActionFeedback(
        currentTracked
          ? 'Téléchargement désactivé pour cette valeur.'
          : 'Téléchargement activé pour cette valeur.'
      );
      await Promise.all([loadOverviewAndLogs(), loadStocks(page)]);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la mise à jour.');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleResetStockErrors = async (codesico: number, ticker: string) => {
    try {
      await adminApi.resetStockErrors(codesico);
      setActionFeedback(`Compteurs d'erreurs réinitialisés pour ${ticker}.`);
      await Promise.all([loadOverviewAndLogs(), loadStocks(page)]);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Erreur réinitialisation.');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleResetAllErrors = async () => {
    if (!window.confirm('Voulez-vous vraiment réinitialiser les compteurs d’erreurs de TOUTES les valeurs actives ?')) {
      return;
    }
    try {
      await adminApi.resetAllStockErrors();
      setActionFeedback('Tous les compteurs d’erreurs ont été réinitialisés avec succès.');
      await Promise.all([loadOverviewAndLogs(), loadStocks(page)]);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Erreur réinitialisation globale.');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const formatTimestamp = (ts: number | null | undefined) => {
    if (!ts || ts <= 0) return 'Jamais';
    return new Date(ts * 1000).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTimeAgo = (ts: number | null | undefined) => {
    if (!ts || ts <= 0) return '';
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - ts);
    if (diff < 60) return `(il y a ${diff}s)`;
    if (diff < 3600) return `(il y a ${Math.floor(diff / 60)} min)`;
    if (diff < 86400) return `(il y a ${Math.floor(diff / 3600)} h)`;
    return `(il y a ${Math.floor(diff / 86400)} j)`;
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Suivi des Mises à Jour & Cotations Boursières</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Surveillance en temps réel du scraper Yahoo Finance, détection des échecs et retries
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetAllErrors}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition"
            title="Remettre les compteurs d'échecs à zéro pour tous les titres"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser Erreurs</span>
          </button>
          <button
            onClick={reloadView}
            disabled={refreshing || syncingAll}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            title="Recharger l'affichage depuis la base de données locale"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Recharger la vue</span>
          </button>
          <button
            onClick={handleForceMarketSync}
            disabled={syncingAll || refreshing}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
            title="Interroger immédiatement Yahoo Finance et actualiser les cotations de tous les titres suivis"
          >
            <Zap className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
            <span>{syncingAll ? 'Actualisation en cours...' : 'Actualiser (Forcer)'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Overview KPI Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Taux de succès */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Taux de Succès Actuel</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-white flex items-baseline gap-1">
              <span>{overview.successRate}%</span>
              <span className="text-xs font-normal text-slate-400">
                ({overview.totalSuccess}/{overview.totalTracked})
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, overview.successRate))}%` }}
              />
            </div>
          </div>

          {/* Valeurs en échec */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Valeurs en Échec</span>
              <ShieldAlert className={`w-4 h-4 ${overview.totalFailed > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
            </div>
            <div className={`text-3xl font-extrabold font-mono ${overview.totalFailed > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
              {overview.totalFailed}
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Avec Retries : {overview.totalWithRetries}</span>
              <span>Total échecs : {overview.totalFailuresAllTime}</span>
            </div>
          </div>

          {/* Titres Suivis vs Désactivés */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Périmètre des Titres</span>
              <Power className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-white">
              {overview.totalTracked}
              <span className="text-xs font-normal text-slate-400 ml-1.5">actifs</span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Désactivés : {overview.totalDisabled}</span>
              <span>Total : {overview.totalStocks}</span>
            </div>
          </div>

          {/* Dernier Cycle */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Dernier Cycle Exécuté</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-semibold text-white truncate">
              {overview.lastSyncTime ? formatTimestamp(overview.lastSyncTime) : 'En attente'}
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>{overview.lastSyncTime ? formatTimeAgo(overview.lastSyncTime) : ''}</span>
              <span>
                {overview.lastSyncDuration !== null ? `${overview.lastSyncDuration.toFixed(2)}s` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Accordion: Recent Sync Runs Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-950/40 hover:bg-slate-800/30 transition text-left"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <History className="w-4 h-4 text-sky-400" />
            <span>Historique des Cycles de Synchronisation ({logs.length} récents)</span>
          </div>
          {showLogs ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showLogs && (
          <div className="border-t border-slate-800 overflow-x-auto">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Aucun cycle enregistré pour le moment. Le fetcher démarre lors de son premier passage.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-5 py-2.5">Date & Heure</th>
                    <th className="px-5 py-2.5">Titres Traités</th>
                    <th className="px-5 py-2.5 text-emerald-400">Succès</th>
                    <th className="px-5 py-2.5 text-rose-400">Échecs</th>
                    <th className="px-5 py-2.5">Durée</th>
                    <th className="px-5 py-2.5">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-2.5 text-slate-300 whitespace-nowrap">
                        {formatTimestamp(l.syncTime)} {formatTimeAgo(l.syncTime)}
                      </td>
                      <td className="px-5 py-2.5 font-bold text-white">{l.totalStocks}</td>
                      <td className="px-5 py-2.5 text-emerald-400 font-bold">{l.successCount}</td>
                      <td className="px-5 py-2.5 text-rose-400 font-bold">
                        {l.errorCount > 0 ? l.errorCount : <span className="text-slate-600">0</span>}
                      </td>
                      <td className="px-5 py-2.5 text-slate-400">{l.durationSeconds.toFixed(2)}s</td>
                      <td className="px-5 py-2.5 text-slate-400 max-w-xs truncate font-sans text-xs">
                        {l.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Stocks Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Filter Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Tous ({overview?.totalStocks || 0})
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                statusFilter === 'failed'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800/60'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>En Échec ({overview?.totalFailed || 0})</span>
            </button>
            <button
              onClick={() => setStatusFilter('success')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                statusFilter === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>À Jour ({overview?.totalSuccess || 0})</span>
            </button>
            <button
              onClick={() => setStatusFilter('retried')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                statusFilter === 'retried'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Avec Retries ({overview?.totalWithRetries || 0})</span>
            </button>
            <button
              onClick={() => setStatusFilter('disabled')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                statusFilter === 'disabled'
                  ? 'bg-slate-800 text-slate-300 border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>Désactivés ({overview?.totalDisabled || 0})</span>
            </button>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Trier par :</span>
            </span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700"
            >
              <option value="fail_count">Nombre d'échecs consécutifs</option>
              <option value="total_fails">Total échecs historique</option>
              <option value="retry_count">Nombre de retries</option>
              <option value="last_attempt">Dernière tentative</option>
              <option value="lasttime">Dernière cotation</option>
              <option value="yahooname">Symbole Ticker</option>
              <option value="nom">Nom de la valeur</option>
              <option value="valeur">Cours de l'action</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 hover:text-white"
              title={sortOrder === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une action par son ticker (ex: TTE.PA, AIR.PA) ou par son nom..."
              className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-full"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Filtrer
          </button>
        </form>
      </div>

      {/* Stocks Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Symbole / Action</th>
                <th className="px-5 py-3.5 text-right">Dernier Cours</th>
                <th className="px-5 py-3.5">Dernière Tentative</th>
                <th className="px-5 py-3.5 text-center">Statut</th>
                <th className="px-5 py-3.5 text-center">Échecs / Total</th>
                <th className="px-5 py-3.5 text-center">Retry</th>
                <th className="px-5 py-3.5">Dernière Erreur Rencontrée</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {stocks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                    Aucune valeur ne correspond aux critères de filtre ou de recherche.
                  </td>
                </tr>
              ) : (
                stocks.map((s) => {
                  const isFailed = s.lastStatus === 'failed';
                  const isSuccess = s.lastStatus === 'success';

                  return (
                    <tr
                      key={s.codesico}
                      className={`hover:bg-slate-800/40 transition ${
                        !s.isTracked ? 'opacity-60 bg-slate-950/20' : isFailed ? 'bg-rose-500/[0.03]' : ''
                      }`}
                    >
                      {/* Symbole & Nom */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/stocks/${s.codesico}`}
                            className="font-mono font-bold text-white hover:text-emerald-400 transition"
                          >
                            {s.ticker}
                          </Link>
                          {!s.isTracked && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              Désactivé
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]" title={s.name}>
                          {s.name}
                        </div>
                      </td>

                      {/* Cours & Date cotation */}
                      <td className="px-5 py-3 text-right font-mono">
                        <div className="font-bold text-white">{s.price.toFixed(2)} €</div>
                        <div className="text-[10px] text-slate-400">
                          Coté: {s.lastTime > 0 ? new Date(s.lastTime * 1000).toLocaleDateString('fr-FR') : '—'}
                        </div>
                      </td>

                      {/* Horodatage tentative */}
                      <td className="px-5 py-3 font-mono text-[11px]">
                        <div className="text-slate-300">
                          {formatTimestamp(s.lastAttempt)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatTimeAgo(s.lastAttempt)}
                        </div>
                      </td>

                      {/* Statut badge */}
                      <td className="px-5 py-3 text-center">
                        {!s.isTracked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            <Power className="w-3 h-3" />
                            <span>Inactif</span>
                          </span>
                        ) : isSuccess ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>À Jour</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            <span>Échec</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            <Clock className="w-3 h-3" />
                            <span>En attente</span>
                          </span>
                        )}
                      </td>

                      {/* Échecs consécutifs & Total */}
                      <td className="px-5 py-3 text-center font-mono">
                        <span
                          className={`font-bold ${
                            s.failCount > 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {s.failCount}
                        </span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-400 text-[11px]">{s.totalFails}</span>
                      </td>

                      {/* Retry count */}
                      <td className="px-5 py-3 text-center font-mono">
                        {s.retryCount > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {s.retryCount}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* Message d'erreur */}
                      <td className="px-5 py-3 text-xs max-w-xs">
                        {s.lastError ? (
                          <span
                            className="font-mono text-rose-300/90 text-[11px] block truncate"
                            title={s.lastError}
                          >
                            {s.lastError}
                          </span>
                        ) : isSuccess ? (
                          <span className="text-emerald-500/70 text-[11px]">Aucune erreur</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleForceStockSync(s.codesico, s.ticker)}
                            disabled={syncingStockCode === s.codesico || syncingAll}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 transition disabled:opacity-50"
                            title={`Forcer l'actualisation de la cotation Yahoo pour ${s.ticker}`}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingStockCode === s.codesico ? 'animate-spin' : ''}`} />
                          </button>
                          {s.failCount > 0 && (
                            <button
                              onClick={() => handleResetStockErrors(s.codesico, s.ticker)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition"
                              title="Réinitialiser le compteur d'échecs de cette valeur"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleTracking(s.codesico, s.isTracked)}
                            className={`p-1.5 rounded-lg transition ${
                              s.isTracked
                                ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                            }`}
                            title={
                              s.isTracked
                                ? 'Désactiver le téléchargement périodique de ce titre'
                                : 'Activer le téléchargement périodique de ce titre'
                            }
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <div>
              Affichage de {stocks.length} sur {totalStocks} valeurs (Page {page} sur {totalPages})
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const newP = Math.max(1, page - 1);
                  setPage(newP);
                  loadStocks(newP);
                }}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
              >
                Précédent
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  const newP = Math.min(totalPages, page + 1);
                  setPage(newP);
                  loadStocks(newP);
                }}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
