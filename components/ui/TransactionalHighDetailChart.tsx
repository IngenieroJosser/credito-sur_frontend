'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency, cn } from '@/lib/utils';

interface ChartData {
  label: string;
  value: number;
  target?: number;
  date?: string;
  time?: string;
  secondaryValue?: number;
}

interface FinancialDetailChartProps {
  data: ChartData[];
  height?: number;
  type?: 'single' | 'double';
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-100 min-w-[220px] pointer-events-none animate-in fade-in zoom-in duration-300 relative z-[9999]">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{data.label}</p>
          {data.time && (
            <span className="text-[10px] font-black tabular-nums bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100">
              {data.time}
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              {data.secondaryValue !== undefined ? 'Ingresos' : 'Recaudado'}
            </span>
            <span className="text-sm font-black text-slate-900 tracking-tight">
              {formatCurrency(data.value)}
            </span>
          </div>

          {data.secondaryValue !== undefined && (
            <div className="flex items-center justify-between gap-6 pt-2 border-t border-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Egresos</span>
              <span className="text-sm font-black text-rose-600 tracking-tight">
                {formatCurrency(data.secondaryValue)}
              </span>
            </div>
          )}

          {data.target && (
            <div className="flex items-center justify-between gap-6 pt-2 border-t border-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Objetivo</span>
              <span className="text-sm font-black text-slate-500 tracking-tight opacity-60">
                {formatCurrency(data.target)}
              </span>
            </div>
          )}

          {data.target && (
            <div className="pt-3">
              <div className="flex justify-between text-[10px] font-black uppercase mb-1.5">
                <span className="text-slate-400">Eficiencia</span>
                <span className={data.value >= data.target ? "text-emerald-500" : "text-amber-500"}>
                  {((data.value / data.target) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    data.value >= data.target ? "bg-emerald-500" : "bg-amber-500"
                  )}
                  style={{ width: `${Math.min((data.value / data.target) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const TransactionalHighDetailChart = ({ data, height = 400, type = 'single' }: FinancialDetailChartProps) => {
  const isHighDensity = data.length > 12;
  const barSize = isHighDensity ? 28 : 42;
  const targetSize = barSize + 12;
  
  // Cálculo de desplazamiento negativo para centrar barras de diferente ancho
  const centringGap = -(barSize + targetSize) / 2;
  const barGapValue = type === 'double' ? 6 : centringGap;
  const barCategoryGapValue = type === 'double' ? '20%' : undefined;

  return (
    <div className="w-full relative bg-white overflow-hidden rounded-2xl border border-slate-50">

      {/* Contenedor de Scroll Horizontal Estricto */}
      <div 
        className={cn(
          "w-full overflow-x-auto overflow-y-hidden select-none pb-4 custom-scrollbar-premium"
        )}
      >
        <style jsx global>{`
          .custom-scrollbar-premium::-webkit-scrollbar { height: 5px; }
          .custom-scrollbar-premium::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
          .custom-scrollbar-premium::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .custom-scrollbar-premium::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        `}</style>
        
        <div 
          style={{ 
            height: height,
            width: isHighDensity ? `${(data.length * 60) + 100}px` : '100%',
            minWidth: '100%'
          }} 
          className="relative px-2 overflow-visible"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 40, left: 10, bottom: 20 }}
              barGap={barGapValue}
              barCategoryGap={barCategoryGapValue as any}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="failGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity={1} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.4} />
              
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fontWeight: 800, fill: '#94A3B8' }}
                dy={15}
                interval={0}
              />
              
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fontWeight: 700, fill: '#CBD5E1' }}
                tickFormatter={(value) => formatCurrency(Number(value))}
                width={45}
              />
              
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: '#F8FAFC', opacity: 0.5 }} 
                allowEscapeViewBox={{ x: false, y: true }}
              />

              {/* 1. OBJETIVO O VALOR SECUNDARIO (FONDO/LADO) */}
              {type === 'single' ? (
                <Bar 
                  dataKey="target" 
                  fill="#fbbf2405" 
                  stroke="#fbbf2450"
                  strokeDasharray="5 3"
                  strokeWidth={1.5}
                  radius={[12, 12, 0, 0]}
                  barSize={targetSize} 
                  isAnimationActive={false}
                />
              ) : (
                <Bar 
                  dataKey="secondaryValue" 
                  radius={[6, 6, 0, 0]} 
                  fill="url(#failGradient)"
                  barSize={barSize}
                  name="Egresos / Gasto"
                  animationDuration={1500}
                />
              )}
              
              {/* 2. RECAUDADO / VALOR PRINCIPAL (FRENTE) */}
              <Bar 
                dataKey="value" 
                radius={[6, 6, 0, 0]} 
                name={type === 'double' ? "Ingresos / Utilidad" : "Recaudado"}
                barSize={barSize}
                animationDuration={1500}
              >
                {data.map((entry, index) => {
                  const isLast = index === data.length - 1;
                  let color = 'url(#barGradient)';
                  if (type === 'single') {
                    if (entry.target && entry.value >= entry.target) color = 'url(#successGradient)';
                    else if (entry.target && entry.value < entry.target && !isLast) color = 'url(#failGradient)';
                  }
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
