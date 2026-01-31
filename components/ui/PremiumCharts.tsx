'use client';

import React, { useMemo } from 'react';
import { cn, formatCurrency } from '@/lib/utils';

interface ChartData {
  label: string;
  value: number;
  target?: number;
  secondaryValue?: number;
}

interface PremiumBarChartProps {
  data: ChartData[];
  height?: number;
  showTarget?: boolean;
  type?: 'single' | 'double';
  colors?: {
    primary: string;
    secondary?: string;
    target?: string;
  };
}

export const PremiumBarChart = ({
  data,
  height = 240,
  showTarget = false,
  type = 'single',
}: PremiumBarChartProps) => {
  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => Math.max(d.value, d.target || 0, d.secondaryValue || 0))) * 1.1;
  }, [data]);

  return (
    <div style={{ height }} className="w-full flex items-end justify-between gap-2 sm:gap-4 px-2 relative group mt-8">
      {/* Grid Lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-full border-t border-slate-100 border-dashed relative">
             <span className="absolute -left-2 -top-2 px-1 text-[8px] font-bold text-slate-300 bg-white">
                {formatCurrency((maxValue / 3) * (3 - i)).split(',')[0]}
             </span>
          </div>
        ))}
      </div>

      {data.map((item, i) => {
        const heightPrimary = (item.value / maxValue) * 100;
        const heightTarget = item.target ? (item.target / maxValue) * 100 : 0;
        const heightSecondary = item.secondaryValue ? (item.secondaryValue / maxValue) * 100 : 0;

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-3 group/bar h-full justify-end relative z-10">
            {/* Tooltip Overlay */}
            <div className="absolute bottom-full mb-4 opacity-0 group-hover/bar:opacity-100 transition-all duration-300 pointer-events-none z-50 transform -translate-y-2 group-hover/bar:translate-y-0">
               <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-white/10 min-w-[140px]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{item.label}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-white/70">Actual:</span>
                      <span className="text-xs font-black text-emerald-400">{formatCurrency(item.value)}</span>
                    </div>
                    {item.target && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-bold text-white/70">Meta:</span>
                        <span className="text-xs font-black text-slate-300">{formatCurrency(item.target)}</span>
                      </div>
                    )}
                    {item.secondaryValue && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-bold text-white/70">Egreso:</span>
                        <span className="text-xs font-black text-rose-400">{formatCurrency(item.secondaryValue)}</span>
                      </div>
                    )}
                  </div>
                  {/* Arrow tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900"></div>
               </div>
            </div>

            <div className="relative w-full max-w-[44px] h-full flex items-end justify-center gap-1">
              {/* Target Line / Bar (High Visibility) */}
              {showTarget && item.target && (
                <div 
                  className="absolute bottom-0 w-full rounded-t-xl border-2 border-dashed border-amber-400/60 bg-amber-50/20 transition-all duration-700 z-0"
                  style={{ height: `${heightTarget}%` }}
                >
                  {/* Small Target Descriptor Tag (Optional visual hint) */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-1 bg-amber-400/40 rounded-full"></div>
                </div>
              )}

              {/* Primary Bar */}
              <div 
                className={cn(
                  "relative w-full rounded-t-xl transition-all duration-1000 z-10 shadow-lg group-hover/bar:brightness-110",
                  item.target && item.value >= item.target ? "bg-emerald-500 shadow-emerald-500/20" : "bg-blue-600 shadow-blue-600/20"
                )}
                style={{ 
                  height: `${heightPrimary}%`,
                  background: item.target && item.value >= item.target 
                    ? 'linear-gradient(to top, #10b981, #34d399)' 
                    : 'linear-gradient(to top, #2563eb, #60a5fa)'
                }}
              >
                {/* Glossy effect */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10 rounded-t-xl pointer-events-none"></div>
              </div>

              {/* Secondary Bar (for Evolution chart) */}
              {type === 'double' && item.secondaryValue && (
                <div 
                  className="relative w-full rounded-t-xl transition-all duration-1000 z-10 shadow-lg bg-rose-500 shadow-rose-500/20 group-hover/bar:brightness-110"
                  style={{ 
                    height: `${heightSecondary}%`,
                    background: 'linear-gradient(to top, #e11d48, #fb7185)'
                  }}
                >
                   {/* Glossy effect */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10 rounded-t-xl pointer-events-none"></div>
                </div>
              )}
            </div>

            {/* Label */}
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 group-hover/bar:text-slate-900 transition-colors">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const Sparkline = ({ 
  data, 
  color = '#2563eb', 
  height = 40 
}: { 
  data: number[], 
  color?: string, 
  height?: number 
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = 100 / (data.length - 1);

  // SVG for curved path
  const getCurvePath = () => {
    const pointsArray = data.map((d, i) => ({
      x: i * step,
      y: 100 - ((d - min) / range) * 100
    }));

    if (pointsArray.length < 2) return "";

    let d = `M ${pointsArray[0].x} ${pointsArray[0].y}`;
    
    for (let i = 0; i < pointsArray.length - 1; i++) {
      const curr = pointsArray[i];
      const next = pointsArray[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    
    return d;
  };

  return (
    <div style={{ height }} className="w-24 overflow-visible">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path
          d={`${getCurvePath()} L 100 100 L 0 100 Z`}
          fill={`url(#grad-${color})`}
          className="animate-in fade-in duration-1000"
        />
        <path
          d={getCurvePath()}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-in fade-in slide-in-from-left-4 duration-1000"
        />
      </svg>
    </div>
  );
};
