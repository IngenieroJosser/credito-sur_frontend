'use client';

import React, { useMemo } from 'react';
import { cn, formatCurrency } from '@/lib/utils';

interface ChartData {
  label: string;
  value: number;
  target?: number;
  secondaryValue?: number;
  date?: string; // Ej: "06 de Febrero, 2026"
  time?: string; // Ej: "13:45:00"
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
  // Manejar caso cuando no hay datos
  const hasData = data && data.length > 0;
  
  const maxValue = useMemo(() => {
    if (!hasData) return 100;
    return Math.max(...data.map(d => Math.max(d.value, d.target || 0, d.secondaryValue || 0))) * 1.1;
  }, [data, hasData]);

  // Datos de ejemplo para mostrar cuando no hay datos reales
  const sampleData: ChartData[] = useMemo(() => {
    if (hasData) return data;
    
    return [
      { label: 'Lun', value: 2100000, target: 2500000 },
      { label: 'Mar', value: 2400000, target: 2500000 },
      { label: 'Mie', value: 1500000, target: 2500000 },
      { label: 'Jue', value: 2800000, target: 2500000 },
      { label: 'Vie', value: 2200000, target: 2500000 },
      { label: 'Sab', value: 3100000, target: 2500000 },
      { label: 'Dom', value: 900000, target: 1200000 },
    ];
  }, [data, hasData]);

  const chartData = hasData ? data : sampleData;
  const isHighDensity = chartData.length > 12;

  return (
    <div className="w-full relative mt-4 pb-20">
      {/* Contenedor con amplio espacio superior (tooltips) e inferior (etiquetas) */}
      <div className="w-full overflow-visible pt-32 pb-4">
        <div 
          style={{ height: height + 60 }} 
          className={cn(
            "flex items-end justify-between px-2 relative group",
            isHighDensity ? "gap-1 sm:gap-2" : "gap-4"
          )}
        >
          {/* Grid Lines - Optimizadas para visibilidad */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-full border-t border-slate-100 border-dashed relative">
                 <span className="absolute -left-2 -top-2 px-1 text-[8px] font-bold text-slate-300 bg-white z-20">
                    {formatCurrency((maxValue / 3) * (3 - i)).split(',')[0]}
                 </span>
              </div>
            ))}
          </div>

          {!hasData && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="text-center bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-lg">
                <div className="text-sm font-bold text-slate-600 mb-2">Cargando datos del gráfico...</div>
                <div className="text-xs text-slate-500">Usando datos de muestra mientras se cargan los reales</div>
              </div>
            </div>
          )}

      {chartData.map((item, i) => {
        const heightPrimary = (item.value / maxValue) * 100;
        const heightTarget = item.target ? (item.target / maxValue) * 100 : 0;
        const heightSecondary = item.secondaryValue ? (item.secondaryValue / maxValue) * 100 : 0;

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-3 group/bar h-full justify-end relative z-10">
            {/* Tooltip Overlay Mejorado con Alto Detalle */}
            <div className="absolute bottom-full mb-4 opacity-0 group-hover/bar:opacity-100 transition-all duration-300 pointer-events-none z-50 transform -translate-y-2 group-hover/bar:translate-y-0">
               <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 min-w-[200px]">
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                    {item.time && (
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                        {item.time}
                      </span>
                    )}
                  </div>
                  
                  {item.date && (
                    <p className="text-[10px] font-medium text-slate-400 mb-3 -mt-1 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                      {item.date}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-[10px] font-bold text-white/50">MONTO EXACTO:</span>
                      <span className="text-sm font-black text-emerald-400 tracking-tight">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                    
                    {item.target && (
                      <div className="flex items-center justify-between gap-6">
                        <span className="text-[10px] font-bold text-white/50">OBJETIVO DIARIO:</span>
                        <span className="text-sm font-black text-slate-300 tracking-tight">
                          {formatCurrency(item.target)}
                        </span>
                      </div>
                    )}

                    {(item.value > 0 && item.target && item.target > 0) && (
                      <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-500">CUMPLIMIENTO:</span>
                        <span className={cn(
                          "text-[10px] font-black",
                          item.value >= item.target ? "text-emerald-500" : "text-amber-500"
                        )}>
                          {((item.value / item.target) * 100).toFixed(2)}%
                        </span>
                      </div>
                    )}

                    {item.secondaryValue && (
                      <div className="flex items-center justify-between gap-6 border-t border-white/5 pt-2">
                        <span className="text-[10px] font-bold text-white/50">EGRESO/SALIDA:</span>
                        <span className="text-sm font-black text-rose-400 tracking-tight">
                          {formatCurrency(item.secondaryValue)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Arrow tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-slate-900"></div>
               </div>
            </div>

            <div 
              className={cn(
                "relative w-full h-full flex items-end justify-center gap-1 transition-all duration-300",
                isHighDensity ? "max-w-[18px]" : "max-w-[44px]"
              )}
            >
              {/* Target Outline (Objetivo) */}
              {showTarget && item.target && (
                <div 
                  className="absolute bottom-0 w-full rounded-t-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5 transition-all duration-700 z-0"
                  style={{ height: `${heightTarget}%` }}
                >
                  {/* Target Match Line */}
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-amber-500/40"></div>
                </div>
              )}

              {/* Primary Bar */}
              <div 
                className={cn(
                  "relative w-full rounded-t-lg transition-all duration-1000 z-10 shadow-sm group-hover/bar:brightness-110 group-hover/bar:scale-x-125 group-hover/bar:shadow-lg origin-bottom",
                  item.target && item.value >= item.target ? "bg-emerald-500" : "bg-blue-600"
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

            {/* Label - Siempre visible y adaptativa */}
            <div className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300",
              isHighDensity && "rotate-[-90deg] translate-y-4 h-12 w-4 origin-top"
            )}>
              <span className={cn(
                 "text-[8px] font-black uppercase tracking-tight text-slate-500 whitespace-nowrap",
                 "group-hover/bar:text-blue-600 group-hover/bar:scale-110 transition-all"
              )}>
                {item.label}
              </span>
            </div>
          </div>
        );
      })}
        </div>
      </div>
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
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path
          d={`${getCurvePath()} L 100 100 L 0 100 Z`}
          fill={`url(#grad-${color.replace('#', '')})`}
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
