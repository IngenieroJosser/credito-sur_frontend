import { useCallback } from 'react'
import { useConsultaPorPeriodo } from '@/hooks/useConsultaPorPeriodo'
import { reportesCoordinadorService, type OperationalReportFilters } from '@/services/reportes-coordinador-service'
import type { TimeFilterPeriod } from '@/components/ui/TimeFilter'
import { getBogotaDateKey } from '@/lib/rutas-core'

export function useReportesCoordinador(periodo: TimeFilterPeriod, routeId?: string, habilitado = true) {
  const consultar = useCallback(async () => ({
    periodo,
    reporte: await reportesCoordinadorService.getOperationalReport({ period: periodo, routeId }),
  }), [periodo, routeId])
  const { resultado, cargando, error, recargar } = useConsultaPorPeriodo(
    `${periodo}:${routeId ?? ''}`,
    consultar,
    'No se pudo cargar el reporte operativo.',
    habilitado,
  )

  const exportReport = useCallback(async (filters: OperationalReportFilters, format: 'excel' | 'pdf') => {
    const blob = await reportesCoordinadorService.exportReport(filters, format)
    const url = window.URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `reporte-operativo-${filters.period}-${getBogotaDateKey(new Date())}.${format === 'excel' ? 'xlsx' : 'pdf'}`
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    window.URL.revokeObjectURL(url)
  }, [])

  return {
    loading: cargando,
    reportData: resultado?.datos.reporte,
    periodoCargado: resultado?.datos.periodo,
    error,
    recargar,
    exportReport,
  }
}
