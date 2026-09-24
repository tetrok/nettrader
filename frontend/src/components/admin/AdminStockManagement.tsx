import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import {
  AdminStockItem,
  AdminStockMetadata,
  ArchiveStockResult,
  CreateStockPayload,
  UpdateStockPayload,
} from '../../types';
import {
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  X,
  TrendingUp,
  SlidersHorizontal,
  DollarSign,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Archive,
  ArchiveRestore,
  AlertOctagon,
  CheckSquare,
  Square,
} from 'lucide-react';

export const AdminStockManagement: React.FC = () => {
  const [stocks, setStocks] = useState<AdminStockItem[]>([]);
  const [metadata, setMetadata] = useState<AdminStockMetadata>({ sectors: [], markets: [] });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<number>(0);
  const [marketFilter, setMarketFilter] = useState<number>(0);
  const [authBuyFilter, setAuthBuyFilter] = useState<string>('all');
  const [trackedFilter, setTrackedFilter] = useState<string>('all');
  const [archiveFilter, setArchiveFilter] = useState<string>('0'); // '0' active, '1' archived, 'all' all

  // Selection state for bulk operations
  const [selectedCodes, setSelectedCodes] = useState<number[]>([]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStock, setEditingStock] = useState<AdminStockItem | null>(null);
  const [splitStock, setSplitStock] = useState<AdminStockItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<AdminStockItem | null>(null);
  const [archiveCandidate, setArchiveCandidate] = useState<AdminStockItem | null>(null);
  const [archiveBulkCandidate, setArchiveBulkCandidate] = useState<{ codes: number[]; names: string[] } | null>(null);
  const [archiveResultModal, setArchiveResultModal] = useState<ArchiveStockResult | null>(null);
  const [isProcessingArchive, setIsProcessingArchive] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState<CreateStockPayload>({
    codesico: 0,
    yahooname: '',
    nom: '',
    valeur: 10.0,
    authachat: '1',
    down: '1',
    idsecteur: 1,
    idmarket: 1,
  });

  const [editForm, setEditForm] = useState<UpdateStockPayload>({
    nom: '',
    yahooname: '',
    valeur: 0,
    authachat: '1',
    down: '1',
    idsecteur: 1,
    idmarket: 1,
  });

  const [splitType, setSplitType] = useState<'multiplier' | 'diviser'>('multiplier');
  const [splitFactor, setSplitFactor] = useState<number>(2);

  const loadMetadata = async () => {
    try {
      const meta = await adminApi.getStockMetadata();
      setMetadata(meta);
      if (meta.sectors.length > 0 && createForm.idsecteur === 1) {
        setCreateForm((prev) => ({ ...prev, idsecteur: meta.sectors[0].id }));
      }
      if (meta.markets.length > 0 && createForm.idmarket === 1) {
        setCreateForm((prev) => ({ ...prev, idmarket: meta.markets[0].id }));
      }
    } catch (err: any) {
      console.error("Erreur chargement métadonnées", err);
    }
  };

  const loadStocks = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAdminStocks({
        page,
        limit: 20,
        search,
        sectorId: sectorFilter,
        marketId: marketFilter,
        authBuy: authBuyFilter,
        isTracked: trackedFilter,
        isArchived: archiveFilter,
      });
      setStocks(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erreur lors du chargement des actions.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    setSelectedCodes([]);
    loadStocks();
  }, [page, sectorFilter, marketFilter, authBuyFilter, trackedFilter, archiveFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSelectedCodes([]);
    loadStocks();
  };

  const handleToggleAuthBuy = async (codesico: number) => {
    try {
      const res = await adminApi.toggleStockAuthBuy(codesico);
      setStocks((prev) =>
        prev.map((s) => (s.codesico === codesico ? { ...s, authBuy: res.authBuy } : s))
      );
      setFeedback({
        type: 'success',
        message: res.authBuy ? `Achats activés pour l'action #${codesico}.` : `Achats bloqués pour l'action #${codesico}.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleToggleTracking = async (codesico: number) => {
    try {
      const res = await adminApi.toggleStockTracking(codesico);
      setStocks((prev) =>
        prev.map((s) => (s.codesico === codesico ? { ...s, isTracked: res.isTracked } : s))
      );
      setFeedback({
        type: 'success',
        message: res.isTracked ? `Suivi scraper activé pour #${codesico}.` : `Suivi scraper désactivé pour #${codesico}.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleToggleSelectAllFailed = () => {
    const failedStocks = stocks.filter((s) => s.lastStatus === 'failed' || s.failCount > 0);
    const failedCodes = failedStocks.map((s) => s.codesico);
    const allSelected = failedCodes.length > 0 && failedCodes.every((c) => selectedCodes.includes(c));

    if (allSelected) {
      setSelectedCodes((prev) => prev.filter((c) => !failedCodes.includes(c)));
    } else {
      setSelectedCodes((prev) => Array.from(new Set([...prev, ...failedCodes])));
    }
  };

  const handleToggleSelectRow = (codesico: number) => {
    setSelectedCodes((prev) =>
      prev.includes(codesico) ? prev.filter((c) => c !== codesico) : [...prev, codesico]
    );
  };

  const handleArchiveSingleConfirm = async () => {
    if (!archiveCandidate) return;
    setIsProcessingArchive(true);
    try {
      const res = await adminApi.archiveStock(archiveCandidate.codesico);
      setArchiveCandidate(null);
      setArchiveResultModal(res);
      loadStocks();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erreur lors de l\'archivage.' });
      setArchiveCandidate(null);
    } finally {
      setIsProcessingArchive(false);
    }
  };

  const handleUnarchiveSingle = async (stock: AdminStockItem) => {
    try {
      await adminApi.unarchiveStock(stock.codesico);
      setFeedback({
        type: 'success',
        message: `Action "${stock.name}" (#${stock.codesico}) désarchivée avec succès. Téléchargement et achats réactivés.`,
      });
      loadStocks();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erreur lors du désarchivage.' });
    }
  };

  const handleArchiveBulkConfirm = async () => {
    if (!archiveBulkCandidate || archiveBulkCandidate.codes.length === 0) return;
    setIsProcessingArchive(true);
    try {
      const res = await adminApi.archiveBulkStocks(archiveBulkCandidate.codes);
      setArchiveBulkCandidate(null);
      setSelectedCodes([]);
      setArchiveResultModal(res);
      loadStocks();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erreur lors de l\'archivage groupé.' });
      setArchiveBulkCandidate(null);
    } finally {
      setIsProcessingArchive(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createStock(createForm);
      setShowCreateModal(false);
      setFeedback({ type: 'success', message: `Action "${createForm.nom}" ajoutée avec succès au catalogue !` });
      setCreateForm({
        codesico: 0,
        yahooname: '',
        nom: '',
        valeur: 10.0,
        authachat: '1',
        down: '1',
        idsecteur: metadata.sectors[0]?.id || 1,
        idmarket: metadata.markets[0]?.id || 1,
      });
      loadStocks();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenEdit = (stock: AdminStockItem) => {
    setEditingStock(stock);
    setEditForm({
      nom: stock.name,
      yahooname: stock.ticker,
      valeur: stock.price,
      authachat: stock.authBuy ? '1' : '0',
      down: stock.isTracked ? '1' : '0',
      idsecteur: stock.sectorId,
      idmarket: stock.marketId,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock) return;
    try {
      await adminApi.updateStock(editingStock.codesico, editForm);
      setEditingStock(null);
      setFeedback({ type: 'success', message: `Action #${editingStock.codesico} mise à jour avec succès.` });
      loadStocks();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteCandidate) return;
    try {
      await adminApi.deleteStock(deleteCandidate.codesico);
      setDeleteCandidate(null);
      setFeedback({ type: 'success', message: `Action #${deleteCandidate.codesico} supprimée avec succès.` });
      loadStocks();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!splitStock) return;
    try {
      const res = await adminApi.splitStock({
        codesico: splitStock.codesico,
        type: splitType,
        factor: splitFactor,
      });
      setSplitStock(null);
      setFeedback({
        type: 'success',
        message: `Opération exécutée avec succès ! Nouveau cours pour ${splitStock.name} : ${res.newPrice.toFixed(2)} €.`,
      });
      loadStocks();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Bouton création */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Catalogue & Gestion des Actions Boursières
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Création, modification des cotations, blocage des achats et opérations sur titres (split/regroupement)
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 w-fit"
        >
          <Plus className="w-4 h-4" />
          Ajouter une Action
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 text-xs rounded-xl flex items-center justify-between gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barre de filtres et recherche */}
      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, symbole Yahoo (ex: AI.PA) ou code SICOVAM..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            Rechercher
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Secteur</label>
            <select
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(Number(e.target.value));
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value={0}>Tous les secteurs</option>
              {metadata.sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Marché</label>
            <select
              value={marketFilter}
              onChange={(e) => {
                setMarketFilter(Number(e.target.value));
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value={0}>Tous les marchés</option>
              {metadata.markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Achat Joueurs</label>
            <select
              value={authBuyFilter}
              onChange={(e) => {
                setAuthBuyFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="1">Achats autorisés</option>
              <option value="0">Achats bloqués</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Suivi Scraper</label>
            <select
              value={trackedFilter}
              onChange={(e) => {
                setTrackedFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Tous les états</option>
              <option value="1">Actif (téléchargé)</option>
              <option value="0">Désactivé (ignoré)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Archivage</label>
            <select
              value={archiveFilter}
              onChange={(e) => {
                setArchiveFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="0">Actives uniquement (défaut)</option>
              <option value="1">Archivées uniquement</option>
              <option value="all">Toutes (actives & archivées)</option>
            </select>
          </div>
        </div>

        {/* Quick action bar for failed stocks & bulk archive */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAllFailed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Sélectionner les actions en échec ({stocks.filter((s) => s.lastStatus === 'failed' || s.failCount > 0).length} sur cette page)
            </button>
            {selectedCodes.length > 0 && (
              <span className="text-xs text-slate-400">
                <strong className="text-white">{selectedCodes.length}</strong> action(s) sélectionnée(s)
              </span>
            )}
          </div>

          {selectedCodes.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCodes([])}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-white transition"
              >
                Désélectionner tout
              </button>
              <button
                type="button"
                onClick={() => {
                  const selectedStocks = stocks.filter((s) => selectedCodes.includes(s.codesico));
                  setArchiveBulkCandidate({
                    codes: selectedCodes,
                    names: selectedStocks.map((s) => s.name),
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg text-xs transition shadow-md shadow-rose-500/20"
              >
                <Archive className="w-3.5 h-3.5" />
                Archiver la sélection ({selectedCodes.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tableau des actions */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={stocks.length > 0 && stocks.every((s) => selectedCodes.includes(s.codesico))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCodes(Array.from(new Set([...selectedCodes, ...stocks.map((s) => s.codesico)])));
                      } else {
                        const pageCodes = stocks.map((s) => s.codesico);
                        setSelectedCodes(selectedCodes.filter((c) => !pageCodes.includes(c)));
                      }
                    }}
                    className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-4">Symbole & Titre</th>
                <th className="py-3 px-4 text-right">Cours Actuel</th>
                <th className="py-3 px-4">Secteur / Marché</th>
                <th className="py-3 px-4 text-center">Statut Scraper</th>
                <th className="py-3 px-4 text-center">Achat Joueur</th>
                <th className="py-3 px-4 text-center">État</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    Chargement du catalogue...
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Aucune action boursière ne correspond aux filtres appliqués.
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const isSelected = selectedCodes.includes(stock.codesico);
                  const isFailed = stock.lastStatus === 'failed' || stock.failCount > 0;
                  return (
                    <tr
                      key={stock.codesico}
                      className={`hover:bg-slate-800/40 transition ${
                        isSelected ? 'bg-amber-500/5' : ''
                      } ${stock.isArchived ? 'opacity-60 bg-slate-950/30' : ''}`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(stock.codesico)}
                          className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 font-bold">{stock.codesico}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {stock.name}
                          {stock.isArchived && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Archivée
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-emerald-400/90">{stock.ticker}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white text-sm">
                        {stock.price.toFixed(2)} €
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200">{stock.sectorName}</div>
                        <div className="text-[10px] text-slate-500">{stock.marketName}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isFailed ? (
                          <span
                            title={`Échecs: ${stock.failCount}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          >
                            <AlertOctagon className="w-3 h-3 text-rose-400" />
                            En échec ({stock.failCount})
                          </span>
                        ) : stock.lastStatus === 'success' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={stock.isArchived}
                          onClick={() => handleToggleAuthBuy(stock.codesico)}
                          title={stock.isArchived ? "Action archivée (achats interdits)" : stock.authBuy ? "Cliquez pour bloquer l'achat" : "Cliquez pour autoriser l'achat"}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition ${
                            stock.isArchived
                              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                              : stock.authBuy
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          {stock.authBuy ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                          {stock.authBuy ? 'Autorisé' : 'Bloqué'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={stock.isArchived}
                          onClick={() => handleToggleTracking(stock.codesico)}
                          title={stock.isArchived ? "Action archivée (téléchargement désactivé)" : stock.isTracked ? 'Cliquez pour ignorer dans le scraper' : 'Cliquez pour réactiver le téléchargement'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition ${
                            stock.isArchived
                              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                              : stock.isTracked
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {stock.isTracked ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {stock.isArchived ? (
                            <button
                              onClick={() => handleUnarchiveSingle(stock)}
                              title="Désarchiver l'action (réactiver pour les utilisateurs et le scraper)"
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Restaurer</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setArchiveCandidate(stock)}
                              title="Archiver l'action (vendre les positions ouvertes des joueurs au dernier cours connu)"
                              className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-lg transition"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(stock)}
                            title="Modifier les propriétés"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSplitStock(stock);
                              setSplitFactor(2);
                              setSplitType('multiplier');
                            }}
                            title="Opération sur titre (Split / Regroupement)"
                            className="p-1.5 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 rounded-lg transition"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidate(stock)}
                            title="Supprimer du catalogue"
                            className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        <div className="py-3 px-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Total : <strong className="text-white">{total}</strong> action(s) répertoriée(s)
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-slate-300">
                Page {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL : Ajouter une action */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Ajouter une nouvelle Action
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Code SICOVAM *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={createForm.codesico || ''}
                    onChange={(e) => setCreateForm({ ...createForm, codesico: parseInt(e.target.value) || 0 })}
                    placeholder="ex: 12007"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ticker Yahoo *</label>
                  <input
                    type="text"
                    required
                    value={createForm.yahooname}
                    onChange={(e) => setCreateForm({ ...createForm, yahooname: e.target.value.toUpperCase() })}
                    placeholder="ex: AI.PA"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom / Raison Sociale *</label>
                <input
                  type="text"
                  required
                  value={createForm.nom}
                  onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
                  placeholder="ex: Air Liquide"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cours initial (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min={0.01}
                  required
                  value={createForm.valeur || ''}
                  onChange={(e) => setCreateForm({ ...createForm, valeur: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Secteur</label>
                  <select
                    value={createForm.idsecteur}
                    onChange={(e) => setCreateForm({ ...createForm, idsecteur: parseInt(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {metadata.sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Marché</label>
                  <select
                    value={createForm.idmarket}
                    onChange={(e) => setCreateForm({ ...createForm, idmarket: parseInt(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {metadata.markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.authachat === '1'}
                    onChange={(e) => setCreateForm({ ...createForm, authachat: e.target.checked ? '1' : '0' })}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Autoriser les achats</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.down === '1'}
                    onChange={(e) => setCreateForm({ ...createForm, down: e.target.checked ? '1' : '0' })}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Activer la synchronisation scraper</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition"
                >
                  Enregistrer l'action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : Modifier une action */}
      {editingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-400" />
                Modifier l'Action #{editingStock.codesico}
              </h3>
              <button onClick={() => setEditingStock(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ticker Yahoo</label>
                  <input
                    type="text"
                    required
                    value={editForm.yahooname}
                    onChange={(e) => setEditForm({ ...editForm, yahooname: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cours (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    required
                    value={editForm.valeur || ''}
                    onChange={(e) => setEditForm({ ...editForm, valeur: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom / Raison Sociale</label>
                <input
                  type="text"
                  required
                  value={editForm.nom}
                  onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Secteur</label>
                  <select
                    value={editForm.idsecteur}
                    onChange={(e) => setEditForm({ ...editForm, idsecteur: parseInt(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {metadata.sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Marché</label>
                  <select
                    value={editForm.idmarket}
                    onChange={(e) => setEditForm({ ...editForm, idmarket: parseInt(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {metadata.markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.authachat === '1'}
                    onChange={(e) => setEditForm({ ...editForm, authachat: e.target.checked ? '1' : '0' })}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Achats autorisés</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.down === '1'}
                    onChange={(e) => setEditForm({ ...editForm, down: e.target.checked ? '1' : '0' })}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Suivi scraper actif</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStock(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : Opération sur titre (Split / Regroupement) */}
      {splitStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Scissors className="w-5 h-5 text-amber-400" />
                Opération sur titre : {splitStock.name}
              </h3>
              <button onClick={() => setSplitStock(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSplitSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                <div className="text-slate-400">Valeur ciblée : <strong className="text-white">{splitStock.name}</strong> ({splitStock.ticker})</div>
                <div className="text-slate-400">Cours actuel : <strong className="text-emerald-400 font-mono">{splitStock.price.toFixed(2)} €</strong></div>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">Type d'opération :</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitType('multiplier')}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition ${
                      splitType === 'multiplier'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Fractionnement (Split)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('diviser')}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition ${
                      splitType === 'diviser'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Regroupement (Reverse)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Facteur {splitType === 'multiplier' ? '(ex: 2 pour 2 actions pour 1)' : '(ex: 5 pour 1 action pour 5)'} :
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1.1}
                  required
                  value={splitFactor}
                  onChange={(e) => setSplitFactor(parseFloat(e.target.value) || 2)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>

              {/* Simulation en direct */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-amber-200/90 space-y-1">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Impact de l'opération :
                </div>
                <div className="text-[11px]">
                  {splitType === 'multiplier' ? (
                    <>
                      • Les actions détenues par les joueurs seront multipliées par <strong>{splitFactor}</strong>.<br />
                      • Nouveau cours estimé : <strong>{(splitStock.price / splitFactor).toFixed(2)} €</strong>.
                    </>
                  ) : (
                    <>
                      • Les actions détenues par les joueurs seront divisées par <strong>{splitFactor}</strong>.<br />
                      • Nouveau cours estimé : <strong>{(splitStock.price * splitFactor).toFixed(2)} €</strong>.
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSplitStock(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition"
                >
                  Confirmer et exécuter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : Supprimer une action */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                Supprimer du catalogue
              </h3>
              <button onClick={() => setDeleteCandidate(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement l'action{' '}
              <strong className="text-white">{deleteCandidate.name}</strong> (#{deleteCandidate.codesico}) ?
            </p>

            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-300 text-[11px]">
              ⚠️ Remarque : Cette opération sera bloquée par mesure de sécurité si des joueurs possèdent actuellement cette action en portefeuille ou ont des ordres d'achat/vente actifs.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition text-xs"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : Confirmation Archivage Unique */}
      {archiveCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-400" />
                Archiver l'action {archiveCandidate.name}
              </h3>
              <button
                disabled={isProcessingArchive}
                onClick={() => setArchiveCandidate(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Vous êtes sur le point d'archiver <strong className="text-white">{archiveCandidate.name}</strong> ({archiveCandidate.ticker}, #{archiveCandidate.codesico}).
              </p>

              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl space-y-2 text-amber-200/90">
                <div className="font-semibold text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Règles d'archivage & liquidation automatique :
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>
                    <strong>Liquidation des portefeuilles :</strong> toute position ouverte (acheteur ou VAD) détenue par un joueur sur ce titre sera <strong>automatiquement débouclée/vendue au dernier cours connu ({archiveCandidate.price.toFixed(2)} €)</strong>.
                  </li>
                  <li>
                    <strong>Crédit cashback :</strong> le montant des ventes net de taxes sera immédiatement crédité sur le compte espèces des joueurs.
                  </li>
                  <li>
                    <strong>Annulation des ordres :</strong> tous les ordres d'achat ou de vente en attente sur cette action seront annulés.
                  </li>
                  <li>
                    <strong>Scraper & Achats :</strong> la synchronisation Yahoo et les achats seront coupés.
                  </li>
                  <li>
                    <strong>Visibilité :</strong> l'action ne sera plus visible par les joueurs et sera masquée par défaut pour l'admin (retrouvable via le filtre "Archivées").
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isProcessingArchive}
                onClick={() => setArchiveCandidate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isProcessingArchive}
                onClick={handleArchiveSingleConfirm}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition text-xs flex items-center gap-1.5"
              >
                {isProcessingArchive ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Archivage en cours...
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    Confirmer l'archivage & la vente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : Confirmation Archivage Groupé */}
      {archiveBulkCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Archive className="w-5 h-5 text-rose-400" />
                Archiver {archiveBulkCandidate.codes.length} actions en lot
              </h3>
              <button
                disabled={isProcessingArchive}
                onClick={() => setArchiveBulkCandidate(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Vous avez sélectionné <strong className="text-white">{archiveBulkCandidate.codes.length} action(s)</strong> pour archivage :
              </p>

              <div className="max-h-28 overflow-y-auto bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                {archiveBulkCandidate.names.map((nom, idx) => (
                  <div key={idx} className="truncate">• {nom}</div>
                ))}
              </div>

              <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl space-y-2 text-rose-200/90">
                <div className="font-semibold text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Conséquences irréversibles sur les portefeuilles joueurs :
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>
                    Toutes les positions détenues par des joueurs sur ces {archiveBulkCandidate.codes.length} actions seront <strong>automatiquement liquidées / vendues à leur dernier cours connu</strong>.
                  </li>
                  <li>
                    Le cashback correspondant sera versé aux comptes joueurs.
                  </li>
                  <li>
                    Les ordres en attente seront annulés et les actions deviendront invisibles des utilisateurs et du scraper.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isProcessingArchive}
                onClick={() => setArchiveBulkCandidate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isProcessingArchive}
                onClick={handleArchiveBulkConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl transition text-xs flex items-center gap-1.5"
              >
                {isProcessingArchive ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Traitement du lot en cours...
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    Liquider & Archiver {archiveBulkCandidate.codes.length} actions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : Bilan / Rapport après archivage */}
      {archiveResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Archivage terminé
              </h3>
              <button onClick={() => setArchiveResultModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                {archiveResultModal.archivedCount !== undefined ? (
                  <>
                    L'opération d'archivage groupé a traité avec succès{' '}
                    <strong className="text-white">{archiveResultModal.archivedCount} action(s)</strong>.
                  </>
                ) : (
                  <>
                    L'action <strong className="text-white">{archiveResultModal.name}</strong> (#{archiveResultModal.codesico}) a été archivée avec succès.
                  </>
                )}
              </p>

              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Rapport de liquidation des portefeuilles
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-700/60">
                  <span className="text-slate-400">Positions joueurs fermées / vendues :</span>
                  <strong className="text-white font-mono">
                    {archiveResultModal.totalPositionsClosed ?? archiveResultModal.positionsClosed ?? 0}
                  </strong>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Total liquidités créditées (Cashback) :</span>
                  <strong className="text-emerald-400 font-mono font-bold">
                    {(archiveResultModal.totalCashCredited ?? 0).toFixed(2)} €
                  </strong>
                </div>
              </div>

              {archiveResultModal.errors && archiveResultModal.errors.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-300 text-[11px] space-y-1">
                  <div className="font-semibold text-rose-400">Avertissements :</div>
                  {archiveResultModal.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setArchiveResultModal(null)}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
