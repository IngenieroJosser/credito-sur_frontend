'use client'

import React from 'react'
import { DollarSign, Target, Receipt, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ─────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────
export interface RutaStatsData {
  recaudo: number
  meta: number
  eficiencia: number
  gastos: number
  base: number
  pendiente?: number
}

type Periodo = 'HOY' | 'SEM' | 'MES' | 'AÑO'

interface RutaStatsCardsProps {
  rutaStats: RutaStatsData
  periodo?: Periodo
}

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────
const labelPeriodo = (periodo: Periodo, caso: 'capital' | 'minuscula') => {
  const labels: Record<Periodo, [string, string]> = {
    HOY: ['Hoy', 'hoy'],
    SEM: ['Semana', 'esta semana'],
    MES: ['Mes', 'este mes'],
    AÑO: ['Año', 'este año'],
  }
  return labels[periodo][caso === 'capital' ? 0 : 1]
}

const eficienciaLabel = (eficiencia: number) => {
  if (eficiencia >= 90) return { texto: 'ÓPTIMO', clase: 'text-emerald-600 bg-emerald-50' }
  if (eficiencia >= 70) return { texto: 'REGULAR', clase: 'text-orange-600 bg-orange-50' }
  return { texto: 'BAJO', clase: 'text-rose-600 bg-rose-50' }
}

// ─────────────────────────────────────────────────
// Componente de tarjeta base reutilizable
// ─────────────────────────────────────────────────
interface StatCardProps {
  children: React.ReactNode
}

const StatCard = ({ children }: StatCardProps) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
    {children}
  </div>
)

// ─────────────────────────────────────────────────
// Componente principal exportado
// ─────────────────────────────────────────────────
export function RutaStatsCards({ rutaStats, periodo = 'HOY' }: RutaStatsCardsProps) {
  const recaudo = Number(rutaStats?.recaudo || 0)
  const pendiente = rutaStats.pendiente != null
    ? Math.max(0, Number(rutaStats.pendiente || 0))
    : Math.max(0, Number(rutaStats?.meta || 0) - recaudo)
  const meta = periodo === 'HOY' && rutaStats.pendiente != null
    ? recaudo + pendiente
    : Number(rutaStats?.meta || 0)
  const eficiencia = meta > 0
    ? Math.min(100, Math.max(0, (recaudo / meta) * 100))
    : 0
  const ef = eficienciaLabel(eficiencia)
  const eficienciaShown = Number.isFinite(eficiencia)
    ? eficiencia.toFixed(2)
    : '0.00'
  const porcentajeRecaudo = meta > 0
    ? `${eficienciaShown}%`
    : '---'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

      {/* Tarjeta 1: Recaudo */}
      <StatCard>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Recaudo {labelPeriodo(periodo, 'capital')}
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-2xl font-bold text-slate-900">
                {formatCurrency(recaudo)}
              </h3>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {porcentajeRecaudo}
              </span>
            </div>
          </div>
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 group-hover:scale-110 transition-transform">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Meta: {formatCurrency(meta)}
        </p>
      </StatCard>

      {/* Tarjeta 2: Efectividad */}
      <StatCard>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Efectividad
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-2xl font-bold text-slate-900">
                {eficienciaShown}%
              </h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ef.clase}`}>
                {ef.texto}
              </span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 group-hover:scale-110 transition-transform">
            <Target className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000"
            style={{ width: `${eficiencia}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 font-medium mt-2">
          Pendiente: {formatCurrency(pendiente)}
        </p>
      </StatCard>

      {/* Tarjeta 3: Gastos */}
      <StatCard>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gastos {labelPeriodo(periodo, 'capital')}
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-2xl font-bold text-slate-900">
                {formatCurrency(rutaStats.gastos)}
              </h3>
            </div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 group-hover:scale-110 transition-transform">
            <Receipt className="h-5 w-5 text-rose-600" />
          </div>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Registrados {labelPeriodo(periodo, 'minuscula')}
        </p>
      </StatCard>

      {/* Tarjeta 4: Base Efectivo */}
      <StatCard>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Base Efectivo
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-2xl font-bold text-slate-900">
                {formatCurrency(rutaStats.base)}
              </h3>
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 group-hover:scale-110 transition-transform">
            <Wallet className="h-5 w-5 text-amber-600" />
          </div>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Asignada por coordinador
        </p>
      </StatCard>

    </div>
  )
}
