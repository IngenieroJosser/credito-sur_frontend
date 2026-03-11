'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { BarChart3, Eye, Loader2 } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'
import DetalleReporteOperativoModal from '@/components/reportes/DetalleReporteOperativoModal'
import { TimeFilter, TimeFilterPeriod } from '@/components/ui/TimeFilter'
import { useReportesCoordinador } from '@/hooks/useReportesCoordinador'
import AnimacionCarga from '@/components/ui/AnimacionCarga'
import { toast } from 'sonner'

const ReportesCoordinador = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const period = (searchParams.get('period') as TimeFilterPeriod) || 'today'
  const routeId = searchParams.get('rutaId') || undefined
  
  const {
    loading,
    error,
    reportData,
    fetchOperationalReport,
    exportReport
  } = useReportesCoordinador()
  
  const [mounted, setMounted] = useState(false)
  const [reporteAVisualizar, setReporteAVisualizar] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const handlePeriodChange = (newPeriod: TimeFilterPeriod) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', newPeriod)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleRutaChange = (rutaId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (rutaId) {
      params.set('rutaId', rutaId)
    } else {
      params.delete('rutaId')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      await exportReport({ period, routeId }, 'excel')
      toast.success('Reporte Excel exportado correctamente')
    } catch (error) {
      toast.error('Error al exportar el reporte en Excel')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      await exportReport({ period, routeId }, 'pdf')
      toast.success('Reporte PDF exportado correctamente')
    } catch (error) {
      toast.error('Error al exportar el reporte en PDF')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
      fetchOperationalReport({ period, routeId })
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchOperationalReport({ period, routeId })
    }
  }, [period, routeId, mounted])

  if (error && mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="text-red-600 mb-4 text-lg font-semibold">Error al cargar reportes</div>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => fetchOperationalReport({ period, routeId })}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!mounted || loading) {
    return <AnimacionCarga texto="Cargando reportes operativos..." />
  }

  const rendimientoRutas = reportData?.rendimientoRutas || []
  const totalRecaudo = reportData?.totalRecaudo || 0
  const totalMeta = reportData?.totalMeta || 0
  const porcentajeGlobal = reportData?.porcentajeGlobal || 0
  const totalPrestamosNuevos = reportData?.totalPrestamosNuevos || 0
  const totalAfiliaciones = reportData?.totalAfiliaciones || 0
  const efectividadPromedio = reportData?.efectividadPromedio || 0

  return (
    <div className="min-h-screen bg-slate-50 relative text-slate-900">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200 mb-2">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Análisis de Operaciones</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Reportes </span><span className="text-orange-500">Operativos</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Consolidado del día: cobranza, préstamos y clientes captados.</p>
          </div>
          <div className="flex border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3 ml-auto">
              {exporting ? (
                <div className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Exportando...</span>
                </div>
              ) : (
                <ExportButton label="Exportar" onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recaudo Total</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalRecaudo)}</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">{porcentajeGlobal}% Meta</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Préstamos Nuevos</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalPrestamosNuevos}</h3>
            <p className="text-xs text-slate-500 mt-2">Nuevos préstamos otorgados</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Afiliaciones</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalAfiliaciones}</h3>
            <p className="text-xs text-slate-500 mt-2">Nuevos clientes captados</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Efectividad</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{efectividadPromedio}%</h3>
            <p className="text-xs text-slate-500 mt-2">Promedio de rutas</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 bg-white p-4 rounded-2xl border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">Desglose por Ruta</h3>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <FiltroRuta 
              onRutaChange={handleRutaChange} 
              selectedRutaId={routeId || null}
              showAllOption={true}
            />
            <TimeFilter activePeriod={period} onPeriodChange={handlePeriodChange} />
          </div>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">Rendimiento Detallado de Cobradores</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-xs text-slate-400 uppercase font-bold">
                <tr>
                  <th className="px-6 py-4">Ruta / Cobrador</th>
                  <th className="px-6 py-4 text-right">Meta</th>
                  <th className="px-6 py-4 text-right">Recaudo</th>
                  <th className="px-6 py-4 text-center">Eficiencia</th>
                  <th className="px-6 py-4 text-center">Nuevos</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {rendimientoRutas.length > 0 ? (
                  rendimientoRutas.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{r.ruta}</p>
                        <p className="text-xs text-slate-500">{r.cobrador}</p>
                      </td>
                      <td className="px-6 py-4 text-right">{formatCurrency(r.meta)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(r.recaudado)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          r.eficiencia >= 80 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : r.eficiencia >= 60 
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-rose-50 text-rose-700 border-rose-100"
                        )}>
                          {r.eficiencia}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col text-[10px]">
                          <span>Préstamos: {r.nuevosPrestamos}</span>
                          <span>Clientes: {r.nuevosClientes}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setReporteAVisualizar(r.id)} 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          aria-label={`Ver detalles de ${r.ruta}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No hay datos disponibles para el período seleccionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {reporteAVisualizar && (
          <DetalleReporteOperativoModal
            id={reporteAVisualizar}
            onClose={() => setReporteAVisualizar(null)}
          />
        )}
      </div>
    </div>
  )
}

export default ReportesCoordinador
