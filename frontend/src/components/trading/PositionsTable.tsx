import React from 'react';
import { Position, Stock } from '../../types';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip } from '../ui/Tooltip';

interface PositionsTableProps {
  positions: Position[];
  onSellPosition: (position: Position) => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ positions, onSellPosition }) => {
  if (positions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <p className="text-slate-400 text-sm">Vous ne possédez actuellement aucune ligne en portefeuille.</p>
        <Link
          to="/market"
          className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
        >
          Découvrir les cotations boursières et passer votre premier ordre &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Titre</th>
              <th className="px-5 py-3.5 text-right">Quantité</th>
              <th className="px-5 py-3.5 text-right">PRU</th>
              <th className="px-5 py-3.5 text-right">Cours Actuel</th>
              <th className="px-5 py-3.5 text-right">Valorisation</th>
              <th className="px-5 py-3.5 text-right">Plus/Moins-Value</th>
              <th className="px-5 py-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {positions.map((pos) => {
              const isGain = pos.gainLoss >= 0;
              return (
                <tr key={pos.code} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-4 font-sans font-medium text-white">
                    <Link to={`/stocks/${pos.code}`} className="hover:text-emerald-400 transition">
                      {pos.name}
                    </Link>
                    {pos.isVad && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        VAD
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right text-slate-300">
                    <div>{pos.quantity}</div>
                    {pos.pendingQuantity !== undefined && pos.pendingQuantity > 0 && (
                      <div className="text-[11px] font-sans text-amber-400">
                        {pos.availableQuantity} dispo
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right text-slate-400">{pos.buyPrice.toFixed(2)} €</td>
                  <td className="px-5 py-4 text-right font-semibold text-white">{pos.currentPrice.toFixed(2)} €</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-200">
                    {pos.totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className={`px-5 py-4 text-right font-semibold flex items-center justify-end gap-1 ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isGain ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span>
                      {isGain ? '+' : ''}
                      {pos.gainLoss.toFixed(2)} € ({isGain ? '+' : ''}
                      {pos.gainLossPercent.toFixed(2)}%)
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {(() => {
                      const isAvailable = (pos.availableQuantity !== undefined ? pos.availableQuantity > 0 : pos.quantity > 0) || pos.isVad;
                      const tooltipMessage = !isAvailable
                        ? `Toutes vos actions (${pos.quantity}) sont déjà engagées dans des ordres de vente en attente.`
                        : pos.pendingQuantity && pos.pendingQuantity > 0
                        ? `Passer un ordre de vente (${pos.availableQuantity} disponible(s), ${pos.pendingQuantity} en attente)`
                        : `Passer un ordre de vente (${pos.quantity} action${pos.quantity > 1 ? 's' : ''})`;

                      return (
                        <Tooltip content={tooltipMessage}>
                          <button
                            onClick={() => onSellPosition(pos)}
                            disabled={!isAvailable}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition inline-flex items-center gap-1 ${
                              isAvailable
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 cursor-pointer'
                                : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'
                            }`}
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            Vendre
                          </button>
                        </Tooltip>
                      );
                    })()}
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
