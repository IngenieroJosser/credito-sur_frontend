'use client'

/**
 * ============================================================================
 * CUENTAS VENCIDAS — Rediseñado
 * ============================================================================
 *
 * Aquí llegan los préstamos cuyo contrato ya venció (fechaFin < hoy)
 * y todavía tienen saldo pendiente.
 *
 * Flujo coordinador / admin:
 * - PRORROGAR: extender el plazo + opcionalmente cobrar mora adicional
 * - CASTIGAR: marcar como pérdida contable
 * - JURÍDICO: escalar a cobro jurídico
 *
 * Flujo contador:
 * - Solo puede PROCESAR CASTIGO (contabilizar la pérdida)
 */

import { useState, useEffect, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { usePageFocusRefresh } from '@/hooks/usePageFocusRefresh'
import {
  Archive, Search, Clock, LayoutGrid, List, Calendar,
  AlertCircle as AlertCircleIcon, CheckCircle, XCircle,
  Scale, FileText, RefreshCw, DollarSign, Timer,
  TrendingDown, Users, Gavel, ArrowRight, CalendarX
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'
import GestionarVencidaModal from '@/components/cobranza/GestionarVencidaModal'
import ProcesarCastigoModal from '@/components/contable/ProcesarCastigoModal'
import ProtectedPage from '@/components/auth/ProtectedPage'
import { usePermission } from '@/hooks/usePermission'
import { apiRequest } from '@/lib/api/api'
import {
  vencidasService,
  type CuentaVencida,
  type NivelRiesgo,
  type DecisionCastigo,
  type DecisionCastigoRequest
} from '@/services/vencidas-service'
import { exportService } from '@/services/export-service'
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'
import { toast } from 'sonner'
import { offlineStore } from '@/lib/offline/offlineDb'

type ViewMode = 'list' | 'grid'

// ── Helpers ──────────────────────────────────────────────────────────────────

function diasVencidosDesde(fecha: string): number {
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const d = new Date(fecha); d.setHours(0,0,0,0)
  return Math.max(0, Math.ceil((hoy.getTime() - d.getTime()) / (1000*60*60*24)))
}

function severidadVencida(dias: number): { label: string; badge: string; barColor: string } {
  if (dias >= 90) return { label: 'Crítico',    badge: 'bg-rose-100 text-rose-800 border-rose-200',   barColor: 'bg-rose-600' }
  if (dias >= 60) return { label: 'Grave',      badge: 'bg-orange-100 text-orange-800 border-orange-200', barColor: 'bg-orange-500' }
  if (dias >= 30) return { label: 'Moderado',   badge: 'bg-amber-100 text-amber-800 border-amber-200',  barColor: 'bg-amber-500' }
  return               { label: 'Reciente',   badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', barColor: 'bg-yellow-500' }
}

function getEstadoBadge(estado: string) {
  const config: Record<string, { color: string; label: string }> = {
    'EN_MORA':   { color: 'bg-amber-50 text-amber-700 border-amber-200',   label: 'En Mora' },
    'INCUMPLIDO':{ color: 'bg-rose-50  text-rose-700  border-rose-200',    label: 'Incumplido' },
    'PERDIDA':   { color: 'bg-slate-900 text-white border-slate-700',       label: 'Pérdida' },
  }
  const { color, label } = config[estado] || { color: 'bg-slate-100 text-slate-600 border-slate-200', label: estado }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black border inline-flex items-center gap-1', color)}>
      {label}
    </span>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

function CuentasVencidasContent() {
  const { can, rol } = usePermission()
  const esContador = rol === 'CONTADOR'

  const [cuentas, setCuentas] = useState<CuentaVencida[]>([])
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showGestionarModal, setShowGestionarModal] = useState(false)
  const [showCastigoModal, setShowCastigoModal] = useState(false)
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaVencida | null>(null)
  const [filtroRuta, setFiltroRuta] = useState<string | null>(null)
  const [filtroSeveridad, setFiltroSeveridad] = useState<string>('TODOS')
  const [totales, setTotales] = useState({ totalVencido: 0, diasPromedioVencimiento: 0 })

  const rolesConGestion = ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'CONTADOR']
  const puedeGestionar = can('CUENTAS_VENCIDAS_GESTIONAR') || can('CUENTAS_VENCIDAS_PROCESAR') || rolesConGestion.includes(rol || '')
  const puedeExportar = can('CUENTAS_VENCIDAS_EXPORTAR') || rolesConGestion.includes(rol || '')

  const fetchCuentasVencidas = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const filtros = {
        busqueda: busqueda || undefined,
        rutaId: filtroRuta || undefined,
      }
      const response = await vencidasService.obtenerCuentasVencidas(filtros)
      setCuentas(response.cuentas)
      setTotales({ totalVencido: response.totales.totalVencido, diasPromedioVencimiento: response.totales.diasPromedioVencimiento })
    } catch (err) {
      console.error('Error fetching cuentas vencidas:', err)
      try {
        const offPrestamos = await offlineStore.getAll<any>('prestamos')
        const offClientes = await offlineStore.getAll<any>('clientes')
        const vencidas: CuentaVencida[] = offPrestamos
          .filter((p: any) => p.estado === 'EN_MORA' || p.estado === 'INCUMPLIDO')
          .map((p: any) => {
            const cli = offClientes.find((c: any) => c.id === p.clienteId)
            return {
              id: p.id, numeroPrestamo: p.numeroPrestamo || p.id,
              cliente: { nombre: cli ? `${cli.nombres} ${cli.apellidos}` : '', documento: cli?.dni || '' },
              fechaVencimiento: p.fechaFin || '',
              diasVencidos: diasVencidosDesde(p.fechaFin || toBogotaDateTimeOffsetIso(new Date())),
              saldoPendiente: p.saldoPendiente || 0, montoOriginal: p.monto || 0,
              ruta: '', nivelRiesgo: 'ROJO' as NivelRiesgo, estado: p.estado,
            } as any
          })
        if (vencidas.length > 0) { setCuentas(vencidas); setError(null); return }
      } catch { /* ignore */ }
      setError('Error al cargar las cuentas vencidas')
      toast.error('No se pudieron cargar las cuentas vencidas')
    } finally {
      setLoading(false)
    }
  }, [busqueda, filtroRuta])

  const handleExportExcel = async () => {
    setExportLoading(true)
    try { await exportService.exportCuentasVencidas('excel', { busqueda: busqueda || undefined }); toast.success('Reporte descargado') }
    catch { toast.error('Error al exportar') } finally { setExportLoading(false) }
  }
  const handleExportPDF = async () => {
    setExportLoading(true)
    try { await exportService.exportCuentasVencidas('pdf', { busqueda: busqueda || undefined }); toast.success('Reporte descargado') }
    catch { toast.error('Error al exportar') } finally { setExportLoading(false) }
  }

  const handleAccion = (cuenta: CuentaVencida) => {
    setSelectedCuenta(cuenta)
    if (esContador) setShowCastigoModal(true)
    else setShowGestionarModal(true)
  }

  const handleSaveDecision = async (data: {
    decision: DecisionCastigo; montoInteres: number; comentarios?: string; diasGracia?: number
  }) => {
    try {
      if (!selectedCuenta) return

      // Llamar al endpoint de gestion vencida
      await apiRequest('POST', `loans/${selectedCuenta.id}/gestion-vencida`, {
        decision: data.decision,
        montoInteres: data.montoInteres,
        diasGracia: data.diasGracia ?? 0,
        comentarios: data.comentarios,
      })

      const LABEL: Record<string, string> = {
        PRORROGAR: 'Prorroga',
        CASTIGAR: 'Baja por perdida',
        JURIDICO: 'Cobro juridico',
        DEJAR_QUIETO: 'Sin mora por ahora',
      }

      const descripcion = data.decision === 'PRORROGAR'
        ? 'La solicitud fue enviada a revisiones y se aplicara al ser aprobada.'
        : 'Los aprobadores recibieron una notificacion. La accion se aplicara al ser aprobada.'

      toast.success(
        `${LABEL[data.decision] || data.decision} enviada a revision`,
        { description: descripcion }
      )
      setShowGestionarModal(false); setShowCastigoModal(false); setSelectedCuenta(null)
      fetchCuentasVencidas()
    } catch (e: any) {
      toast.error(e?.message || 'Error al procesar la decision')
    }
  }

  useEffect(() => { fetchCuentasVencidas() }, [])
  useEffect(() => {
    const t = setTimeout(() => fetchCuentasVencidas(), 500)
    return () => clearTimeout(t)
  }, [busqueda, filtroRuta, fetchCuentasVencidas])

  // Tiempo real: pagos y préstamos afectan las cuentas vencidas
  useRealtimeData(
    ['pagos_actualizados', 'prestamos_actualizados', 'aprobaciones_actualizadas'],
    fetchCuentasVencidas,
  )
  usePageFocusRefresh(fetchCuentasVencidas)

  // Filtro local por severidad
  const cuentasFiltradas = filtroSeveridad === 'TODOS'
    ? cuentas
    : cuentas.filter(c => severidadVencida(c.diasVencidos).label === filtroSeveridad)

  // Conteo por severidad
  const porSeveridad: Record<string, number> = {}
  cuentas.forEach(c => {
    const s = severidadVencida(c.diasVencidos).label
    porSeveridad[s] = (porSeveridad[s] || 0) + 1
  })

  const totalCapital = cuentasFiltradas.reduce((a, c) => a + c.saldoPendiente, 0)

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-500 opacity-10 blur-[100px]" />
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 mb-2 border border-slate-200">
              <CalendarX className="h-3.5 w-3.5" />
              <span>{esContador ? 'Contabilidad / Cartera Castigada' : 'Cuentas Vencidas — Contrato Expirado'}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Cuentas </span>
              <span className="text-slate-900">Vencidas</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1 font-medium">
              {esContador
                ? 'Gestión contable de créditos expirados y procesos de castigo de cartera.'
                : 'Créditos con contrato expirado que aún tienen saldo pendiente. Define la acción: prorrogar, castigar o escalar.'}
              <span className="text-slate-400 ml-2">({cuentasFiltradas.length} registros)</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCuentasVencidas}
              className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-xl shadow-sm transition-all"
              title="Actualizar"
            >
              <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
            </button>
            {puedeExportar && (
              <ExportButton label="Exportar" onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
            )}
          </div>
        </div>

        {/* ── Métricas ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Capital Vencido', value: formatCurrency(totales.totalVencido), icon: <TrendingDown className="h-5 w-5 text-rose-600" />, bg: 'bg-rose-50' },
            { label: 'Días Prom. Vencido', value: `${totales.diasPromedioVencimiento} días`, icon: <Clock className="h-5 w-5 text-amber-600" />, bg: 'bg-amber-50' },
            { label: 'Total Contratos', value: String(cuentas.length), icon: <Archive className="h-5 w-5 text-slate-600" />, bg: 'bg-slate-100' },
            { label: 'Capital Visible', value: formatCurrency(totalCapital), icon: <DollarSign className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-50' },
          ].map(m => (
            <div key={m.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={cn('p-2.5 rounded-xl', m.bg)}>{m.icon}</div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filtro por severidad ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {['TODOS', 'Reciente', 'Moderado', 'Grave', 'Crítico'].map(s => {
            const count = s === 'TODOS' ? cuentas.length : (porSeveridad[s] || 0)
            const isActive = filtroSeveridad === s
            const badgeConfig: Record<string, string> = {
              'Reciente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
              'Moderado':  'bg-amber-100 text-amber-800 border-amber-200',
              'Grave':     'bg-orange-100 text-orange-800 border-orange-200',
              'Crítico':   'bg-rose-100 text-rose-800 border-rose-200',
            }
            return (
              <button
                key={s}
                onClick={() => setFiltroSeveridad(s)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all',
                  isActive
                    ? s === 'TODOS'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : cn(badgeConfig[s] || '', 'shadow-sm')
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                )}
              >
                {s}
                <span className={cn('ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black', isActive ? 'bg-white/30' : 'bg-slate-100 text-slate-500')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Filtros ── */}
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 w-full md:w-auto">
            <FiltroRuta onRutaChange={r => setFiltroRuta(r)} selectedRutaId={filtroRuta} showAllOption hideLabel />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente o número de préstamo..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 outline-none"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-slate-400')}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-400')}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Contenido ── */}
        {loading && cuentasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-slate-500 font-medium">Cargando cuentas vencidas...</p>
          </div>
        ) : error && cuentasFiltradas.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
            <AlertCircleIcon className="h-12 w-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Error al cargar datos</h3>
            <p className="text-slate-500 mb-4">{error}</p>
            <button onClick={fetchCuentasVencidas} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold transition-colors">
              Reintentar
            </button>
          </div>
        ) : cuentasFiltradas.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="inline-flex p-4 rounded-full bg-slate-100 mb-4">
              <Archive className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Sin cuentas vencidas</h3>
            <p className="text-slate-500 font-medium">No se encontraron contratos expirados con los filtros aplicados.</p>
          </div>
        ) : viewMode === 'list' ? (

          /* ── LISTA ── */
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Préstamo / Cliente</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Severidad</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Estado</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Venció</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-center">Días Vencido</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Saldo</th>
                    {puedeGestionar && <th className="px-6 py-4 font-bold tracking-wider text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cuentasFiltradas.map(c => {
                    const severidad = severidadVencida(c.diasVencidos)
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                            {c.numeroPrestamo}
                          </div>
                          <div className="text-xs text-slate-600 font-medium">{c.cliente.nombre}</div>
                          <div className="text-[10px] text-slate-400">{c.ruta}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black border', severidad.badge)}>
                            {severidad.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {getEstadoBadge(c.estado)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(c.fechaVencimiento).toLocaleDateString('es-CO')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-xs font-black border border-rose-100">
                            {c.diasVencidos}d
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-black text-slate-900">{formatCurrency(c.saldoPendiente)}</div>
                          <div className="text-[10px] text-slate-400">Original: {formatCurrency(c.montoOriginal)}</div>
                        </td>
                        {puedeGestionar && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleAccion(c)}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm hover:shadow-md',
                                esContador
                                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                                  : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300'
                              )}
                            >
                              {esContador ? <Archive className="h-3.5 w-3.5" /> : <Gavel className="h-3.5 w-3.5" />}
                              {esContador ? 'Procesar' : 'Gestionar'}
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        ) : (

          /* ── GRID ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cuentasFiltradas.map(cuenta => {
              const severidad = severidadVencida(cuenta.diasVencidos)
              return (
                <div key={cuenta.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group">
                  <div className={cn('h-1.5 w-full', severidad.barColor)} />
                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-black text-slate-900 group-hover:text-primary transition-colors">
                          {cuenta.numeroPrestamo}
                        </div>
                        <div className="text-sm text-slate-600 font-medium">{cuenta.cliente.nombre}</div>
                        <div className="text-xs text-slate-400">{cuenta.cliente.documento}</div>
                      </div>
                      <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black border', severidad.badge)}>
                        {severidad.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Vencido hace</p>
                        <p className="font-black text-rose-700 text-lg">{cuenta.diasVencidos}d</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo</p>
                        <p className="font-black text-slate-900">{formatCurrency(cuenta.saldoPendiente)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-500">Venció: <span className="font-bold text-slate-700">{new Date(cuenta.fechaVencimiento).toLocaleDateString('es-CO')}</span></span>
                    </div>

                    <div className="flex items-center justify-between">
                      {getEstadoBadge(cuenta.estado)}
                      <span className="text-[10px] text-slate-400 font-medium">{cuenta.ruta || 'Sin ruta'}</span>
                    </div>
                  </div>

                  {puedeGestionar && (
                    <div className="px-5 pb-4">
                      <button
                        onClick={() => handleAccion(cuenta)}
                        className={cn(
                          'w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm',
                          esContador
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white hover:border-rose-600'
                        )}
                      >
                        {esContador ? <Archive className="h-3.5 w-3.5" /> : <Gavel className="h-3.5 w-3.5" />}
                        {esContador ? 'Procesar Castigo' : 'Gestionar Cuenta'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Gestionar (Admin/Coordinador) */}
      {showGestionarModal && selectedCuenta && (
        <GestionarVencidaModal
          cuenta={selectedCuenta}
          onClose={() => { setShowGestionarModal(false); setSelectedCuenta(null) }}
          onConfirm={data => {
            handleSaveDecision({ decision: data.decision, montoInteres: data.montoInteres, comentarios: data.comentarios, diasGracia: data.diasGracia })
          }}
        />
      )}

      {/* Modal Procesar Castigo (Contador) */}
      {showCastigoModal && selectedCuenta && (
        <ProcesarCastigoModal
          cuenta={selectedCuenta}
          onClose={() => { setShowCastigoModal(false); setSelectedCuenta(null) }}
          onConfirm={data => { setShowCastigoModal(false); setSelectedCuenta(null) }}
        />
      )}
    </div>
  )
}

export default function CuentasVencidasPage() {
  return (
    <ProtectedPage permiso="CUENTAS_VENCIDAS_VIEW">
      <CuentasVencidasContent />
    </ProtectedPage>
  )
}
