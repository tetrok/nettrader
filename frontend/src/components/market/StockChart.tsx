import React, { useState } from 'react';
import { StockHistoryPoint } from '../../types';

interface StockChartProps {
  history: StockHistoryPoint[];
  currentPrice: number;
}

export const StockChart: React.FC<StockChartProps> = ({ history, currentPrice }) => {
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

  const isPositive = currentPrice >= history[0].price;
  const strokeColor = isPositive ? '#10B981' : '#EF4444';

  // Calcul des repères de dates le long de l'axe X
  const xLabels = React.useMemo(() => {
    if (points.length === 0) return [];
    if (points.length <= 4) {
      return points.map((p, i) => ({
        x: p.x,
        dateStr: new Date(p.pt.time * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
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
        dateStr: new Date(points[idx].pt.time * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        align: (i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle') as 'start' | 'middle' | 'end',
      });
    }
    return labels;
  }, [points]);

  return (
    <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">{currentPrice.toFixed(2)} €</span>
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{((currentPrice - history[0].price) / history[0].price * 100).toFixed(2)}%
          </span>
        </div>
        {hoverIndex !== null && points[hoverIndex] ? (
          <div className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-200 flex items-center gap-1.5 shadow-sm">
            <span className="text-slate-400">
              {new Date(points[hoverIndex].pt.time * 1000).toLocaleDateString('fr-FR')} {new Date(points[hoverIndex].pt.time * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-slate-600">:</span>
            <span className="font-bold text-white">{points[hoverIndex].pt.price.toFixed(2)} €</span>
          </div>
        ) : (
          history.length > 0 && (
            <div className="text-xs font-mono text-slate-400">
              {new Date(history[history.length - 1].time * 1000).toLocaleDateString('fr-FR')} {new Date(history[history.length - 1].time * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-60 overflow-visible cursor-crosshair"
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
  );
};
