import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { marketApi } from '../api/market';
import { tradingApi } from '../api/trading';
import { StockDetail, SimulationResult } from '../types';
import { StockChart } from '../components/market/StockChart';
import { OrderModal } from '../components/trading/OrderModal';
import { Tooltip } from '../components/ui/Tooltip';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, ShoppingCart, RefreshCw, Calendar, Tag } from 'lucide-react';

export const StockDetailPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Order modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSens, setModalSens] = useState<'achat' | 'vente'>('achat');

  useEffect(() => {
    if (code) {
      const stockCode = parseInt(code, 10);
      marketApi
        .getStock(stockCode)
        .then(setStock)
        .finally(() => setLoading(false));

      if (user) {
        tradingApi
          .simulate(stockCode, 1)
          .then(setSimulation)
          .catch(() => {});
      }
    }
  }, [code, user]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-white">Action introuvable</h2>
        <Link to="/market" className="text-sm text-emerald-400 hover:underline">
          &larr; Retour aux cotations
        </Link>
      </div>
    );
  }

  const isGain = stock.variation >= 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <Link
        to="/market"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à la liste des cotations
      </Link>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{stock.name}</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {stock.ticker}
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span>Code Sicovam : #{stock.code}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Dernière cotation : {stock.lastTime ? new Date(stock.lastTime * 1000).toLocaleString('fr-FR') : '—'}
            </span>
          </div>
        </div>

        {/* Price and Variation */}
        <div className="flex items-center gap-6">
          <div className="text-right font-mono">
            <div className="text-3xl font-extrabold text-white">{stock.price.toFixed(2)} €</div>
            <div className={`text-sm font-bold flex items-center justify-end ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isGain ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {isGain ? '+' : ''}{stock.variation.toFixed(2)}%
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <Tooltip
                content={
                  simulation
                    ? simulation.availableCash < stock.price
                      ? `Liquidités insuffisantes (${simulation.availableCash.toFixed(2)} € disponible(s))`
                      : `Acheter des actions (max possible : ${simulation.maxBuyable})`
                    : "Passer un ordre d'achat"
                }
              >
                <button
                  onClick={() => {
                    setModalSens('achat');
                    setModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 transition"
                >
                  Acheter
                </button>
              </Tooltip>

              <Tooltip
                content={
                  simulation
                    ? simulation.ownedQuantity <= 0 && !simulation.canVad
                      ? "Vous ne possédez aucune action sur ce titre et la VAD n'est pas autorisée à votre niveau."
                      : simulation.availableSellQuantity <= 0 && !simulation.canVad
                      ? `Toutes vos actions (${simulation.ownedQuantity}) sont déjà engagées dans des ordres en attente.`
                      : simulation.pendingSellQuantity > 0
                      ? `Vendre vos actions (${simulation.availableSellQuantity} disponible(s), ${simulation.pendingSellQuantity} en attente)`
                      : `Vendre vos actions (${simulation.ownedQuantity} en portefeuille)`
                    : "Passer un ordre de vente"
                }
              >
                <button
                  onClick={() => {
                    setModalSens('vente');
                    setModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-md shadow-rose-500/20 transition"
                >
                  Vendre
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {/* Historical Interactive Chart */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white">Historique et Évolution des Cours</h3>
        <StockChart history={stock.history} currentPrice={stock.price} />
      </div>

      {/* Modal */}
      <OrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialStock={stock}
        initialSens={modalSens}
      />
    </div>
  );
};
