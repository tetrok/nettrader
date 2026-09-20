import React, { useEffect, useState } from 'react';
import { tradingApi } from '../api/trading';
import { Portfolio, Order, Position, Stock } from '../types';
import { PositionsTable } from '../components/trading/PositionsTable';
import { PendingOrdersTable } from '../components/trading/PendingOrdersTable';
import { OrderModal } from '../components/trading/OrderModal';
import {
  Wallet,
  PieChart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  RefreshCw,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export const PortfolioPage: React.FC = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Order modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStockForOrder, setSelectedStockForOrder] = useState<Stock | null>(null);
  const [selectedSens, setSelectedSens] = useState<'achat' | 'vente'>('achat');

  const loadData = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [p, o] = await Promise.all([
        tradingApi.getPortfolio(),
        tradingApi.getOrders(),
      ]);
      setPortfolio(p);
      setOrders(o);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(true), 15000); // 15s live refresh
    return () => clearInterval(timer);
  }, []);

  const handleOpenBuy = () => {
    setSelectedSens('achat');
    setSelectedStockForOrder(null);
    setModalOpen(true);
  };

  const handleSellPosition = (pos: Position) => {
    setSelectedSens('vente');
    setSelectedStockForOrder({
      code: pos.code,
      ticker: '',
      name: pos.name,
      price: pos.currentPrice,
      prevPrice: pos.buyPrice,
      variation: pos.gainLossPercent,
      authBuy: true,
      lastTime: 0,
    });
    setModalOpen(true);
  };

  const handleCancelOrder = async (id: string) => {
    try {
      await tradingApi.cancelOrder(id);
      loadData(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancelAllOrders = async () => {
    if (confirm("Confirmez-vous l'annulation de tous vos ordres en attente ?")) {
      try {
        await tradingApi.cancelAllOrders();
        loadData(true);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const isGain = (portfolio?.totalPerformance ?? 0) >= 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Mon Portefeuille Boursier</h1>
          <p className="text-xs text-slate-400 mt-1">
            Mise à jour en temps réel des cotations, positions et valorisations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(false)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={handleOpenBuy}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Passer un Ordre</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Capital Total */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Capital Total</span>
            <PieChart className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {portfolio?.totalCapital.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <div className="text-xs text-slate-400">
            Capital initial : {portfolio?.initialCapital.toLocaleString('fr-FR')} €
          </div>
        </div>

        {/* Liquidités (Cashback) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Liquidités Disponibles</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {portfolio?.cashback.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <div className="text-xs text-slate-400">
            Prêt à investir immédiatement
          </div>
        </div>

        {/* Valeur des Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Valeur des Positions</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-200">
            {portfolio?.totalPositionsValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <div className="text-xs text-slate-400">
            {portfolio?.positions.length} ligne(s) active(s)
          </div>
        </div>

        {/* Plus / Moins-Value Globale */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Performance Globale</span>
            {isGain ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
          </div>
          <div className={`text-2xl font-bold font-mono ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isGain ? '+' : ''}{portfolio?.totalPerformance.toFixed(2)} €
          </div>
          <div className={`text-xs font-semibold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isGain ? '+' : ''}{portfolio?.totalPerformancePercent.toFixed(2)}% depuis le début
          </div>
        </div>
      </div>

      {/* Positions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Positions Actives</h3>
        </div>
        <PositionsTable
          positions={portfolio?.positions || []}
          onSellPosition={handleSellPosition}
        />
      </div>

      {/* Pending Orders Section */}
      <div className="space-y-4 pt-4">
        <PendingOrdersTable
          orders={orders}
          onCancelOrder={handleCancelOrder}
          onCancelAllOrders={handleCancelAllOrders}
        />
      </div>

      {/* Order Placement Modal */}
      <OrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialSens={selectedSens}
        initialStock={selectedStockForOrder}
        onOrderCompleted={() => loadData(true)}
      />
    </div>
  );
};
