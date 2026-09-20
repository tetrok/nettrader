import React, { useState, useEffect } from 'react';
import { Stock, SimulationResult } from '../../types';
import { tradingApi } from '../../api/trading';
import { marketApi } from '../../api/market';
import { X, ArrowDownRight, ArrowUpRight, Calculator, CheckCircle2, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStock?: Stock | null;
  initialSens?: 'achat' | 'vente';
  onOrderCompleted?: () => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  initialStock,
  initialSens = 'achat',
  onOrderCompleted,
}) => {
  const [sens, setSens] = useState<'achat' | 'vente'>(initialSens);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStockCode, setSelectedStockCode] = useState<number>(initialStock ? initialStock.code : 0);
  const [quantity, setQuantity] = useState<number>(1);
  const [orderType, setOrderType] = useState<'marche' | 'seuil'>('marche');
  const [valMin, setValMin] = useState<string>('0');
  const [valMax, setValMax] = useState<string>('0');
  const [validity, setValidity] = useState<number>(1);

  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (initialStock) {
      setSelectedStockCode(initialStock.code);
    }
    setSens(initialSens);
  }, [initialStock, initialSens, isOpen]);

  // Load stocks list
  useEffect(() => {
    if (isOpen && stocks.length === 0) {
      marketApi.getStocks().then((data) => {
        setStocks(data);
        if (!selectedStockCode && data.length > 0) {
          setSelectedStockCode(data[0].code);
        }
      });
    }
  }, [isOpen]);

  // Run simulation whenever selected stock or quantity changes
  useEffect(() => {
    if (!selectedStockCode || quantity <= 0) return;

    let cancel = false;
    setSimLoading(true);
    tradingApi
      .simulate(selectedStockCode, quantity)
      .then((res) => {
        if (!cancel) setSimulation(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setSimLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [selectedStockCode, quantity]);

  if (!isOpen) return null;

  const currentStock = stocks.find((s) => s.code === selectedStockCode) || initialStock;

  const handleSetMax = () => {
    if (!simulation) return;
    if (sens === 'achat') {
      setQuantity(Math.max(1, simulation.maxBuyable));
    } else {
      if (simulation.availableSellQuantity > 0) {
        setQuantity(simulation.availableSellQuantity);
      } else if (simulation.ownedQuantity > 0) {
        setQuantity(simulation.ownedQuantity);
      } else if (simulation.canVad && simulation.maxVad > 0 && simulation.stockPrice > 0) {
        setQuantity(Math.max(1, Math.floor(simulation.maxVad / simulation.stockPrice)));
      }
    }
  };

  const getValidationIssue = (): string | null => {
    if (quantity <= 0) {
      return "La quantité d'actions doit être strictement supérieure à 0.";
    }

    if (!simulation) {
      return null;
    }

    if (sens === 'achat') {
      if (simulation.availableCash < simulation.total) {
        return `Liquidités insuffisantes : total estimé à ${simulation.total.toFixed(2)} €, solde disponible ${simulation.availableCash.toFixed(2)} € (maximum achetable : ${simulation.maxBuyable} action${simulation.maxBuyable > 1 ? 's' : ''}).`;
      }
    }

    if (sens === 'vente') {
      const owned = simulation.ownedQuantity;
      const available = simulation.availableSellQuantity;
      const pending = simulation.pendingSellQuantity;
      const canVad = simulation.canVad;

      if (owned <= 0 && !canVad) {
        return "Vous ne possédez aucune action sur ce titre et la vente à découvert (VAD) n'est pas autorisée pour votre niveau de joueur.";
      }

      if (owned > 0 && !canVad && quantity > available) {
        if (available <= 0) {
          return `Toutes vos actions (${owned}) sont déjà engagées dans des ordres de vente en attente d'exécution.`;
        }
        return `Quantité demandée (${quantity}) supérieure à votre disponible (${available} action${available > 1 ? 's' : ''}${pending > 0 ? `, ${pending} déjà engagée${pending > 1 ? 's' : ''} en attente` : ''}).`;
      }

      if (canVad) {
        const vadNeeded = Math.max(0, quantity - owned);
        const vadAmount = vadNeeded * simulation.stockPrice;
        if (vadAmount > simulation.maxVad) {
          return `Dépassement du plafond de VAD autorisé : montant requis de ${vadAmount.toFixed(2)} €, plafond disponible de ${simulation.maxVad.toFixed(2)} €.`;
        }
      }
    }

    if (orderType === 'seuil') {
      const min = parseFloat(valMin) || 0;
      const max = parseFloat(valMax) || 0;

      if (!simulation.canThreshold) {
        return "Les ordres à cours limité ne sont pas autorisés pour votre niveau de joueur.";
      }

      if (min > 0 && max > 0 && !simulation.canRange) {
        return "Les ordres à plage de cours (cours min + cours max) nécessitent le niveau Initié ou Expert.";
      }

      if (min > 0 && max > 0 && min > max) {
        return "Le seuil minimum ne peut pas être supérieur au seuil maximum.";
      }

      if (min <= 0 && max <= 0) {
        return "Veuillez renseigner au moins un seuil de cours (min ou max) pour un ordre à cours limité.";
      }
    }

    return null;
  };

  const validationIssue = getValidationIssue();
  const canSubmit = !submitting && !simLoading && !validationIssue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockCode || quantity <= 0 || validationIssue) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await tradingApi.placeOrder({
        sens,
        codesicav: selectedStockCode,
        quantity,
        valmin: orderType === 'seuil' ? parseFloat(valMin) || 0 : 0,
        valmax: orderType === 'seuil' ? parseFloat(valMax) || 0 : 0,
        validity,
        select: '1',
      });

      setFeedback({ type: 'success', message: res.message || "Ordre passé avec succès !" });
      if (onOrderCompleted) onOrderCompleted();
      setTimeout(() => {
        onClose();
        setFeedback(null);
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || "Erreur lors du passage de l'ordre" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Ticket d'Ordre de Bourse</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Sens Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSens('achat')}
              className={`py-2 text-sm font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                sens === 'achat'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              Acheter (Ordre d'achat)
            </button>
            <Tooltip
              content={
                simulation && simulation.ownedQuantity <= 0 && !simulation.canVad
                  ? "Vous ne possédez aucune action sur ce titre et la vente à découvert (VAD) n'est pas autorisée à votre niveau."
                  : simulation && simulation.availableSellQuantity <= 0 && !simulation.canVad
                  ? `Toutes vos actions (${simulation.ownedQuantity}) sont déjà engagées dans des ordres en attente.`
                  : undefined
              }
              className="w-full"
            >
              <button
                type="button"
                onClick={() => setSens('vente')}
                className={`w-full py-2 text-sm font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  sens === 'vente'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Vendre / VAD
              </button>
            </Tooltip>
          </div>

          {/* Stock Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Titre Boursier</label>
            <select
              value={selectedStockCode}
              onChange={(e) => setSelectedStockCode(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            >
              {stocks.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.ticker}) — {s.price.toFixed(2)} €
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Max Helper */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400">Quantité d'actions</label>
              <Tooltip
                content={
                  sens === 'achat'
                    ? `Quantité maximale achetable selon vos liquidités disponibles (${simulation ? simulation.availableCash.toFixed(2) + ' €' : '...'})`
                    : simulation?.canVad
                    ? `Quantité maximale vendable (${simulation.ownedQuantity} en portefeuille + VAD autorisée jusqu'à ${simulation.maxVad.toFixed(2)} €)`
                    : simulation?.pendingSellQuantity && simulation.pendingSellQuantity > 0
                    ? `${simulation.availableSellQuantity} disponible(s) (${simulation.pendingSellQuantity} déjà engagée(s) en attente)`
                    : `Quantité totale possédée en portefeuille (${simulation?.ownedQuantity ?? 0})`
                }
              >
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition flex items-center gap-1"
                >
                  Max possible : {sens === 'achat' ? simulation?.maxBuyable ?? '...' : (simulation?.availableSellQuantity ?? simulation?.ownedQuantity ?? '...')}
                </button>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 transition"
              />
              <div className="flex gap-1">
                {[1, 5, 10, 50].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setQuantity((prev) => prev + step)}
                    className="px-2.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                  >
                    +{step}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Order Type (Au marché ou Seuil) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Type d'ordre</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderType('marche')}
                className={`px-3 py-2 text-xs font-medium rounded-xl border transition ${
                  orderType === 'marche'
                    ? 'bg-slate-800 border-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Au marché (Immédiat)
              </button>
              <Tooltip
                content={
                  simulation && !simulation.canThreshold
                    ? "Les ordres à cours limité / seuil nécessitent un niveau de joueur plus élevé (Initié ou Expert)."
                    : undefined
                }
                className="w-full"
              >
                <button
                  type="button"
                  onClick={() => setOrderType('seuil')}
                  disabled={simulation ? !simulation.canThreshold : false}
                  className={`w-full px-3 py-2 text-xs font-medium rounded-xl border transition ${
                    orderType === 'seuil'
                      ? 'bg-slate-800 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  À cours limité / Seuil
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Threshold Inputs */}
          {orderType === 'seuil' && (
            <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Seuil Min (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valMin}
                    onChange={(e) => setValMin(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Seuil Max (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valMax}
                    onChange={(e) => setValMax(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {simulation && !simulation.canRange && (
                <p className="text-[11px] text-amber-400/90 leading-tight">
                  ℹ️ Votre niveau autorise un seuil unique (min ou max). La plage (min ET max) requiert le niveau Initié ou Expert.
                </p>
              )}
            </div>
          )}

          {/* Estimation & Fees Summary Card */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Cours unitaire :</span>
              <span className="font-mono text-slate-200">
                {currentStock ? `${currentStock.price.toFixed(2)} €` : '...'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Montant brut :</span>
              <span className="font-mono text-slate-200">
                {currentStock ? `${(currentStock.price * quantity).toFixed(2)} €` : '...'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Frais de courtage & taxes :</span>
              <span className="font-mono text-amber-400">
                {simLoading ? 'calcul...' : simulation ? `${simulation.tax.toFixed(2)} €` : '...'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between font-semibold text-sm">
              <span className="text-white">Total estimé :</span>
              <span className="font-mono text-emerald-400">
                {simLoading ? 'calcul...' : simulation ? `${simulation.total.toFixed(2)} €` : '...'}
              </span>
            </div>
          </div>

          {/* Validation issue alert box */}
          {validationIssue && (
            <div className="p-3 rounded-xl text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="leading-relaxed">
                <strong className="font-semibold block mb-0.5">Opération non autorisée :</strong>
                {validationIssue}
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Annuler
            </button>
            <Tooltip
              content={
                validationIssue ||
                (sens === 'achat' ? "Confirmer et transmettre l'ordre d'achat" : "Confirmer et transmettre l'ordre de vente")
              }
              className="flex-1"
            >
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                  sens === 'achat'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{sens === 'achat' ? "Confirmer l'Achat" : "Confirmer la Vente"}</span>
              </button>
            </Tooltip>
          </div>
        </form>
      </div>
    </div>
  );
};
