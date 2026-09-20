import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ExternalLink, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-slate-300">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-white">NetTrader 2</span>
            <span>— Jeu de Simulation Boursière</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm">
            <Link to="/help" className="hover:text-emerald-400 transition">
              Règlement & FAQ
            </Link>
            <Link to="/leaderboards" className="hover:text-emerald-400 transition">
              Classement Général
            </Link>
            <a
              href="http://localhost:8080"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-emerald-400 transition text-slate-400"
              title="Accéder à l'ancienne interface PHP"
            >
              <span>IHM Legacy (Port 8080)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Simulation 100% virtuelle sans argent réel</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-900 text-center text-xs text-slate-400">
          NetTrader 2 est distribué sous licence GNU AGPL v3. Capital de départ : 10 000 €.
        </div>
      </div>
    </footer>
  );
};
