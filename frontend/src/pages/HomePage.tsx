import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { marketApi } from '../api/market';
import { MarketSummary, Stock } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  Newspaper,
  Layers,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketApi
      .getSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-8 sm:p-12">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Simulation boursière temps réel — Portefeuille de 10 000 € offert
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Prenez les rênes de la Bourse, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">
              sans risquer un centime.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            Achetez, vendez et spéculez sur plus de 160 véritables titres cotés avec seulement 15 minutes de différé. 
            Développez vos stratégies, testez la vente à découvert (VAD) et hissez-vous au sommet du classement !
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            {user ? (
              <Link
                to="/portfolio"
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Accéder à mon Portefeuille</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <span>Rejoindre la Simulation</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/market"
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition border border-slate-700"
                >
                  Voir les cotations
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Background decorative gradient */}
        <div className="absolute right-0 top-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Market Mover Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Plus Fortes Hausses</h3>
            </div>
            <Link to="/market" className="text-xs text-slate-400 hover:text-emerald-400 transition">
              Tout voir &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60">
            {summary?.topGainers.map((s: Stock) => (
              <Link
                key={s.code}
                to={`/stocks/${s.code}`}
                className="py-3 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-lg transition"
              >
                <div>
                  <div className="font-semibold text-white text-sm">{s.name}</div>
                  <div className="text-xs font-mono text-slate-400">{s.ticker}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-semibold text-slate-200">{s.price.toFixed(2)} €</div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center justify-end">
                    <ArrowUpRight className="w-3.5 h-3.5" />+{s.variation.toFixed(2)}%
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Plus Fortes Baisses</h3>
            </div>
            <Link to="/market" className="text-xs text-slate-400 hover:text-rose-400 transition">
              Tout voir &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60">
            {summary?.topLosers.map((s: Stock) => (
              <Link
                key={s.code}
                to={`/stocks/${s.code}`}
                className="py-3 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-lg transition"
              >
                <div>
                  <div className="font-semibold text-white text-sm">{s.name}</div>
                  <div className="text-xs font-mono text-slate-400">{s.ticker}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-semibold text-slate-200">{s.price.toFixed(2)} €</div>
                  <div className="text-xs font-bold text-rose-400 flex items-center justify-end">
                    <ArrowDownRight className="w-3.5 h-3.5" />{s.variation.toFixed(2)}%
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Announcements */}
      {summary?.recentNews && summary.recentNews.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-white text-base">Actualités & Annonces NetTrader</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.recentNews.slice(0, 4).map((n: any, idx: number) => (
              <div key={idx} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-300">{n.author}</span>
                  <span>{new Date(n.date * 1000).toLocaleDateString('fr-FR')}</span>
                </div>
                <h4 className="font-bold text-white text-sm">{n.title}</h4>
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: n.content }} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
