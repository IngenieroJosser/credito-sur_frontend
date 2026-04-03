'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import {
  ShoppingBag,
  TrendingUp,
  Package,
  Users,
  CreditCard,
  Search,
  RefreshCw,
  Eye,
  X,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ArrowUpRight,
  Banknote,
  Filter,
  Download,
  Wifi,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { prestamosService } from '@/services/prestamos-service'
import { pagosService } from '@/services/pagos-service'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface VentaPdv {
  id: string
  cliente: string
  clienteId: string
  clienteDni?: string
  clienteTelefono?: string
  articulo: string
  montoTotal: number
  cuotaInicial: number
  saldoPendiente: number
  valorCuota: number
  cuotas: number
  cuotasPagadas: number
  frecuencia: string
  tasaInteres: number
  estado: 'ACTIVO' | 'PENDIENTE' | 'COMPLETADO' | 'PENDIENTE_APROBACION' | 'EN_MORA' | 'PAGADO'
  fechaVenta: string
  fechaPrimerCobro: string
  fechaUltimoPago?: string
  vendedor: string
  vendedorId: string
  vendedorRol: string
  esVentaPdv: boolean
  observaciones?: string
  pagadoHoy: number
}

interface KpiHoy {
  ventas: number
  montoVentas: number
  cuotaInicial: number
  carteraTotal: number
  clientesActivos: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (s: string | undefined) => {
  if (!s) return '—'
  try {
    const d = new Date(s)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

const toLocalKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const estadoCfg = (estado: string) => {
  switch (estado) {
    case 'ACTIVO': return { label: 'Activo', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' }
    case 'PENDIENTE': return { label: 'Pendiente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' }
    case 'PENDIENTE_APROBACION': return { label: 'En Aprobación', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' }
    case 'COMPLETADO':
    case 'PAGADO': return { label: 'Completado', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' }
    case 'EN_MORA': return { label: 'En Mora', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' }
    default: return { label: (estado || 'Desconocido').replace(/_/g, ' '), bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' }
  }
}

const PER_PAGE = 10

type Periodo = 'HOY' | 'SEM' | 'MES' | 'AÑO'

const getDatesByPeriod = (period: Periodo) => {
  const hoy = new Date()
  let inicio = new Date(hoy)
  const fin = new Date(hoy)
  switch (period) {
    case 'HOY':
      inicio.setHours(0, 0, 0, 0)
      fin.setHours(23, 59, 59, 999)
      break
    case 'SEM': {
      const day = hoy.getDay()
      const diff = hoy.getDate() - day + (day === 0 ? -6 : 1)
      inicio.setDate(diff)
      inicio.setHours(0, 0, 0, 0)
      fin.setHours(23, 59, 59, 999)
      break
    }
    case 'MES':
      inicio.setDate(1)
      inicio.setHours(0, 0, 0, 0)
      fin.setHours(23, 59, 59, 999)
      break
    case 'AÑO':
      inicio.setMonth(0, 1)
      inicio.setHours(0, 0, 0, 0)
      fin.setHours(23, 59, 59, 999)
      break
  }
  return { inicio: toLocalKey(inicio), fin: toLocalKey(fin) }
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function SeguimientoPuntoVenta() {
  const [ventas, setVentas] = useState<VentaPdv[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [filtroVendedor, setFiltroVendedor] = useState<string>('TODOS')
  const [periodoVentas, setPeriodoVentas] = useState<Periodo | 'TODOS'>('TODOS')
  const [page, setPage] = useState(1)

  // Detalle
  const [ventaDetalle, setVentaDetalle] = useState<VentaPdv | null>(null)
  const [historialPagos, setHistorialPagos] = useState<any[]>([])
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const cargarDatos = useCallback(async () => {
    try {
      const hoyStr = toLocalKey(new Date())

      // 1. Cargar todos los créditos de artículos (tipo ARTICULO)
      const resp = await prestamosService.obtenerPrestamos({ tipo: 'ARTICULO', limit: 200 } as any)
      const todosArticulos = (resp?.prestamos || []).filter((c: any) => {
        const tipo = String(c.tipoPrestamo || c.tipo || '').toUpperCase()
        const tipoProducto = String(c.tipoProducto || '').toLowerCase()
        return tipo === 'ARTICULO' || (tipoProducto && tipoProducto !== 'efectivo')
      })

      // 2. Enriquecer con pagos del día
      const enriched: VentaPdv[] = await Promise.all(
        todosArticulos.map(async (c: any) => {
          let pagadoHoy = 0
          let fechaUltimoPago: string | undefined

          try {
            const pagosResp = await pagosService.obtenerPagos({ clienteId: c.clienteId, limit: 50 })
            const pagos = pagosResp?.pagos || []

            pagadoHoy = pagos.reduce((sum: number, p: any) => {
              const raw = p.fechaPago || p.creadoEn
              const f = raw ? (raw.includes('T') ? raw.split('T')[0] : raw) : ''
              return f === hoyStr ? sum + Number(p.montoTotal || 0) : sum
            }, 0)

            let maxDate = 0
            pagos.forEach((p: any) => {
              const d = new Date(p.fechaPago || p.creadoEn).getTime()
              if (!isNaN(d) && d > maxDate) { maxDate = d; fechaUltimoPago = p.fechaPago || p.creadoEn }
            })
          } catch { /* skip */ }

          return {
            id: c.id,
            cliente: c.cliente || 'Sin nombre',
            clienteId: c.clienteId,
            clienteDni: c.clienteDni,
            clienteTelefono: c.clienteTelefono,
            articulo: c.producto || c.tipoProducto || 'Artículo',
            montoTotal: Number(c.montoTotal || 0),
            cuotaInicial: Number(c.cuotaInicial || 0),
            saldoPendiente: Number(c.montoPendiente || 0),
            valorCuota: Number(c.valorCuota || 0),
            cuotas: Number(c.cuotasTotales || 0),
            cuotasPagadas: Number(c.cuotasPagadas || 0),
            frecuencia: c.frecuenciaPago || 'QUINCENAL',
            tasaInteres: Number(c.tasaInteres || 0),
            estado: c.estado as VentaPdv['estado'],
            fechaVenta: c.creadoEn || '',
            fechaPrimerCobro: c.fechaInicio || '',
            fechaUltimoPago,
            vendedor: c.vendedor || c.creadoPorNombre || 'Punto de Venta',
            vendedorId: c.creadoPorId || '',
            vendedorRol: String(c.creadoPorRol || c.vendedorRol || '').toUpperCase(),
            esVentaPdv: String(c.creadoPorRol || c.vendedorRol || '').toUpperCase() === 'PUNTO_DE_VENTA',
            observaciones: c.observaciones,
            pagadoHoy,
          }
        })
      )

      // Solo mantener los que fueron creados por PUNTO_DE_VENTA
      const soloVentasPdv = enriched.filter(v => 
        v.vendedorRol === 'PUNTO_DE_VENTA' || v.esVentaPdv
      )

      setVentas(soloVentasPdv)

      // Log de depuración: ver qué campos envía el backend
      if (soloVentasPdv.length > 0) {
        console.log('[SeguimientoPdv] Ejemplo de venta:', {
          vendedor: soloVentasPdv[0].vendedor,
          vendedorId: soloVentasPdv[0].vendedorId,
          vendedorRol: soloVentasPdv[0].vendedorRol,
        })
      }

    } catch (err) {
      console.error('[SeguimientoPdv] Error cargando datos:', err)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await cargarDatos()
      setLoading(false)
    }
    init()
  }, [cargarDatos])

  // ── Tiempo real via hook estándar del proyecto ───────────────────────────
  const handleRealtimeRefresh = useCallback(async () => {
    setRefreshing(true)
    await cargarDatos()
    setLastUpdate(new Date())
    setRefreshing(false)
  }, [cargarDatos])

  useRealtimeData(
    ['prestamos_actualizados', 'pagos_actualizados', 'clientes_actualizados', 'dashboards_actualizados'],
    handleRealtimeRefresh,
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await cargarDatos()
    setLastUpdate(new Date())
    setRefreshing(false)
  }

  // ─── Abrir detalle ────────────────────────────────────────────────────────

  const abrirDetalle = useCallback(async (venta: VentaPdv) => {
    setVentaDetalle(venta)
    setLoadingDetalle(true)
    try {
      const resp = await pagosService.obtenerPagos({ clienteId: venta.clienteId, limit: 100 })
      const pagos = (resp?.pagos || []).filter((p: any) => {
        // Filtrar pagos asociados al préstamo
        return !p.prestamoId || p.prestamoId === venta.id
      })
      pagos.sort((a: any, b: any) => new Date(b.fechaPago || b.creadoEn).getTime() - new Date(a.fechaPago || a.creadoEn).getTime())
      setHistorialPagos(pagos.slice(0, 20))
    } catch {
      setHistorialPagos([])
    } finally {
      setLoadingDetalle(false)
    }
  }, [])

  // ─── Filtros y paginación ─────────────────────────────────────────────────

  // Vendedores únicos (para el selector)
  const vendedoresUnicos = useMemo(() => {
    const seen = new Set<string>()
    return ventas
      .filter(v => v.vendedor && v.vendedor !== 'Punto de Venta')
      .filter(v => { if (seen.has(v.vendedorId || v.vendedor)) return false; seen.add(v.vendedorId || v.vendedor); return true })
      .map(v => ({ id: v.vendedorId || v.vendedor, nombre: v.vendedor }))
  }, [ventas])

  const ventasFiltradas = useMemo(() => {
    let result = ventas
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(v =>
        v.cliente.toLowerCase().includes(q) ||
        v.articulo.toLowerCase().includes(q) ||
        (v.clienteDni || '').includes(q) ||
        (v.clienteTelefono || '').includes(q)
      )
    }
    if (filtroEstado !== 'TODOS') {
      result = result.filter(v => v.estado === filtroEstado)
    }
    if (filtroVendedor !== 'TODOS') {
      result = result.filter(v => (v.vendedorId || v.vendedor) === filtroVendedor)
    }
    if (filtroFechaDesde) {
      result = result.filter(v => {
        const f = v.fechaVenta.includes('T') ? v.fechaVenta.split('T')[0] : v.fechaVenta
        return f >= filtroFechaDesde
      })
    }
    if (filtroFechaHasta) {
      result = result.filter(v => {
        const f = v.fechaVenta.includes('T') ? v.fechaVenta.split('T')[0] : v.fechaVenta
        return f <= filtroFechaHasta
      })
    }
    // Filtro por periodo (Hoy/Sem/Mes/Año) — ignora si hay fechas manuales
    if (periodoVentas !== 'TODOS' && !filtroFechaDesde && !filtroFechaHasta) {
      const { inicio, fin } = getDatesByPeriod(periodoVentas)
      result = result.filter(v => {
        const f = v.fechaVenta.includes('T') ? v.fechaVenta.split('T')[0] : v.fechaVenta
        return f >= inicio && f <= fin
      })
    }
    return result
  }, [ventas, search, filtroEstado, filtroVendedor, filtroFechaDesde, filtroFechaHasta, periodoVentas])

  const totalPages = Math.max(1, Math.ceil(ventasFiltradas.length / PER_PAGE))
  const ventasPaginadas = ventasFiltradas.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const resetFiltros = () => {
    setSearch(''); setFiltroEstado('TODOS'); setFiltroVendedor('TODOS')
    setFiltroFechaDesde(''); setFiltroFechaHasta(''); setPeriodoVentas('TODOS'); setPage(1)
  }

  // ─── KPIs reactivos — derivados del conjunto filtrado ───────────────────────
  const kpis = useMemo(() => {
    const activos = ventasFiltradas.filter(v =>
      v.estado === 'ACTIVO' ||
      v.estado === 'PENDIENTE' ||
      v.estado === 'EN_MORA' ||
      v.estado === 'PENDIENTE_APROBACION'
    )
    return {
      ventas: ventasFiltradas.length,
      montoVentas: ventasFiltradas.reduce((s, v) => s + v.montoTotal, 0),
      cuotaInicial: ventasFiltradas.reduce((s, v) => s + v.cuotaInicial, 0),
      carteraTotal: activos.reduce((s, v) => s + v.saldoPendiente, 0),
      clientesActivos: activos.length,
    }
  }, [ventasFiltradas])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 sticky top-16 z-10 w-full">
        <div className="mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">Seguimiento · Punto de Venta</h1>
              <p className="text-xs text-slate-500 font-medium">Monitoreo en tiempo real de créditos artículo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Removido badge En vivo y botón Actualizar a petición del usuario */}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 w-full">

        {/* ── KPIs del día ───────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: `Ventas ${periodoVentas === 'TODOS' ? 'totales' : periodoVentas.toLowerCase()}`, value: kpis.ventas.toString(), icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
              { label: `Monto ${periodoVentas === 'TODOS' ? 'total' : periodoVentas.toLowerCase()}`, value: formatCurrency(kpis.montoVentas), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'Cuota inicial', value: formatCurrency(kpis.cuotaInicial), icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'Cartera activa', value: formatCurrency(kpis.carteraTotal), icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
              { label: 'Créditos activos', value: kpis.clientesActivos.toString(), icon: Users, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg ${kpi.bg} ${kpi.border} border flex items-center justify-center`}>
                    <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{kpi.label}</span>
                </div>
                <p className={`text-lg font-black ${kpi.color} leading-tight`}>{kpi.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Filtros ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          {/* Botones Periodo */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Periodo de venta</span>
            <div className="flex gap-1 ml-auto">
              {(['TODOS', 'HOY', 'SEM', 'MES', 'AÑO'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => { setPeriodoVentas(p); setFiltroFechaDesde(''); setFiltroFechaHasta(''); setPage(1) }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    periodoVentas === p
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {p === 'TODOS' ? 'Todo' : p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Buscador */}
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente, artículo, cédula, teléfono…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Estado */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={filtroEstado}
                onChange={e => { setFiltroEstado(e.target.value); setPage(1) }}
                className="text-sm font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVO">Activo</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PENDIENTE_APROBACION">En Aprobación</option>
                <option value="COMPLETADO">Completado</option>
              </select>
            </div>

            {/* Vendedor PDV */}
            {vendedoresUnicos.length > 1 && (
              <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                <Users className="h-3.5 w-3.5 text-orange-500" />
                <select
                  value={filtroVendedor}
                  onChange={e => { setFiltroVendedor(e.target.value); setPage(1) }}
                  className="text-sm font-bold text-orange-700 bg-transparent border-none outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos los vendedores</option>
                  {vendedoresUnicos.map(v => (
                    <option key={v.id} value={v.id}>{v.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Fechas */}
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={e => { setFiltroFechaDesde(e.target.value); setPage(1) }}
              title="Desde"
              className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700 font-medium"
            />
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={e => { setFiltroFechaHasta(e.target.value); setPage(1) }}
              title="Hasta"
              className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700 font-medium"
            />

            {/* Reset */}
            {(search || filtroEstado !== 'TODOS' || filtroVendedor !== 'TODOS' || filtroFechaDesde || filtroFechaHasta || periodoVentas !== 'TODOS') && (
              <button
                onClick={resetFiltros}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* ── Tabla de ventas ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Subtítulo */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Créditos Artículo</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{ventasFiltradas.length} registros encontrados</p>
            </div>
            <div className="flex items-center gap-2">
              {refreshing && <span className="text-xs text-slate-400 animate-pulse font-medium">Actualizando…</span>}
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Cargando datos del punto de venta…</p>
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <ShoppingBag className="h-14 w-14 text-slate-200 mb-4" />
              <p className="text-base font-bold text-slate-700">Sin resultados</p>
              <p className="text-sm font-medium mt-1">No hay créditos artículo que coincidan con los filtros.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="px-6 py-3">Cliente</th>
                      <th className="px-4 py-3">Artículo</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3">Saldo</th>
                      <th className="px-4 py-3">Cuotas</th>
                      <th className="px-4 py-3">Pago Hoy</th>
                      <th className="px-4 py-3">Último Pago</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ventasPaginadas.map(venta => {
                      const cfg = estadoCfg(venta.estado)
                      const progreso = venta.cuotas > 0 ? Math.round((venta.cuotasPagadas / venta.cuotas) * 100) : 0
                      return (
                        <tr key={venta.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-100 to-rose-100 border border-orange-200 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-black text-orange-700">
                                  {venta.cliente.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate max-w-[140px]">{venta.cliente}</p>
                                {venta.clienteDni && <p className="text-[10px] text-slate-400 font-mono">CC: {venta.clienteDni}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{venta.articulo}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-black text-slate-900">{formatCurrency(venta.montoTotal)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-black ${venta.saldoPendiente > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                              {formatCurrency(venta.saldoPendiente)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${progreso >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                  style={{ width: `${Math.min(100, progreso)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">{venta.cuotasPagadas}/{venta.cuotas}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {venta.pagadoHoy > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3 w-3" />
                                {formatCurrency(venta.pagadoHoy)}
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-medium text-slate-500">{fmtDate(venta.fechaUltimoPago)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => abrirDetalle(venta)}
                              className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-400 hover:text-orange-600 transition-colors"
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-50">
                {ventasPaginadas.map(venta => {
                  const cfg = estadoCfg(venta.estado)
                  const progreso = venta.cuotas > 0 ? Math.round((venta.cuotasPagadas / venta.cuotas) * 100) : 0
                  return (
                    <div key={venta.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-rose-100 border border-orange-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-black text-orange-700">
                              {venta.cliente.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{venta.cliente}</p>
                            <p className="text-xs text-slate-500 truncate">{venta.articulo}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          <button onClick={() => abrirDetalle(venta)} className="p-1.5 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-orange-600 transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs font-black text-slate-900">{formatCurrency(venta.montoTotal)}</span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[11px] font-bold text-amber-700">Saldo: {formatCurrency(venta.saldoPendiente)}</span>
                        {venta.pagadoHoy > 0 && (
                          <>
                            <span className="text-[10px] text-slate-400">·</span>
                            <span className="text-[11px] font-black text-emerald-600">+{formatCurrency(venta.pagadoHoy)} hoy</span>
                          </>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-1">
                          <div className={`h-1 rounded-full ${progreso >= 100 ? 'bg-emerald-500' : 'bg-orange-400'}`} style={{ width: `${Math.min(100, progreso)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">{venta.cuotasPagadas}/{venta.cuotas}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Paginador */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-[11px] text-slate-400 font-medium">
                  {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, ventasFiltradas.length)} de {ventasFiltradas.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-3">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modal de Detalle ──────────────────────────────────────── */}
      {ventaDetalle && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setVentaDetalle(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-rose-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-md">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">{ventaDetalle.cliente}</h3>
                    <p className="text-xs text-slate-500 font-medium">{ventaDetalle.articulo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${estadoCfg(ventaDetalle.estado).bg} ${estadoCfg(ventaDetalle.estado).text} ${estadoCfg(ventaDetalle.estado).border}`}>
                    <span className={`w-2 h-2 rounded-full ${estadoCfg(ventaDetalle.estado).dot}`} />
                    {estadoCfg(ventaDetalle.estado).label}
                  </span>
                  <button onClick={() => setVentaDetalle(null)} className="p-2 rounded-xl hover:bg-white/50 text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Body modal */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Información del cliente */}
              <section>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Información del Cliente</p>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-rose-100 border border-orange-200 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-orange-700">
                      {ventaDetalle.cliente.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900">{ventaDetalle.cliente}</p>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {ventaDetalle.clienteDni && <span className="text-xs text-slate-500 font-mono">CC: {ventaDetalle.clienteDni}</span>}
                      {ventaDetalle.clienteTelefono && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="h-3 w-3" />{ventaDetalle.clienteTelefono}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Desglose financiero */}
              <section>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Desglose Financiero</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Monto Total</p>
                    <p className="text-xl font-black text-blue-900">{formatCurrency(ventaDetalle.montoTotal)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Cuota Inicial</p>
                    <p className="text-xl font-black text-emerald-800">{formatCurrency(ventaDetalle.cuotaInicial)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                    <p className="text-xl font-black text-amber-900">{formatCurrency(ventaDetalle.saldoPendiente)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Cuota</p>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(ventaDetalle.valorCuota)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { label: 'Tasa', value: `${ventaDetalle.tasaInteres}%` },
                    { label: 'Frecuencia', value: ventaDetalle.frecuencia },
                    { label: 'Vendedor', value: ventaDetalle.vendedor },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-black text-slate-800 mt-0.5 truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Progreso cuotas */}
              <section>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Progreso de Cuotas</p>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  {(() => {
                    const progreso = ventaDetalle.cuotas > 0 ? Math.round((ventaDetalle.cuotasPagadas / ventaDetalle.cuotas) * 100) : 0
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-700">{ventaDetalle.cuotasPagadas} de {ventaDetalle.cuotas} cuotas</span>
                          <span className={`text-sm font-black ${progreso >= 100 ? 'text-emerald-600' : 'text-orange-600'}`}>{progreso}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${progreso >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-400 to-rose-500'}`}
                            style={{ width: `${Math.min(100, progreso)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[11px] text-slate-400">Pagadas: {ventaDetalle.cuotasPagadas}</span>
                          <span className="text-[11px] text-slate-400">Restantes: {ventaDetalle.cuotas - ventaDetalle.cuotasPagadas}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </section>

              {/* Fechas */}
              <section>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fechas</p>
                <div className="space-y-2">
                  {[
                    { icon: Calendar, label: 'Fecha de venta', value: fmtDate(ventaDetalle.fechaVenta) },
                    { icon: ArrowUpRight, label: 'Primer cobro', value: fmtDate(ventaDetalle.fechaPrimerCobro) },
                    { icon: CheckCircle2, label: 'Último pago', value: fmtDate(ventaDetalle.fechaUltimoPago) },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-sm text-slate-500 flex items-center gap-2">
                        <item.icon className="h-3.5 w-3.5" />{item.label}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                  {ventaDetalle.pagadoHoy > 0 && (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="text-sm text-emerald-600 flex items-center gap-2 font-bold">
                        <DollarSign className="h-3.5 w-3.5" />Pagado HOY
                      </span>
                      <span className="text-sm font-black text-emerald-700">{formatCurrency(ventaDetalle.pagadoHoy)}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Historial de pagos */}
              <section>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Historial de Pagos</p>
                {loadingDetalle ? (
                  <div className="text-center py-6 text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs font-medium">Cargando historial…</p>
                  </div>
                ) : historialPagos.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                    <p className="text-sm font-medium">Sin pagos registrados</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
                    {historialPagos.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.metodoPago === 'TRANSFERENCIA' ? 'bg-blue-50 border border-blue-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                            <Banknote className={`h-3.5 w-3.5 ${p.metodoPago === 'TRANSFERENCIA' ? 'text-blue-500' : 'text-emerald-500'}`} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(p.montoTotal || 0))}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {fmtDate(p.fechaPago || p.creadoEn)} · {p.metodoPago === 'TRANSFERENCIA' ? 'Transferencia' : 'Efectivo'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                          Pago #{p.numeroPago || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {ventaDetalle.observaciones && (
                <section>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observaciones</p>
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <p className="text-sm text-amber-900">{ventaDetalle.observaciones}</p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
