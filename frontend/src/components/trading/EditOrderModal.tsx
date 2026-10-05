import React, { useState, useEffect } from 'react';
import { Order, SimulationResult } from '../../types';
import { tradingApi } from '../../api/trading';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';

interface EditOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onOrderUpdated,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [orderType, setOrderType] = useState<'marche' | 'seuil'>('marche');
  const [valMin, setValMin] = useState<string>('0');
  const [valMax, setValMax] = useState<string>('0');
  const [validity, setValidity] = useState<number>(1);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      setQuantity(order.quantity || 1);
      const hasThreshold = (order.valmin > 0) || (order.valmax > 0);
      setOrderType(hasThreshold ? 'seuil' : 'marche');
      setValMin(order.valmin > 0 ? String(order.valmin) : '0');
      setValMax(order.valmax > 0 ? String(order.valmax) : '0');
      
      // Calculate remaining days if tempsLimite is a timestamp
      if (order.tempsLimite && order.tempsLimite > 365) {
        const remainingSeconds = order.tempsLimite - Math.floor(Date.now() / 1000);
        const days = Math.max(1, Math.ceil(remainingSeconds / 86400));
        setValidity(Math.min(days, 30));
      } else if (order.tempsLimite) {
        setValidity(order.tempsLimite);
      } else {
        setValidity(1);
      }
      setFeedback(null);

      // Load simulation for stock code to obtain exact user player level capabilities (canThreshold, canRange)
      if (order.code) {
        tradingApi.simulate(order.code, order.quantity || 1).then((sim) => {
          setSimulation(sim);
        }).catch(() => {});
      }
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const isBuy = order.sens === 'A' || order.sens === 'achat';
  const canUseThreshold = simulation ? simulation.canThreshold : true;
  const canUseRange = simulation ? simulation.canRange : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (quantity <= 0) {
      setFeedback({ type: 'error', message: 'La quantité doit être supérieure à zéro.' });
      return;
    }

    const minNum = orderType === 'seuil' ? parseFloat(valMin.replace(',', '.')) || 0 : 0;
    const maxNum = orderType === 'seuil' ? parseFloat(valMax.replace(',', '.')) || 0 : 0;

    if (orderType === 'seuil') {
      if (minNum < 0 || maxNum < 0) {
        setFeedback({ type: 'error', message: 'Les seuils de cours ne peuvent pas être négatifs.' });
        return;
      }
      if (minNum > 0 && maxNum > 0 && minNum > maxNum) {
        setFeedback({ type: 'error', message: 'Le cours minimum ne peut pas dépasser le cours maximum.' });
        return;
      }
      if (minNum > 0 && maxNum > 0 && !canUseRange) {
        setFeedback({ type: 'error', message: 'Votre niveau actuel ne permet pas de définir une plage de cours (min et max).' });
        return;
      }
      if ((minNum > 0 || maxNum > 0) && !canUseThreshold) {
        setFeedback({ type: 'error', message: 'Votre niveau actuel ne permet pas de placer des ordres à seuil.' });
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await tradingApi.updateOrder(order.id, {
        quantity,
        valmin: minNum,
        valmax: maxNum,
        validity,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Ordre modifié avec succès !',
      });

      setTimeout(() => {
        onOrderUpdated();
        onClose();
      }, 1000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erreur lors de la modification de l’ordre.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Modifier l'ordre #{order.id}</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  isBuy
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isBuy ? 'Achat' : 'Vente'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {order.name || `Titre #${order.code}`} &bull; Cours actuel : {order.currentValue ? `${order.currentValue.toFixed(2)} €` : '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Feedback Message */}
          {feedback && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{feedback.message}</div>
            </div>
          )}

          {/* Quantité */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Quantité de titres</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Type d'ordre */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Type d'ordre</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setOrderType('marche');
                  setValMin('0');
                  setValMax('0');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                  orderType === 'marche'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Au marché
              </button>
              <button
                type="button"
                disabled={!canUseThreshold}
                onClick={() => setOrderType('seuil')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                  orderType === 'seuil'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : !canUseThreshold
                    ? 'bg-slate-950/50 border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                À seuil / Plage
                {!canUseThreshold && (
                  <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1 rounded">Verrouillé</span>
                )}
              </button>
            </div>
          </div>

          {/* Seuils si activés */}
          {orderType === 'seuil' && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
              <div className="text-xs text-slate-400">
                Définissez les seuils d'exécution en euros. Laissez à 0 si non applicable.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Cours Minimum (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valMin}
                    onChange={(e) => setValMin(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Cours Maximum (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valMax}
                    onChange={(e) => setValMax(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {!canUseRange && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Votre niveau permet un seul seuil (min OU max, pas les deux).</span>
                </div>
              )}
            </div>
          )}

          {/* Validité */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Validité de l'ordre</label>
            <select
              value={validity}
              onChange={(e) => setValidity(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
            >
              <option value={1}>1 jour (Révocation en fin de séance)</option>
              <option value={2}>2 jours</option>
              <option value={3}>3 jours</option>
              <option value={5}>5 jours</option>
              <option value={7}>1 semaine</option>
              <option value={15}>15 jours</option>
              <option value={30}>1 mois (Maximum)</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>Enregistrer les modifications</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
