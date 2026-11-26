'use client'

import { RutaStatsCards } from '@/components/dashboards/shared/RutaStatsCards'
import { RolUsuario } from '@/types/enums'
import { PERIODO_KPI_RUTA, type PeriodoKpiRuta } from '@/hooks/usePeriodoKpiRuta'
import ContenidoPorPeriodo from '@/components/ui/ContenidoPorPeriodo'

type RutaStatsLike = {
  recaudo: number
  meta: number
  eficiencia: number
  gastos: number
  base: number
}

type Props = {
  periodo: PeriodoKpiRuta
  periodoCargado: PeriodoKpiRuta
  onPeriodoChange: (p: PeriodoKpiRuta) => void
  error: string | null
  recargar: () => void
  rutaStats: RutaStatsLike
  userRol?: RolUsuario
}

export default function RutaKpiSection({ periodo, periodoCargado, onPeriodoChange, error, recargar, rutaStats, userRol }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(['HOY', 'SEM', 'MES', 'AÑO'] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={periodo === p}
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

      <ContenidoPorPeriodo periodoMostrado={PERIODO_KPI_RUTA[periodoCargado]} periodo={PERIODO_KPI_RUTA[periodo]} cargando={!error && periodo !== periodoCargado}
        error={error} recargar={recargar}>
        <RutaStatsCards rutaStats={rutaStats} periodo={periodoCargado} userRol={userRol} />
      </ContenidoPorPeriodo>
    </div>
  )
}
