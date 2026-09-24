import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import {
  YahooStockCandidate,
  YahooIndexOverview,
  YahooSyncResult,
} from '../../types';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Globe,
  Sparkles,
  Download,
  Plus,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  TrendingUp,
} from 'lucide-react';

export const AdminYahooDiscovery: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'indices' | 'screener'>('indices');

  // État Indices (CAC 40 & SBF 120)
  const [selectedIndex, setSelectedIndex] = useState<'cac40' | 'sbf120'>('cac40');
  const [indexOverview, setIndexOverview] = useState<YahooIndexOverview | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexSyncing, setIndexSyncing] = useState(false);
  const [indexFilter, setIndexFilter] = useState('');

  // État Screener Euronext Paris
  const [screenerStocks, setScreenerStocks] = useState<YahooStockCandidate[]>([]);
  const [screenerTotal, setScreenerTotal] = useState(0);
  const [screenerPage, setScreenerPage] = useState(1);
  const [screenerLimit] = useState(25);
  const [screenerSearch, setScreenerSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);

  // Messages globaux
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Chargement de l'indice sélectionné
  const loadIndexData = async (indexName: 'cac40' | 'sbf120') => {
    setIndexLoading(true);
    try {
      const data = await adminApi.getYahooIndex(indexName);
      setIndexOverview(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || "Erreur lors du chargement de l'indice." });
    } finally {
      setIndexLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'indices') {
      loadIndexData(selectedIndex);
    }
  }, [selectedIndex, activeSubTab]);

  // Synchronisation 1-clic d'un indice
  const handleSyncIndex = async () => {
    setIndexSyncing(true);
    setFeedback(null);
    try {
      const res: YahooSyncResult = await adminApi.syncYahooIndex(selectedIndex);
      setFeedback({
        type: 'success',
        message: res.message || `Indice synchronisé avec succès : ${res.created} ajoutées, ${res.updated} mises à jour.`,
      });
      await loadIndexData(selectedIndex);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || "Erreur lors de la synchronisation de l'indice." });
    } finally {
      setIndexSyncing(false);
    }
  };

  // Chargement des données du Screener Euronext Paris
  const loadScreenerData = async (targetPage = screenerPage, query = screenerSearch) => {
    setScreenerLoading(true);
    try {
      const offset = (targetPage - 1) * screenerLimit;
      const res = await adminApi.discoverYahooMarket({
        limit: screenerLimit,
        offset,
        search: query,
      });
      setScreenerStocks(res.items);
      setScreenerTotal(res.total);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || "Erreur lors du chargement du catalogue Yahoo." });
    } finally {
      setScreenerLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'screener') {
      loadScreenerData(screenerPage, screenerSearch);
    }
  }, [activeSubTab, screenerPage, screenerSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScreenerPage(1);
    setScreenerSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setScreenerSearch('');
    setScreenerPage(1);
  };

  // Gestion de la sélection multiple
  const toggleSelectTicker = (symbol: string) => {
    setSelectedTickers((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    const unadded = screenerStocks.filter((s) => !s.inDatabase || !s.isTracked);
    const allSelected = unadded.length > 0 && unadded.every((s) => selectedTickers.has(s.symbol));

    setSelectedTickers((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        unadded.forEach((s) => next.delete(s.symbol));
      } else {
        unadded.forEach((s) => next.add(s.symbol));
      }
      return next;
    });
  };

  // Importation massive de la sélection
  const handleBulkImport = async () => {
    if (selectedTickers.size === 0) return;
    setBulkImporting(true);
    setFeedback(null);

    const itemsToImport = screenerStocks
      .filter((s) => selectedTickers.has(s.symbol))
      .map((s) => ({
        symbol: s.symbol,
        name: s.name,
        price: s.price,
      }));

    try {
      const res = await adminApi.importYahooStocks(itemsToImport);
      setFeedback({
        type: 'success',
        message: res.message || `${res.created} actions ajoutées et ${res.updated} actions activées.`,
      });
      setSelectedTickers(new Set());
      await loadScreenerData(screenerPage, screenerSearch);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || "Erreur lors de l'importation." });
    } finally {
      setBulkImporting(false);
    }
  };

  // Importation individuelle en un clic
  const handleSingleImport = async (stock: YahooStockCandidate) => {
    setFeedback(null);
    try {
      const res = await adminApi.importYahooStocks([{
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
      }]);
      setFeedback({
        type: 'success',
        message: `Action ${stock.symbol} (${stock.name}) importée et activée avec succès.`,
      });
      await loadScreenerData(screenerPage, screenerSearch);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || `Erreur d'importation pour ${stock.symbol}.` });
    }
  };

  // Constituants filtrés pour l'onglet indices
  const filteredConstituents = (indexOverview?.constituents || []).filter((c) => {
    if (!indexFilter.trim()) return true;
    const q = indexFilter.toLowerCase();
    return c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  const screenerTotalPages = Math.ceil(screenerTotal / screenerLimit) || 1;

  return (
    <div className="space-y-6">
      {/* Bannière de navigation des sous-onglets */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4" />
            <span>Découverte Yahoo Finance</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Importation & Synchronisation de Marché</h2>
          <p className="text-xs text-slate-400 mt-1">
            Explorez les cotations Euronext Paris et synchronisez les indices majeurs en un clic avec activation immédiate.
          </p>
        </div>

        <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('indices')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeSubTab === 'indices'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Indices (CAC 40 / SBF 120)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('screener')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeSubTab === 'screener'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Catalogue Euronext Paris</span>
          </button>
        </div>
      </div>

      {/* Message de feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 ml-4 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 1 : INDICES FRANÇAIS (CAC 40 & SBF 120)                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'indices' && (
        <div className="space-y-6">
          {/* Sélecteur d'indice & Carte Résumé */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Carte CAC 40 */}
            <div
              onClick={() => setSelectedIndex('cac40')}
              className={`p-5 rounded-2xl border cursor-pointer transition ${
                selectedIndex === 'cac40'
                  ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Indice Principal</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ^FCHI
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white">CAC 40</h3>
              <p className="text-xs text-slate-400 mt-1">Les 40 plus grandes capitalisations d'Euronext Paris.</p>
              {selectedIndex === 'cac40' && indexOverview && (
                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs">
                  <span className="text-emerald-400 font-semibold">{indexOverview.trackedCount} / {indexOverview.totalConstituents} suivies</span>
                  <span className="text-amber-400">{indexOverview.missingCount} à synchroniser</span>
                </div>
              )}
            </div>

            {/* Carte SBF 120 */}
            <div
              onClick={() => setSelectedIndex('sbf120')}
              className={`p-5 rounded-2xl border cursor-pointer transition ${
                selectedIndex === 'sbf120'
                  ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Indice Élargi</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  ^SBF120
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white">SBF 120</h3>
              <p className="text-xs text-slate-400 mt-1">CAC 40 + CAC Next 20 + CAC Mid 60.</p>
              {selectedIndex === 'sbf120' && indexOverview && (
                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs">
                  <span className="text-emerald-400 font-semibold">{indexOverview.trackedCount} / {indexOverview.totalConstituents} suivies</span>
                  <span className="text-amber-400">{indexOverview.missingCount} à synchroniser</span>
                </div>
              )}
            </div>

            {/* Carte d'Action Rapide de Synchronisation */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Synchronisation 1-Clic</span>
                </span>
                <h4 className="text-sm font-bold text-white">Activer tout l'indice</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Crée les actions manquantes, active la mise à jour scraper (<code className="text-slate-300">down=1</code>) et autorise les achats (<code className="text-slate-300">authachat=1</code>).
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <button
                  onClick={handleSyncIndex}
                  disabled={indexSyncing || indexLoading}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  {indexSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synchronisation en cours...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Synchroniser le {selectedIndex.toUpperCase()}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Barre de recherche et statut de la liste */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrer les constituants..."
                value={indexFilter}
                onChange={(e) => setIndexFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="text-xs text-slate-400">
              Affichage de <span className="text-white font-bold">{filteredConstituents.length}</span> valeurs sur {indexOverview?.totalConstituents || 0}
            </div>
          </div>

          {/* Tableau des Constituants */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {indexLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" />
                <span>Chargement des valeurs de l'indice...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Symbole Yahoo</th>
                      <th className="py-3 px-4">Nom de la société</th>
                      <th className="py-3 px-4">Code SICOVAM</th>
                      <th className="py-3 px-4 text-right">Dernier Cours</th>
                      <th className="py-3 px-4 text-center">Statut dans NetTrader</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredConstituents.map((c) => (
                      <tr key={c.symbol} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {c.symbol}
                        </td>
                        <td className="py-3 px-4 text-white font-semibold">{c.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {c.codesico ?? <span className="text-slate-600 italic">Non attribué</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {c.price > 0 ? `${c.price.toFixed(2)} €` : <span className="text-slate-500">-</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {c.inDatabase && c.isTracked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Suivie & Active</span>
                            </span>
                          ) : c.inDatabase && !c.isTracked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>En base (Scraper inactif)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <Plus className="w-3.5 h-3.5" />
                              <span>Nouvelle valeur</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredConstituents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                          Aucun constituant ne correspond à votre filtre.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : CATALOGUE EURONEXT PARIS (SCREENER YAHOO)                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'screener' && (
        <div className="space-y-4">
          {/* Barre d'outils : recherche & sélection */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par mot-clé (ex: Air Liquide, TTE, FDJ)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Chercher
              </button>
              {screenerSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
                >
                  Effacer
                </button>
              )}
            </form>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllOnPage}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Cocher non suivies</span>
              </button>

              <button
                type="button"
                onClick={handleBulkImport}
                disabled={selectedTickers.size === 0 || bulkImporting}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition"
              >
                {bulkImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Import en cours...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Importer la sélection ({selectedTickers.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tableau Screener */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {screenerLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" />
                <span>Interrogation de Yahoo Screener...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleSelectAllOnPage}
                          className="text-slate-400 hover:text-white"
                          title="Sélectionner tout sur cette page"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="py-3 px-4">Ticker</th>
                      <th className="py-3 px-4">Nom de l'entreprise</th>
                      <th className="py-3 px-4 text-right">Cours Actuel</th>
                      <th className="py-3 px-4 text-right">Capitalisation</th>
                      <th className="py-3 px-4 text-center">Statut NetTrader</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {screenerStocks.map((stock) => {
                      const isSelected = selectedTickers.has(stock.symbol);
                      return (
                        <tr
                          key={stock.symbol}
                          className={`hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-emerald-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectTicker(stock.symbol)}
                              className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {stock.symbol}
                          </td>
                          <td className="py-3 px-4 text-white font-semibold">
                            {stock.name}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {stock.price.toFixed(2)} €
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {stock.marketCap && stock.marketCap > 0
                              ? `${(stock.marketCap / 1e9).toFixed(2)} Mrd €`
                              : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {stock.inDatabase ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>En base ({stock.codesico})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                <span>Non importée</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {stock.inDatabase && stock.isTracked ? (
                              <span className="text-[11px] text-slate-500 font-medium">Déjà active</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSingleImport(stock)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{stock.inDatabase ? 'Réactiver' : 'Importer'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {screenerStocks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                          Aucune action trouvée dans le catalogue Yahoo Euronext Paris.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Screener */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
              <span className="text-slate-400">
                Total : <strong className="text-white">{screenerTotal}</strong> actions disponibles sur Euronext Paris
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={screenerPage <= 1 || screenerLoading}
                  onClick={() => setScreenerPage((p) => Math.max(1, p - 1))}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-slate-300 font-mono">
                  Page {screenerPage} / {screenerTotalPages}
                </span>
                <button
                  type="button"
                  disabled={screenerPage >= screenerTotalPages || screenerLoading}
                  onClick={() => setScreenerPage((p) => p + 1)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-lg transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
