import React, { useState } from 'react';
import { StockHistoryPoint, ChartPeriod } from '../../types';
import { RefreshCw } from 'lucide-react';

interface StockChartProps {
  history: StockHistoryPoint[];
  currentPrice: number;
  period?: ChartPeriod;
  onPeriodChange?: (period: ChartPeriod) => void;
  loading?: boolean;
}

const PERIODS: { key: ChartPeriod; label: string; shortLabel: string; spanText: string }[] = [
  { key: '1d', label: 'Jour', shortLabel: '1J', spanText: 'sur 24h' },
  { key: '1w', label: 'Semaine', shortLabel: '1S', spanText: 'sur 7j' },
  { key: '1m', label: 'Mois', shortLabel: '1M', spanText: 'sur 30j' },
  { key: '1y', label: 'Année', shortLabel: '1A', spanText: 'sur 1 an' },
];

export const StockChart: React.FC<StockChartProps> = ({
  history,
  currentPrice,
  period = '1m',
  onPeriodChange,
  loading = false,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
        Données graphiques insuffisantes
      </div>
    );
  }

  const prices = history.map((h) => h.price);
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;
  const priceRange = maxPrice - minPrice || 1;

  const width = 700;
  const height = 270;
  const paddingX = 45;
  const paddingY = 30;
  const bottomAxisY = height - paddingY - 10;

  const points = history.map((pt, i) => {
    const x = paddingX + (i / (history.length - 1 || 1)) * (width - paddingX * 2);
    const y = bottomAxisY - ((pt.price - minPrice) / priceRange) * (bottomAxisY - paddingY);
    return { x, y, pt };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${bottomAxisY} L ${points[0].x} ${bottomAxisY} Z`;

  const startPrice = history[0].price;
  const periodDiff = currentPrice - startPrice;
  const periodDiffPercent = startPrice > 0 ? (periodDiff / startPrice) * 100 : 0;
  const isPositive = periodDiff >= 0;
  const strokeColor = isPositive ? '#10B981' : '#EF4444';

  const currentPeriodConfig = PERIODS.find((p) => p.key === period) || PERIODS[2];

  const formatXLabel = (timestamp: number): string => {
    const d = new Date(timestamp * 1000);
    switch (period) {
      case '1d':
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      case '1w':
        return `${d.toLocaleDateString('fr-FR', { weekday: 'short' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      case '1y':
        return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      case '1m':
      default:
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    }
  };

  const formatTooltipDate = (timestamp: number): string => {
    const d = new Date(timestamp * 1000);
    if (period === '1d') {
      return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }
    return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Repères sur l'axe X
  const xLabels = React.useMemo(() => {
    if (points.length === 0) return [];
    if (points.length <= 4) {
      return points.map((p, i) => ({
        x: p.x,
        dateStr: formatXLabel(p.pt.time),
        align: (i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle') as 'start' | 'middle' | 'end',
      }));
    }
    const count = 4;
    const step = (points.length - 1) / (count - 1);
    const labels = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round(i * step);
      labels.push({
        x: points[idx].x,
        dateStr: formatXLabel(points[idx].pt.time),
        align: (i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle') as 'start' | 'middle' | 'end',
      });
    }
    return labels;
  }, [points, period]);

  return (
    <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 relative overflow-hidden">
      {/* Header : Prix, Performance de la période, et Sélecteur de période */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">{currentPrice.toFixed(2)} €</span>
          <span className={`text-xs font-semibold flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span>{isPositive ? '+' : ''}{periodDiffPercent.toFixed(2)}%</span>
            <span className="text-slate-500 font-normal">({currentPeriodConfig.spanText})</span>
          </span>
        </div>

        {/* Sélecteur de période : Jour, Semaine, Mois, Année */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <button
                key={p.key}
                type="button"
                disabled={loading}
                onClick={() => onPeriodChange?.(p.key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={`Période ${p.label}`}
              >
                <span className="hidden sm:inline">{p.label}</span>
                <span className="sm:hidden">{p.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barre d'état info survol */}
      <div className="h-6 flex items-center justify-end mb-1">
        {hoverIndex !== null && points[hoverIndex] ? (
          <div className="text-xs font-mono bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700 text-slate-200 flex items-center gap-1.5 shadow-sm">
            <span className="text-slate-400">{formatTooltipDate(points[hoverIndex].pt.time)}</span>
            <span className="text-slate-600">:</span>
            <span className="font-bold text-white">{points[hoverIndex].pt.price.toFixed(2)} €</span>
          </div>
        ) : (
          history.length > 0 && (
            <div className="text-xs font-mono text-slate-500">
              {formatTooltipDate(history[history.length - 1].time)}
            </div>
          )
        )}
      </div>

      {/* Zone Graphique SVG avec état de chargement */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={`w-full h-60 overflow-visible cursor-crosshair transition-opacity ${loading ? 'opacity-40' : 'opacity-100'}`}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
          <line x1={paddingX} y1={(paddingY + bottomAxisY) / 2} x2={width - paddingX} y2={(paddingY + bottomAxisY) / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
          <line x1={paddingX} y1={bottomAxisY} x2={width - paddingX} y2={bottomAxisY} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />

          {/* Min / Max Labels (Axe Y) */}
          <text x={paddingX - 8} y={paddingY + 4} fill="#64748B" fontSize="10" textAnchor="end" fontFamily="monospace">
            {maxPrice.toFixed(1)}€
          </text>
          <text x={paddingX - 8} y={bottomAxisY} fill="#64748B" fontSize="10" textAnchor="end" fontFamily="monospace">
            {minPrice.toFixed(1)}€
          </text>

          {/* Date Labels (Axe X) */}
          {xLabels.map((l, idx) => (
            <text
              key={idx}
              x={l.x}
              y={height - 8}
              fill="#64748B"
              fontSize="10"
              textAnchor={l.align}
              fontFamily="monospace"
            >
              {l.dateStr}
            </text>
          ))}

          {/* Area fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Main Line */}
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover elements */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="6"
              className="opacity-0 hover:opacity-100 fill-white transition cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
            />
          ))}

          {hoverIndex !== null && points[hoverIndex] && (
            <g>
              <line
                x1={points[hoverIndex].x}
                y1={paddingY}
                x2={points[hoverIndex].x}
                y2={bottomAxisY}
                stroke="#94A3B8"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle cx={points[hoverIndex].x} cy={points[hoverIndex].y} r="5" fill={strokeColor} stroke="#FFFFFF" strokeWidth="2" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
