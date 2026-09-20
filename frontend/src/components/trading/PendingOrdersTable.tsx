import React from 'react';
import { Order } from '../../types';
import { X, Trash2, Clock } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface PendingOrdersTableProps {
  orders: Order[];
  onCancelOrder: (id: string) => void;
  onCancelAllOrders: () => void;
}

export const PendingOrdersTable: React.FC<PendingOrdersTableProps> = ({
  orders,
  onCancelOrder,
  onCancelAllOrders,
}) => {
  if (orders.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-sm">
        Aucun ordre en attente d'exécution pour le moment.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/60 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-bold text-white">Carnet d'Ordres en Cours ({orders.length})</h4>
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
              return (
                <tr key={ord.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-3 font-sans">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isBuy ? 'ACHAT' : 'VENTE'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-sans text-white font-medium">{ord.name || `Titre #${ord.code}`}</td>
                  <td className="px-5 py-3 text-right text-slate-300">{ord.quantity}</td>
                  <td className="px-5 py-3 text-right text-slate-300">{ord.currentValue ? `${ord.currentValue.toFixed(2)} €` : '—'}</td>
                  <td className="px-5 py-3 text-right text-slate-400">
                    {ord.valmin > 0 || ord.valmax > 0 ? `${ord.valmin.toFixed(2)} € - ${ord.valmax.toFixed(2)} €` : 'Au marché'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Tooltip content="Annuler cet ordre en attente">
                      <button
                        onClick={() => onCancelOrder(ord.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </Tooltip>
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
