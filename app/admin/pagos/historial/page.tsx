'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { usePageFocusRefresh } from '@/hooks/usePageFocusRefresh'
import {
  Search,
  Filter,
  Calendar,
  User,
  Wallet,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import { pagosService } from '@/services/pagos-service'
import { exportService } from '@/services/export-service'
import { getOfflineDb } from '@/lib/offline/offlineDb'
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'
import { toast } from 'sonner'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { TimeFilter, TimeFilterPeriod } from '@/components/ui/TimeFilter'
import AnimacionCarga from '@/components/ui/AnimacionCarga'
import PagoDetalleModal from '@/components/dashboards/shared/PagoDetalleModal'

type EstadoPago = 'completado' | 'pendiente' | 'fallido' | 'en_revision'

interface Pago {
  pagoId: string
  id: string
  fecha: string
  cliente: string
  cobrador: string
  ruta: string
  monto: number
  capital: number
  interes: number
  mora: number
  metodo: string
  estado: EstadoPago
}

const HistorialPagosPage = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') as TimeFilterPeriod) || 'today'

  const formatFechaPago = (fechaRaw: string) => {
    const d = new Date(fechaRaw)
    if (Number.isNaN(d.getTime())) return fechaRaw
    const fecha = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
    return `${fecha} • ${hora}`
  }

  const handlePeriodChange = (newPeriod: TimeFilterPeriod) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', newPeriod)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const [busqueda, setBusqueda] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [pagos, setPagos] = useState<Pago[]>([])
  const [showDetallePago, setShowDetallePago] = useState(false)
  const [detallePagoId, setDetallePagoId] = useState<string | null>(null)

  const handleExportExcel = async () => {
    try {
      await exportService.exportPayments('excel')
      toast.success('Historial de pagos Excel descargado')
    } catch (e) {
      toast.error('Error al exportar historial de pagos')
    }
  }

  const handleExportPDF = async () => {
    try {
      await exportService.exportPayments('pdf')
      toast.success('Historial de pagos PDF descargado')
    } catch (e) {
      toast.error('Error al exportar historial de pagos')
    }
  }

  const loadPagos = useCallback(async () => {
      setIsLoading(true)
      try {
        const resp = await pagosService.obtenerPagos()
        const data = resp?.pagos || resp || []
        const mapped: Pago[] = (Array.isArray(data) ? data : []).map((p: any) => {
          const montoTotal = Number(p?.montoTotal ?? 0)
          const sumCampos = Number(p?.montoCapital ?? 0) + Number(p?.montoInteres ?? 0) + Number(p?.montoMora ?? 0)
          
          let capital = Number(p?.montoCapital ?? 0)
          let interes = Number(p?.montoInteres ?? 0)
          let mora = Number(p?.montoMora ?? 0)
          
          const detalles = Array.isArray(p?.detalles) ? p.detalles : []
          if (capital === 0 && interes === 0 && mora === 0) {
            capital = detalles.reduce((acc: number, d: any) => acc + Number(d?.montoCapital || 0), 0)
            interes = detalles.reduce((acc: number, d: any) => acc + Number(d?.montoInteres || 0), 0)
            mora = detalles.reduce((acc: number, d: any) => acc + Number(d?.montoInteresMora || 0), 0)
          }

          let monto = montoTotal > 0 ? montoTotal : (sumCampos > 0 ? sumCampos : (capital + interes + mora))
          if (monto === 0) monto = capital + interes + mora

          return {
            pagoId: p.id,
            id: p.numeroPago || p.id,
            fecha: p.fechaPago || p.creadoEn || '',
            cliente: p.cliente ? `${p.cliente.nombres} ${p.cliente.apellidos}` : (p.clienteId || ''),
            cobrador: p.cobrador ? `${p.cobrador.nombres} ${p.cobrador.apellidos}` : (p.cobradorId || ''),
            ruta: p.ruta || '',
            monto,
            capital,
            interes,
            mora,
            metodo: p.metodoPago || 'Efectivo',
            estado: (p.estado || 'completado').toLowerCase() as EstadoPago,
          }
        })
        setPagos(mapped)
      } catch (err) {
        console.error('Error cargando historial de pagos:', err)
        try {
          const db = await getOfflineDb();
          const offQueue = await db.getAll('offline-queue');
          const pagosOffline: Pago[] = offQueue
            .filter((q: any) => q.type === 'pago')
            .map((q: any) => ({
              pagoId: q.data?.pagoId || q.data?.id || q.id,
              id: q.id,
              fecha: q.createdAt || toBogotaDateTimeOffsetIso(new Date()),
              cliente: q.description || '',
              cobrador: '',
              ruta: '',
              monto: q.data?.montoTotal || 0,
              capital: q.data?.montoCapital || 0,
              interes: q.data?.montoInteres || 0,
              mora: q.data?.montoMora || 0,
              metodo: 'Efectivo',
              estado: (q.status === 'completed' ? 'completado' : 'pendiente') as EstadoPago,
            }));
          if (pagosOffline.length > 0) setPagos(pagosOffline);
        } catch { /* ignore */ }
      } finally {
        setIsLoading(false)
      }
    }, [])

  useEffect(() => { loadPagos() }, [loadPagos])

  // Si cambian filtros/búsqueda, volvemos a la página 1 para evitar páginas vacías
  useEffect(() => {
    setPaginaActual(1)
  }, [busqueda, period])

  // Tiempo real: escucha nuevos pagos registrados
  useRealtimeData(['pagos_actualizados', 'prestamos_actualizados'], loadPagos)
  usePageFocusRefresh(loadPagos)

  if (isLoading) {
    return <AnimacionCarga texto="Cargando historial de pagos..." />
  }

  const getEstadoChipClasses = (estado: EstadoPago) => {
    if (estado === 'completado') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (estado === 'pendiente') return 'bg-amber-50 text-amber-700 border-amber-100'
    if (estado === 'fallido') return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-sky-50 text-sky-700 border-sky-100'
  }

  const getDateRangeForPeriod = (p: TimeFilterPeriod) => {
    const ahora = new Date()
    let inicio = new Date(ahora)

    if (p === 'today') {
      inicio.setHours(0, 0, 0, 0)
    } else if (p === 'week') {
      inicio.setDate(ahora.getDate() - 6)
      inicio.setHours(0, 0, 0, 0)
    } else if (p === 'month') {
      inicio.setMonth(ahora.getMonth(), 1)
      inicio.setHours(0, 0, 0, 0)
    } else if (p === 'year') {
      inicio = new Date(ahora.getFullYear(), 0, 1)
      inicio.setHours(0, 0, 0, 0)
    }

    return { start: inicio, end: ahora }
  }

  const { start, end } = getDateRangeForPeriod(period)

  const pagosFiltrados = pagos.filter((pago) => {
    if (pago.fecha) {
      const fechaPago = new Date(pago.fecha)
      if (!Number.isNaN(fechaPago.getTime())) {
        if (fechaPago < start || fechaPago > end) return false
      }
    }

    if (
      busqueda &&
      !`${pago.id} ${pago.cliente} ${pago.cobrador} ${pago.ruta}`
        .toLowerCase()
        .includes(busqueda.toLowerCase())
    ) {
      return false
    }
    return true
  })

  const ITEMS_PER_PAGE = 20 // Mostrar más ítems ya que es tabla densa
  const totalPages = Math.max(1, Math.ceil(pagosFiltrados.length / ITEMS_PER_PAGE))
  const paginaSegura = Math.min(Math.max(1, paginaActual), totalPages)
  const startIdx = (paginaSegura - 1) * ITEMS_PER_PAGE
  const endIdx = startIdx + ITEMS_PER_PAGE
  const pagosPaginados = pagosFiltrados.slice(startIdx, endIdx)

  const kpis = (() => {
    const count = pagosFiltrados.length
    const total = pagosFiltrados.reduce((acc, p) => acc + Number(p.monto || 0), 0)
    const efectivo = pagosFiltrados
      .filter((p) => String(p.metodo || '').toUpperCase() !== 'TRANSFERENCIA')
      .reduce((acc, p) => acc + Number(p.monto || 0), 0)
    const transferencia = pagosFiltrados
      .filter((p) => String(p.metodo || '').toUpperCase() === 'TRANSFERENCIA')
      .reduce((acc, p) => acc + Number(p.monto || 0), 0)
    const promedio = count > 0 ? total / count : 0
    return { count, total, efectivo, transferencia, promedio }
  })()

  const openDetallePago = (pagoId: string) => {
    if (!pagoId) return
    setDetallePagoId(pagoId)
    setShowDetallePago(true)
  }

  const Paginador = () => (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-white">
      <div className="text-xs font-medium text-slate-500">
        Mostrando <span className="font-bold text-slate-900">{pagosPaginados.length}</span> de{' '}
        <span className="font-bold text-slate-900">{pagosFiltrados.length}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
          disabled={paginaSegura === 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
          Página {paginaSegura} de {totalPages}
        </span>
        <button
          onClick={() => setPaginaActual((prev) => Math.min(totalPages, prev + 1))}
          disabled={paginaSegura >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="relative z-10 w-full p-4 md:p-8 space-y-6 md:space-y-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Historial de Pagos
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Consulta densa de recaudos con desglose de capital, interés y mora.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <TimeFilter activePeriod={period} onPeriodChange={handlePeriodChange} />
            <ExportButton 
              label="Exportar" 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF} 
            />
          </div>
        </header>

        <section className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-3">
              <div className="relative flex-1 max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar recibo, cliente, cobrador..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                />
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                <Filter className="h-4 w-4 text-slate-400" />
                <span>Filtros</span>
              </button>
            </div>
          </div>

          {/* TABLA DENSA (DESKTOP) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                    <th className="px-4 py-2.5 text-left">Recibo / Fecha</th>
                    <th className="px-4 py-2.5 text-left">Cliente</th>
                    <th className="px-4 py-2.5 text-left">Cobrador / Ruta</th>
                    <th className="px-4 py-2.5 text-right">Capital</th>
                    <th className="px-4 py-2.5 text-right">Interés</th>
                    <th className="px-4 py-2.5 text-right">Mora</th>
                    <th className="px-4 py-2.5 text-right bg-blue-50/50">Total Pagado</th>
                    <th className="px-4 py-2.5 text-center">Método</th>
                    <th className="px-4 py-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagosPaginados.map((pago) => (
                    <tr
                      key={pago.pagoId}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => openDetallePago(pago.pagoId)}
                    >
                      <td className="px-4 py-2 align-middle">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-blue-600">
                            {pago.id}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatFechaPago(pago.fecha)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <span className="text-xs font-bold text-slate-700 truncate block max-w-[150px]">{pago.cliente}</span>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">
                            {pago.cobrador}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {pago.ruta}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle text-right">
                        <span className="text-xs font-medium text-slate-600">
                          {formatCurrency(pago.capital)}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle text-right">
                        <span className="text-xs font-medium text-slate-600">
                          {formatCurrency(pago.interes)}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle text-right">
                        <span className="text-xs font-medium text-slate-600">
                          {pago.mora > 0 ? formatCurrency(pago.mora) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle text-right bg-blue-50/20">
                        <span className="text-xs font-black text-slate-900">
                          {formatCurrency(pago.monto)}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          {pago.metodo}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle text-center">
                        <span
                          className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${getEstadoChipClasses(
                            pago.estado
                          )}`}
                        >
                          {pago.estado === 'completado' && 'Completado'}
                          {pago.estado === 'pendiente' && 'Pendiente'}
                          {pago.estado === 'fallido' && 'Fallido'}
                          {pago.estado === 'en_revision' && 'En revisión'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pagosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm font-medium text-slate-500">
                        No se encontraron resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {pagosFiltrados.length > 0 && <Paginador />}
          </div>

          {/* VISTA CARDS (MOBILE ONLY) */}
          <div className="md:hidden space-y-3">
            {pagosPaginados.map((pago) => (
              <div 
                key={pago.pagoId} 
                className="bg-white border border-slate-200 rounded-xl p-4 active:scale-[0.98] transition-transform"
                onClick={() => openDetallePago(pago.pagoId)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{pago.cliente}</h3>
                    <p className="text-[11px] text-slate-500">{pago.id} • {formatFechaPago(pago.fecha)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getEstadoChipClasses(pago.estado)}`}>
                    {pago.estado}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Capital</p>
                    <p className="text-xs font-bold text-slate-700">{formatCurrency(pago.capital)}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Interés + Mora</p>
                    <p className="text-xs font-bold text-slate-700">{formatCurrency(pago.interes + pago.mora)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">{pago.metodo}</span> • {pago.cobrador}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-blue-600 font-bold uppercase">Total Pagado</p>
                    <p className="text-lg font-black text-slate-900 -mt-1">{formatCurrency(pago.monto)}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {pagosFiltrados.length === 0 && (
              <div className="py-8 text-center bg-white rounded-xl border border-slate-200">
                <p className="text-sm text-slate-500 font-bold">No hay pagos para mostrar</p>
              </div>
            )}
            
            {pagosFiltrados.length > 0 && (
              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200">
                <Paginador />
              </div>
            )}
          </div>

        </section>

        <PagoDetalleModal
          isOpen={showDetallePago}
          onClose={() => {
            setShowDetallePago(false)
            setDetallePagoId(null)
          }}
          metadata={{ pagoId: detallePagoId || undefined }}
        />
      </div>
    </div>
  )
}

export default HistorialPagosPage
