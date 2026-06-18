'use client'

import { RutaStatsCards } from '@/components/dashboards/shared/RutaStatsCards'
import { RolUsuario } from '@/types/enums'

type Periodo = 'HOY' | 'SEM' | 'MES' | 'AÑO'

type RutaStatsLike = {
  recaudo: number
  meta: number
  eficiencia: number
  gastos: number
  base: number
}

type Props = {
  periodo: Periodo
  onPeriodoChange: (p: Periodo) => void
  rutaStats: RutaStatsLike
  userRol?: RolUsuario
}

export default function RutaKpiSection({ periodo, onPeriodoChange, rutaStats, userRol }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(['HOY', 'SEM', 'MES', 'AÑO'] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodoChange(p)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                periodo === p
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <RutaStatsCards rutaStats={rutaStats as any} periodo={periodo as any} userRol={userRol} />
    </div>
  )
}
