import React from 'react';
import { Order } from '../../types';
import { X, Trash2, Clock, Pencil, AlertTriangle } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface PendingOrdersTableProps {
  orders: Order[];
  onCancelOrder: (id: string) => void;
  onCancelAllOrders: () => void;
  onEditOrder?: (order: Order) => void;
}

export const PendingOrdersTable: React.FC<PendingOrdersTableProps> = ({
  orders,
  onCancelOrder,
  onCancelAllOrders,
  onEditOrder,
}) => {
  if (orders.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-sm">
        Aucun ordre en attente d'exécution pour le moment.
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const expiredCount = orders.filter((o) => o.tempsLimite > 0 && o.tempsLimite < now).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/60 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-bold text-white">Carnet d'Ordres en Cours ({orders.length})</h4>
          {expiredCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              {expiredCount} expiré{expiredCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Tooltip content="Annuler tous les ordres en attente d'un coup">
          <button
            onClick={onCancelAllOrders}
            className="text-xs px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 flex items-center gap-1 transition"
          >
            <Trash2 className="w-3 h-3" />
            Tout annuler
          </button>
        </Tooltip>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/40 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Titre</th>
              <th className="px-5 py-3 text-right">Quantité</th>
              <th className="px-5 py-3 text-right">Cours Actuel</th>
              <th className="px-5 py-3 text-right">Seuils Min / Max</th>
              <th className="px-5 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {orders.map((ord) => {
              const isBuy = ord.sens === 'A' || ord.sens === 'achat';
              const isExpired = ord.tempsLimite > 0 && ord.tempsLimite < now;
              const formattedExpiry = ord.tempsLimite > 0
                ? new Date(ord.tempsLimite * 1000).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;

              return (
                <tr
                  key={ord.id}
                  className={`transition ${
                    isExpired
                      ? 'bg-amber-950/10 hover:bg-amber-950/20 text-slate-400'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <td className="px-5 py-3 font-sans">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          isBuy
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isBuy ? 'ACHAT' : 'VENTE'}
                      </span>
                      {isExpired && (
                        <Tooltip content={`Cet ordre a expiré le ${formattedExpiry}. Il ne sera plus exécuté par le marché.`}>
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            Expiré
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-sans">
                    <div
                      className={`font-medium ${
                        isExpired
                          ? 'line-through text-slate-400 decoration-slate-500 decoration-2'
                          : 'text-white'
                      }`}
                    >
                      {ord.name || `Titre #${ord.code}`}
                    </div>
                    {isExpired && formattedExpiry ? (
                      <div className="text-[11px] text-amber-400/80 font-mono no-underline">
                        Expiré le {formattedExpiry}
                      </div>
                    ) : formattedExpiry ? (
                      <div className="text-[11px] text-slate-500 font-mono">
                        Valide jusqu'au {formattedExpiry}
                      </div>
                    ) : null}
                  </td>
                  <td
                    className={`px-5 py-3 text-right ${
                      isExpired
                        ? 'line-through text-slate-500 decoration-slate-600 decoration-1'
                        : 'text-slate-300'
                    }`}
                  >
                    {ord.quantity}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    {ord.currentValue ? `${ord.currentValue.toFixed(2)} €` : '—'}
                  </td>
                  <td
                    className={`px-5 py-3 text-right ${
                      isExpired
                        ? 'line-through text-slate-500 decoration-slate-600 decoration-1'
                        : 'text-slate-400'
                    }`}
                  >
                    {ord.valmin > 0 && ord.valmax > 0
                      ? `${ord.valmin.toFixed(2)} € - ${ord.valmax.toFixed(2)} €`
                      : ord.valmax > 0
                      ? `≤ ${ord.valmax.toFixed(2)} €`
                      : ord.valmin > 0
                      ? `≥ ${ord.valmin.toFixed(2)} €`
                      : 'Au marché'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {onEditOrder && (
                        <Tooltip content={isExpired ? "Reprogrammer / Modifier cet ordre expiré" : "Modifier cet ordre"}>
                          <button
                            onClick={() => onEditOrder(ord)}
                            className={`p-1 rounded-lg transition ${
                              isExpired
                                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                                : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                            }`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip content={isExpired ? "Supprimer cet ordre expiré" : "Annuler cet ordre en attente"}>
                        <button
                          onClick={() => onCancelOrder(ord.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

