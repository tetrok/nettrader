import React, { useEffect, useState } from 'react';
import { marketApi } from '../api/market';
import { Stock } from '../types';
import { OrderModal } from '../components/trading/OrderModal';
import { Tooltip } from '../components/ui/Tooltip';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

export const MarketPage: React.FC = () => {
  const { user } = useAuth();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'price' | 'variation'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Order modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  const loadStocks = async () => {
    try {
      const data = await marketApi.getStocks(search);
      setStocks(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStocks();
  }, [search]);

  const handleOrder = (stock: Stock) => {
    setSelectedStock(stock);
    setModalOpen(true);
  };

  const handleSort = (field: 'name' | 'price' | 'variation') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'variation' ? 'desc' : 'asc');
    }
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    let result = 0;
    if (sortField === 'name') result = a.name.localeCompare(b.name);
    if (sortField === 'price') result = a.price - b.price;
    if (sortField === 'variation') result = a.variation - b.variation;
    return sortOrder === 'asc' ? result : -result;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Cotations & Marché</h1>
          <p className="text-xs text-slate-400 mt-1">
            Consultez les 290+ valeurs cotées, suivez leurs variations et négociez en direct
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une action ou ticker..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Stocks Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="px-5 py-3.5 cursor-pointer hover:text-white transition"
                >
                  Titre Boursier
                </th>
                <th className="px-5 py-3.5">Symbole</th>
                <th
                  onClick={() => handleSort('price')}
                  className="px-5 py-3.5 text-right cursor-pointer hover:text-white transition"
                >
                  Dernier Cours
                </th>
                <th
                  onClick={() => handleSort('variation')}
                  className="px-5 py-3.5 text-right cursor-pointer hover:text-white transition"
                >
                  Variation Jour
                </th>
                <th className="px-5 py-3.5 text-center">Négocier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    Chargement des cotations...
                  </td>
                </tr>
              ) : sortedStocks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Aucun titre ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                sortedStocks.map((s) => {
                  const isGain = s.variation >= 0;
                  return (
                    <tr key={s.code} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4 font-sans font-medium text-white">
                        <Link to={`/stocks/${s.code}`} className="hover:text-emerald-400 transition">
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-mono text-xs">{s.ticker}</td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-100">
                        {s.price.toFixed(2)} €
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-semibold flex items-center justify-end gap-0.5 ${
                          isGain ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isGain ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        <span>
                          {isGain ? '+' : ''}
                          {s.variation.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {user ? (
                          <Tooltip
                            content={
                              !s.authBuy
                                ? "La négociation de ce titre est actuellement suspendue"
                                : `Négocier ${s.name} (${s.price.toFixed(2)} €)`
                            }
                          >
                            <button
                              onClick={() => handleOrder(s)}
                              disabled={!s.authBuy}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Trader
                            </button>
                          </Tooltip>
                        ) : (
                          <Link
                            to="/login"
                            className="px-3 py-1 text-xs font-medium text-slate-400 hover:text-white"
                          >
                            Connexion
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Modal */}
      <OrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialStock={selectedStock}
        initialSens="achat"
      />
    </div>
  );
};
