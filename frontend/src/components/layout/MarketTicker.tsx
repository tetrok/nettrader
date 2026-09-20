import React, { useEffect, useState } from 'react';
import { marketApi } from '../../api/market';
import { MarketSummary } from '../../types';
import { Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MarketTicker: React.FC = () => {
  const [summary, setSummary] = useState<MarketSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await marketApi.getSummary();
        setSummary(data);
      } catch {
        // silent fallback
      }
    };
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (!summary) return null;

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-xs py-1.5 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Market Status indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-block w-2 h-2 rounded-full ${summary.isMarketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <span className="font-medium text-slate-300">
            {summary.isMarketOpen ? 'Marché Ouvert' : 'Marché Fermé'}
          </span>
          <span className="text-slate-400 hidden sm:inline flex items-center gap-1">
            <Clock className="w-3 h-3" />
            09:15 - 17:55
          </span>
        </div>

        {/* Ticker items */}
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap">
          {summary.topGainers.slice(0, 3).map((g) => (
            <Link
              key={g.code}
              to={`/stocks/${g.code}`}
              className="inline-flex items-center gap-1 hover:text-white transition"
            >
              <span className="text-slate-400 font-mono">{g.ticker}</span>
              <span className="font-semibold text-slate-200">{g.price.toFixed(2)}€</span>
              <span className="text-emerald-400 flex items-center font-mono">
                <ArrowUpRight className="w-3 h-3" />
                +{g.variation.toFixed(2)}%
              </span>
            </Link>
          ))}

          {summary.topLosers.slice(0, 3).map((l) => (
            <Link
              key={l.code}
              to={`/stocks/${l.code}`}
              className="inline-flex items-center gap-1 hover:text-white transition"
            >
              <span className="text-slate-400 font-mono">{l.ticker}</span>
              <span className="font-semibold text-slate-200">{l.price.toFixed(2)}€</span>
              <span className="text-rose-400 flex items-center font-mono">
                <ArrowDownRight className="w-3 h-3" />
                {l.variation.toFixed(2)}%
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
