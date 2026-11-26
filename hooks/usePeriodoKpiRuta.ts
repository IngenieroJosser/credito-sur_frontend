'use client'

import { useCallback, useRef, useState } from 'react'
import { mensajeDeError } from '@/lib/mensaje-de-error'
import type { TimeFilterPeriod } from '@/components/ui/TimeFilter'

export type PeriodoKpiRuta = 'HOY' | 'SEM' | 'MES' | 'AÑO'
export const PERIODO_KPI_RUTA: Record<PeriodoKpiRuta, TimeFilterPeriod> = {
  HOY: 'today', SEM: 'week', MES: 'month', AÑO: 'year',
}

export function usePeriodoKpiRuta() {
  const [periodo, setPeriodo] = useState<PeriodoKpiRuta>('HOY')
  const [periodoCargado, setPeriodoCargado] = useState<PeriodoKpiRuta>('HOY')
  const [error, setError] = useState<string | null>(null)
  const elegido = useRef<PeriodoKpiRuta>('HOY')
  const cargado = useRef<PeriodoKpiRuta>('HOY')
  const version = useRef(0)

  const cambiarPeriodo = useCallback((nuevo: PeriodoKpiRuta) => {
    if (nuevo === elegido.current) return
    elegido.current = nuevo
    version.current++
    setError(null)
    setPeriodo(nuevo)
  }, [])

  const leerPeriodo = useCallback(() => elegido.current, [])
  const puedeActualizarHoy = useCallback(() => elegido.current === 'HOY' && cargado.current === 'HOY', [])

  const iniciarConsulta = useCallback((solicitado = elegido.current) => {
    if (solicitado !== elegido.current) return null
    setError(null)
    const intento = ++version.current
    const vigente = () => intento === version.current
    return {
      periodo: solicitado,
      vigente,
      confirmar: () => {
        if (!vigente()) return
        cargado.current = solicitado
        setPeriodoCargado(solicitado)
      },
      fallar: (error: unknown) => {
        if (vigente()) setError(mensajeDeError(error, 'No se pudieron cargar las cifras de la ruta.'))
      },
    }
  }, [])

  return { periodo, periodoCargado, cambiarPeriodo, iniciarConsulta, leerPeriodo, puedeActualizarHoy, error }
}
