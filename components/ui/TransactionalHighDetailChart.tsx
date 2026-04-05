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
import { formatCurrency } from '@/lib/utils';
import { BarChart2 } from 'lucide-react';

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

const formatBogotaTime = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

const formatBogotaDateTime = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const hasTarget = typeof d.target === 'number' && d.target > 0;
    const eficiencia = hasTarget ? d.value / d.target : undefined;
    const tooltipTime = formatBogotaTime(d.time) ?? formatBogotaDateTime(d.time);
    return (
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-100 min-w-[220px] pointer-events-none animate-in fade-in zoom-in duration-300 relative z-[9999]">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{d.label}</p>
          {d.time && (
            <span className="text-[10px] font-black tabular-nums bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100">
              {tooltipTime ?? d.time}
            </span>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              {d.secondaryValue !== undefined ? 'Ingresos' : 'Recaudado'}
            </span>
            <span className="text-sm font-black text-slate-900 tracking-tight">
              {formatCurrency(d.value)}
            </span>
          </div>

          {hasTarget && (
            <div className="flex items-center justify-between gap-6 pt-2 border-t border-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Meta del día</span>
              <span className="text-sm font-black text-slate-700 tracking-tight">
                {formatCurrency(d.target)}
              </span>
            </div>
          )}

          {hasTarget && typeof eficiencia === 'number' && Number.isFinite(eficiencia) && (
            <div className="flex items-center justify-between gap-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Eficiencia</span>
              <span className="text-sm font-black text-emerald-700 tracking-tight tabular-nums">
                {new Intl.NumberFormat('es-CO', {
                  style: 'percent',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(eficiencia)}
              </span>
            </div>
          )}

          {d.secondaryValue !== undefined && (
            <div className="flex items-center justify-between gap-6 pt-2 border-t border-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Egresos</span>
              <span className="text-sm font-black text-rose-600 tracking-tight">
                {formatCurrency(d.secondaryValue)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const TransactionalHighDetailChart = ({
  data,
  height = 400,
  type = 'single',
}: FinancialDetailChartProps) => {
  // ─── Estado vacío ─────────────────────────────────────────────────────────
  // Si el array está vacío o todos los valores son 0, mostramos un placeholder
  // elegante en lugar de un gráfico en blanco que parece roto.
  const hasRealData = data.length > 0 && data.some((d) => d.value > 0);

  const hasTarget = type === 'single' && data.some((d) => typeof d.target === 'number' && (d.target || 0) > 0);

  if (!hasRealData) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60"
        style={{ height }}
      >
        <div className="p-4 rounded-2xl bg-slate-100">
          <BarChart2 className="w-8 h-8 text-slate-300" />
        </div>
        <div className="text-center px-4">
          <p className="text-sm font-bold text-slate-400">Sin cobros registrados en este período</p>
          <p className="text-xs text-slate-300 mt-1">
            {data.length === 0
              ? 'Selecciona un período con actividad para ver la tendencia'
              : 'No se registraron pagos — todos los valores son $0'}
          </p>
        </div>
      </div>
    );
  }

  // ─── Configuración de dimensiones ─────────────────────────────────────────
  const isHighDensity = data.length > 12;
  const barSize = isHighDensity ? 28 : 42;
  const barGapValue = type === 'double' ? 6 : (hasTarget ? -barSize : undefined);
  const barCategoryGapValue = type === 'double' ? '20%' : undefined;

  return (
    <div className="w-full relative bg-white overflow-hidden rounded-2xl border border-slate-50">
      <div className="w-full overflow-x-auto overflow-y-hidden select-none pb-4 custom-scrollbar-premium">
        <style jsx global>{`
          .custom-scrollbar-premium::-webkit-scrollbar { height: 5px; }
          .custom-scrollbar-premium::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
          .custom-scrollbar-premium::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .custom-scrollbar-premium::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        `}</style>

        <div
          style={{
            height,
            width: isHighDensity ? `${data.length * 60 + 100}px` : '100%',
            minWidth: '100%',
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

              {/* META DEL DÍA (fondo) */}
              {hasTarget && (
                <Bar
                  dataKey="target"
                  radius={[6, 6, 0, 0]}
                  fill="#f59e0b"
                  fillOpacity={0.08}
                  stroke="#f59e0b"
                  strokeOpacity={0.35}
                  strokeWidth={1.5}
                  barSize={barSize}
                  name="Meta del día"
                  animationDuration={1500}
                />
              )}

              {/* VALOR SECUNDARIO */}
              {type === 'double' && (
                <Bar
                  dataKey="secondaryValue"
                  radius={[6, 6, 0, 0]}
                  fill="url(#failGradient)"
                  barSize={barSize}
                  name="Egresos / Gasto"
                  animationDuration={1500}
                />
              )}

              {/* VALOR PRINCIPAL / RECAUDADO (frente) */}
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                name={type === 'double' ? 'Ingresos / Utilidad' : 'Recaudado'}
                barSize={barSize}
                animationDuration={1500}
              >
                {data.map((entry, index) => {
                  let color = 'url(#barGradient)';
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
