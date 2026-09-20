import React, { useEffect, useState } from 'react';
import { tradingApi } from '../api/trading';
import { HistoryItem } from '../types';
import { History, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadHistory = async (p: number) => {
    setLoading(true);
    try {
      const res = await tradingApi.getHistory(p, 20);
      setItems(res.items);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(page);
  }, [page]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Historique des Transactions</h1>
          <p className="text-xs text-slate-400 mt-1">
            Journal complet de vos ordres exécutés ({total} transactions au total)
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Date & Heure</th>
                <th className="px-5 py-3.5">Sens</th>
                <th className="px-5 py-3.5">Titre</th>
                <th className="px-5 py-3.5 text-right">Quantité</th>
                <th className="px-5 py-3.5 text-right">Montant Brut</th>
                <th className="px-5 py-3.5 text-right">Taxes & Frais</th>
                <th className="px-5 py-3.5 text-right">Total Net (TTC)</th>
                <th className="px-5 py-3.5 text-right">Profit Réalisé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    Chargement de l'historique...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucune transaction enregistrée dans votre historique.
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => {
                  const isBuy = it.sens.toLowerCase().includes('achat');
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {it.date ? new Date(it.date * 1000).toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="px-5 py-3.5 font-sans">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {it.sens}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-sans text-white font-medium">{it.name}</td>
                      <td className="px-5 py-3.5 text-right text-slate-300">{it.quantity}</td>
                      <td className="px-5 py-3.5 text-right text-slate-400">{it.totalExclTax.toFixed(2)} €</td>
                      <td className="px-5 py-3.5 text-right text-amber-400">{it.tax.toFixed(2)} €</td>
                      <td className="px-5 py-3.5 text-right font-bold text-white">{it.totalInclTax.toFixed(2)} €</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-200">{it.profit}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40 text-xs">
            <span className="text-slate-400">
              Page {page} sur {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
