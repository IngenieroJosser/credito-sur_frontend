'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingBag,
  UserPlus,
  Clock,
  X,
  CalendarDays,
  CreditCard,
  Hash,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Package,
  Search,
  Eye,
  Users,
  Phone,
  Mail,
  MapPin,
  Shield,
  Loader2,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { prestamosService } from '@/services/prestamos-service'
import { clientesService, Cliente } from '@/services/clientes-service'
import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import ClientePortalModal from '@/components/cliente/ClientePortalModal'
import ArticulosContent from '@/components/articulos/ArticulosContent'

interface VentaReciente {
  id: string
  cliente: string
  clienteId?: string
  clienteDni?: string
  clienteTelefono?: string
  articulo: string
  monto: number
  cuotaInicial: number
  cuotas: number
  cuotasPagadas: number
  valorCuota: number
  frecuencia: string
  tasaInteres: number
  saldoPendiente: number
  tipo: 'CREDITO' | 'CONTADO'
  estado: 'ACTIVO' | 'PENDIENTE' | 'COMPLETADO'
  fecha: string
  fechaPrimerCobro: string
  fechaUltimoPago?: string
  vendedor: string
  observaciones?: string
}

const VENTAS_PER_PAGE = 5
const CLIENTES_PER_PAGE = 5

// ─── Helpers ───
const formatDateShort = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'N/A'
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return 'N/A' }
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch { return '' }
}

const getEstadoConfig = (estado: VentaReciente['estado']) => {
  switch (estado) {
    case 'ACTIVO': return { label: 'Activo', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' }
    case 'PENDIENTE': return { label: 'Pendiente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' }
    case 'COMPLETADO': return { label: 'Completado', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' }
  }
}

const getRiesgoStyle = (riesgo: string) => {
  switch (riesgo) {
    case 'VERDE': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' }
    case 'AMARILLO': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' }
    case 'ROJO': return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' }
    case 'LISTA_NEGRA': return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-600' }
    default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' }
  }
}

export default function VistaPuntoDeVenta() {
  const router = useRouter()

  // ─── Modals state ───
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showCreditoModal, setShowCreditoModal] = useState(false)
  const [showVentasModal, setShowVentasModal] = useState(false)
  const [showClientesModal, setShowClientesModal] = useState(false)
  const [showVentaDetalle, setShowVentaDetalle] = useState<VentaReciente | null>(null)
  const [showClienteDetalle, setShowClienteDetalle] = useState<string | null>(null)

  // ─── Ventas state ───
  const [ventasRecientes, setVentasRecientes] = useState<VentaReciente[]>([])
  const [loadingVentas, setLoadingVentas] = useState(false)
  const [ventasSearch, setVentasSearch] = useState('')
  const [ventasFechaDesde, setVentasFechaDesde] = useState('')
  const [ventasFechaHasta, setVentasFechaHasta] = useState('')
  const [ventasPage, setVentasPage] = useState(1)

  // ─── Clientes state ───
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [clientesSearch, setClientesSearch] = useState('')
  const [clientesPage, setClientesPage] = useState(1)

  // ─── Ventas: filtered + paginated ───
  const ventasFiltradas = useMemo(() => {
    let result = ventasRecientes
    if (ventasSearch.trim()) {
      const q = ventasSearch.toLowerCase()
      result = result.filter(v => v.cliente.toLowerCase().includes(q) || v.articulo.toLowerCase().includes(q) || v.id.toLowerCase().includes(q))
    }
    if (ventasFechaDesde) {
      result = result.filter(v => v.fecha >= ventasFechaDesde)
    }
    if (ventasFechaHasta) {
      const hasta = ventasFechaHasta + 'T23:59:59'
      result = result.filter(v => v.fecha <= hasta)
    }
    return result
  }, [ventasRecientes, ventasSearch, ventasFechaDesde, ventasFechaHasta])

  const ventasTotalPages = Math.max(1, Math.ceil(ventasFiltradas.length / VENTAS_PER_PAGE))
  const ventasPaginadas = ventasFiltradas.slice((ventasPage - 1) * VENTAS_PER_PAGE, ventasPage * VENTAS_PER_PAGE)

  // ─── Clientes: filtered + paginated ───
  const clientesFiltrados = useMemo(() => {
    if (!clientesSearch.trim()) return clientes
    const q = clientesSearch.toLowerCase()
    return clientes.filter(c =>
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(q) ||
      c.dni.toLowerCase().includes(q) ||
      c.telefono.includes(q) ||
      (c.correo || '').toLowerCase().includes(q)
    )
  }, [clientes, clientesSearch])

  const clientesTotalPages = Math.max(1, Math.ceil(clientesFiltrados.length / CLIENTES_PER_PAGE))
  const clientesPaginados = clientesFiltrados.slice((clientesPage - 1) * CLIENTES_PER_PAGE, clientesPage * CLIENTES_PER_PAGE)

  // ─── Fetch functions ───
  const fetchVentasRecientes = async () => {
    setLoadingVentas(true)
    setVentasPage(1)
    setVentasSearch('')
    setVentasFechaDesde('')
    setVentasFechaHasta('')
    try {
      const creditosData = await prestamosService.obtenerPrestamos({ tipo: 'ARTICULO', limit: 20 } as any)
      const soloArticulos = (creditosData?.prestamos || []).filter((c: any) => {
        const tipoPrestamo = String(c.tipoPrestamo || c.tipo || '').toUpperCase()
        const tipoProducto = String(c.tipoProducto || '').toLowerCase()
        if (tipoPrestamo === 'ARTICULO') return true
        if (tipoProducto && tipoProducto !== 'efectivo') return true
        return false
      })
      const ventas: VentaReciente[] = soloArticulos.slice(0, 20).map((c: any) => ({
        id: c.id,
        cliente: c.cliente || 'Cliente',
        clienteId: c.clienteId,
        clienteDni: c.clienteDni,
        clienteTelefono: c.clienteTelefono,
        articulo: c.producto || 'Artículo',
        monto: c.montoTotal || 0,
        cuotaInicial: c.cuotaInicial || 0,
        cuotas: c.cuotasTotales || 0,
        cuotasPagadas: c.cuotasPagadas || 0,
        valorCuota: c.valorCuota || 0,
        frecuencia: c.frecuenciaPago || 'Quincenal',
        tasaInteres: c.tasaInteres || 0,
        saldoPendiente: c.montoPendiente || 0,
        tipo: 'CREDITO',
        estado: c.estado as VentaReciente['estado'],
        fecha: c.creadoEn || '',
        fechaPrimerCobro: c.fechaInicio || '',
        vendedor: c.vendedor || 'Sin asignar',
        observaciones: c.observaciones || undefined,
      }))
      setVentasRecientes(ventas)
    } catch {
      setVentasRecientes([])
    } finally {
      setLoadingVentas(false)
    }
  }

  const fetchClientes = async () => {
    setLoadingClientes(true)
    setClientesPage(1)
    setClientesSearch('')
    try {
      const data = await clientesService.obtenerTodos()
      setClientes(data)
    } catch {
      setClientes([])
    } finally {
      setLoadingClientes(false)
    }
  }

  const handleOpenVentas = () => {
    setShowVentasModal(true)
    fetchVentasRecientes()
  }

  const handleOpenClientes = () => {
    setShowClientesModal(true)
    fetchClientes()
  }

  const fabActions: FabAction[] = [
    {
      label: 'Nuevo Crédito Artículo',
      icon: <ShoppingBag className="h-5 w-5" />,
      onClick: () => setShowCreditoModal(true),
    },
    {
      label: 'Nuevo Cliente',
      icon: <UserPlus className="h-5 w-5" />,
      color: 'emerald',
      onClick: () => setShowNewClientModal(true),
    },
    {
      label: 'Ventas Recientes',
      icon: <Clock className="h-5 w-5" />,
      color: 'orange',
      onClick: handleOpenVentas,
    },
    {
      label: 'Clientes Registrados',
      icon: <Users className="h-5 w-5" />,
      color: 'blue',
      onClick: handleOpenClientes,
    },
  ]

  return (
    <div className="relative">
      {/* Contenido principal: reutiliza la vista de artículos */}
      <ArticulosContent />

      {/* Floating Action Buttons */}
      <FloatingActionMenu actions={fabActions} />

      {/* Modal Nuevo Crédito Artículo */}
      <CrearCreditoModal
        isOpen={showCreditoModal}
        onClose={() => setShowCreditoModal(false)}
        onConfirm={(data) => {
          console.log('Crédito creado:', data)
          setShowCreditoModal(false)
        }}
        defaultCreditType="articulo"
        hideTypeSelector
      />

      {/* Modal Nuevo Cliente */}
      {showNewClientModal && (
        <NuevoClienteModal
          onClose={() => setShowNewClientModal(false)}
          onClienteCreado={() => {
            setShowNewClientModal(false)
          }}
        />
      )}

      {/* MODAL: VENTAS RECIENTES (con filtros, buscador, paginador, detalle) */}
      {showVentasModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowVentasModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                    Ventas Recientes
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 ml-10">Historial de créditos de artículos del punto de venta</p>
                </div>
                <button
                  onClick={() => setShowVentasModal(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Summary Stats */}
              {!loadingVentas && ventasFiltradas.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Vendido</span>
                    </div>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(ventasFiltradas.reduce((s, v) => s + v.monto, 0))}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operaciones</span>
                    </div>
                    <p className="text-sm font-black text-slate-900">{ventasFiltradas.length}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuota Inicial</span>
                    </div>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(ventasFiltradas.reduce((s, v) => s + v.cuotaInicial, 0))}</p>
                  </div>
                </div>
              )}

              {/* Search + Date Filters */}
              {!loadingVentas && ventasRecientes.length > 0 && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar cliente, artículo o ID..."
                      value={ventasSearch}
                      onChange={(e) => { setVentasSearch(e.target.value); setVentasPage(1) }}
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-medium placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={ventasFechaDesde}
                      onChange={(e) => { setVentasFechaDesde(e.target.value); setVentasPage(1) }}
                      className="px-2 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-medium text-slate-600"
                      title="Desde"
                    />
                    <input
                      type="date"
                      value={ventasFechaHasta}
                      onChange={(e) => { setVentasFechaHasta(e.target.value); setVentasPage(1) }}
                      className="px-2 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-medium text-slate-600"
                      title="Hasta"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loadingVentas ? (
                <div className="p-10 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-3 text-sm text-slate-400">Cargando ventas...</p>
                </div>
              ) : ventasFiltradas.length === 0 ? (
                <div className="p-10 text-center">
                  <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">
                    {ventasSearch || ventasFechaDesde || ventasFechaHasta ? 'No se encontraron resultados' : 'No hay ventas recientes'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ventasPaginadas.map((venta) => {
                    const estadoCfg = getEstadoConfig(venta.estado)
                    return (
                      <div key={venta.id} className="px-6 py-3 hover:bg-slate-50/80 transition-colors group flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-black text-blue-600">
                              {venta.cliente.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{venta.cliente}</p>
                            <p className="text-[11px] text-slate-500 truncate">{venta.articulo}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[11px] text-slate-400">{formatDateShort(venta.fecha)}</span>
                          <p className="text-sm font-black text-slate-900 w-24 text-right">{formatCurrency(venta.monto)}</p>
                          <div className={cn(
                            'inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border w-20 justify-center',
                            estadoCfg.bg, estadoCfg.text, estadoCfg.border
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', estadoCfg.dot)} />
                            {estadoCfg.label}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowVentaDetalle(venta) }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer: Paginator */}
            {ventasFiltradas.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                <span className="text-[10px] text-slate-400 font-medium">
                  {(ventasPage - 1) * VENTAS_PER_PAGE + 1}-{Math.min(ventasPage * VENTAS_PER_PAGE, ventasFiltradas.length)} de {ventasFiltradas.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setVentasPage(p => Math.max(1, p - 1))}
                    disabled={ventasPage === 1}
                    className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-2">{ventasPage} / {ventasTotalPages}</span>
                  <button
                    onClick={() => setVentasPage(p => Math.min(ventasTotalPages, p + 1))}
                    disabled={ventasPage === ventasTotalPages}
                    className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DETALLE DE VENTA (completo) */}
      {showVentaDetalle && (() => {
        const v = showVentaDetalle
        const cfg = getEstadoConfig(v.estado)
        const progreso = v.cuotas > 0 ? Math.round((v.cuotasPagadas / v.cuotas) * 100) : 0
        const totalIntereses = Math.round(v.valorCuota * v.cuotas - (v.monto - v.cuotaInicial))
        return (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowVentaDetalle(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white flex-shrink-0">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-blue-600" />
                    Detalle de Venta
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono ml-6">{v.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border', cfg.bg, cfg.text, cfg.border)}>
                    <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                    {cfg.label}
                  </div>
                  <button onClick={() => setShowVentaDetalle(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">

                {/* Sección: Cliente */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Información del Cliente</p>
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-black text-blue-600">
                        {v.cliente.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm">{v.cliente}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {v.clienteDni && <span className="text-[11px] text-slate-500 font-mono">CC: {v.clienteDni}</span>}
                        {v.clienteTelefono && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {v.clienteTelefono}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección: Artículo */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Artículo</p>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 text-orange-600" />
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{v.articulo}</p>
                  </div>
                </div>

                {/* Sección: Desglose Financiero */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Desglose Financiero</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Monto Total</p>
                      <p className="text-lg font-black text-blue-900">{formatCurrency(v.monto)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Cuota Inicial</p>
                      <p className="text-lg font-black text-emerald-800">{formatCurrency(v.cuotaInicial)}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Saldo Pendiente</p>
                      <p className="text-lg font-black text-amber-900">{formatCurrency(v.saldoPendiente)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valor Cuota</p>
                      <p className="text-lg font-black text-slate-900">{formatCurrency(v.valorCuota)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Tasa Interés</p>
                      <p className="text-sm font-black text-slate-900">{v.tasaInteres}%</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Frecuencia</p>
                      <p className="text-sm font-black text-slate-900">{v.frecuencia}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Total Intereses</p>
                      <p className="text-sm font-black text-slate-900">{formatCurrency(Math.max(0, totalIntereses))}</p>
                    </div>
                  </div>
                </div>

                {/* Sección: Progreso de Cuotas */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Progreso de Cuotas</p>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-700">{v.cuotasPagadas} de {v.cuotas} cuotas</span>
                      <span className="text-sm font-black text-blue-600">{progreso}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div
                        className={cn('h-2.5 rounded-full transition-all', progreso === 100 ? 'bg-emerald-500' : 'bg-blue-500')}
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-slate-400">Pagadas: {v.cuotasPagadas}</span>
                      <span className="text-[10px] text-slate-400">Restantes: {v.cuotas - v.cuotasPagadas}</span>
                    </div>
                  </div>
                </div>

                {/* Sección: Fechas */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fechas Importantes</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <span className="text-slate-500 flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Fecha de Venta</span>
                      <span className="font-bold text-slate-900">{formatDateShort(v.fecha)} · {formatTime(v.fecha)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <span className="text-slate-500 flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Primer Cobro</span>
                      <span className="font-bold text-slate-900">{formatDateShort(v.fechaPrimerCobro)}</span>
                    </div>
                    {v.fechaUltimoPago && (
                      <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                        <span className="text-slate-500 flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Último Pago</span>
                        <span className="font-bold text-emerald-700">{formatDateShort(v.fechaUltimoPago)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sección: Vendedor */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vendedor</p>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-indigo-600" />
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{v.vendedor}</p>
                  </div>
                </div>

                {/* Sección: Observaciones */}
                {v.observaciones && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Observaciones</p>
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <p className="text-sm text-amber-900">{v.observaciones}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL: CLIENTES REGISTRADOS (con buscador, paginador, ojo detalle) */}
      {showClientesModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowClientesModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    Clientes Registrados
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 ml-10">Directorio de clientes del sistema</p>
                </div>
                <button
                  onClick={() => setShowClientesModal(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search */}
              {!loadingClientes && (
                <div className="mt-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, cédula, teléfono o correo..."
                    value={clientesSearch}
                    onChange={(e) => { setClientesSearch(e.target.value); setClientesPage(1) }}
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-medium placeholder:text-slate-400"
                  />
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loadingClientes ? (
                <div className="p-10 text-center">
                  <Loader2 className="h-8 w-8 text-blue-600 mx-auto animate-spin" />
                  <p className="mt-3 text-sm text-slate-400">Cargando clientes...</p>
                </div>
              ) : clientesFiltrados.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">
                    {clientesSearch ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {clientesPaginados.map((cliente) => {
                    const riesgo = getRiesgoStyle(cliente.nivelRiesgo)
                    const tieneMora = (cliente.montoMora && cliente.montoMora > 0) || (cliente.diasMora && cliente.diasMora > 0)
                    const enListaNegra = cliente.enListaNegra
                    const esRiesgoso = cliente.nivelRiesgo === 'ROJO' || cliente.nivelRiesgo === 'LISTA_NEGRA' || enListaNegra
                    return (
                      <div key={cliente.id} className={cn(
                        'px-6 py-4 hover:bg-slate-50/80 transition-colors group',
                        enListaNegra && 'bg-rose-50/30'
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border relative',
                              riesgo.bg, riesgo.border
                            )}>
                              <span className={cn('text-xs font-black', riesgo.text)}>
                                {cliente.nombres.charAt(0)}{cliente.apellidos.charAt(0)}
                              </span>
                              {esRiesgoso && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center">
                                  <Shield className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900 truncate">{cliente.nombres} {cliente.apellidos}</p>
                                <div className={cn(
                                  'inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0',
                                  riesgo.bg, riesgo.text, riesgo.border
                                )}>
                                  <span className={cn('w-1.5 h-1.5 rounded-full', riesgo.dot)} />
                                  {cliente.nivelRiesgo}
                                </div>
                                {enListaNegra && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-900 text-white flex-shrink-0">
                                    LISTA NEGRA
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[11px] text-slate-500 font-mono">CC: {cliente.dni}</span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                  <Phone className="h-3 w-3" /> {cliente.telefono}
                                </span>
                                {cliente.correo && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 truncate">
                                    <Mail className="h-3 w-3" /> {cliente.correo}
                                  </span>
                                )}
                              </div>

                              {/* Score + Mora + Préstamos activos indicator */}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {/* Puntaje */}
                                <span className={cn(
                                  'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                  cliente.puntaje >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  cliente.puntaje >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-rose-50 text-rose-700 border-rose-200'
                                )}>
                                  Score: {cliente.puntaje}
                                </span>

                                {/* Préstamos activos */}
                                {(cliente.prestamosActivos !== undefined && cliente.prestamosActivos > 0) && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    {cliente.prestamosActivos} crédito{cliente.prestamosActivos > 1 ? 's' : ''} activo{cliente.prestamosActivos > 1 ? 's' : ''}
                                  </span>
                                )}

                                {/* Mora warning */}
                                {tieneMora && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                                    ⚠ EN MORA
                                    {cliente.diasMora ? ` · ${cliente.diasMora} días` : ''}
                                    {cliente.montoMora ? ` · ${formatCurrency(cliente.montoMora)}` : ''}
                                  </span>
                                )}
                              </div>

                              {/* Blacklist reason */}
                              {enListaNegra && cliente.razonListaNegra && (
                                <div className="mt-1 text-[10px] text-rose-600 font-medium bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                                  Razón: {cliente.razonListaNegra}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowClienteDetalle(cliente.id) }}
                            className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                            title="Ver expediente"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer: Paginator */}
            {clientesFiltrados.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                <span className="text-[10px] text-slate-400 font-medium">
                  {(clientesPage - 1) * CLIENTES_PER_PAGE + 1}-{Math.min(clientesPage * CLIENTES_PER_PAGE, clientesFiltrados.length)} de {clientesFiltrados.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setClientesPage(p => Math.max(1, p - 1))}
                    disabled={clientesPage === 1}
                    className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-2">{clientesPage} / {clientesTotalPages}</span>
                  <button
                    onClick={() => setClientesPage(p => Math.min(clientesTotalPages, p + 1))}
                    disabled={clientesPage === clientesTotalPages}
                    className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{clientesFiltrados.length} clientes</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DETALLE CLIENTE (reutiliza ClientePortalModal solo para IDs reales) */}
      {showClienteDetalle && !showClienteDetalle.startsWith('mock-') && (
        <ClientePortalModal
          clientId={showClienteDetalle}
          onClose={() => setShowClienteDetalle(null)}
          rolUsuario="admin"
        />
      )}

      {/* MODAL: DETALLE CLIENTE MOCK (inline) */}
      {showClienteDetalle && showClienteDetalle.startsWith('mock-') && (() => {
        const c = clientes.find(cl => cl.id === showClienteDetalle)
        if (!c) return null
        const riesgo = getRiesgoStyle(c.nivelRiesgo)
        return (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowClienteDetalle(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white flex-shrink-0">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Perfil del Cliente
                </h3>
                <button onClick={() => setShowClienteDetalle(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="flex items-center gap-3">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border', riesgo.bg, riesgo.border)}>
                    <span className={cn('text-sm font-black', riesgo.text)}>{c.nombres.charAt(0)}{c.apellidos.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{c.nombres} {c.apellidos}</p>
                    <div className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5', riesgo.bg, riesgo.text, riesgo.border)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', riesgo.dot)} /> {c.nivelRiesgo} · Puntaje: {c.puntaje}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <span className="text-slate-500">Cédula</span>
                    <span className="font-bold text-slate-900 font-mono">{c.dni}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Teléfono</span>
                    <span className="font-bold text-slate-900">{c.telefono}</span>
                  </div>
                  {c.correo && (
                    <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Correo</span>
                      <span className="font-bold text-slate-900">{c.correo}</span>
                    </div>
                  )}
                  {c.direccion && (
                    <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Dirección</span>
                      <span className="font-bold text-slate-900 text-right max-w-[60%]">{c.direccion}</span>
                    </div>
                  )}
                  {c.referencia && (
                    <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <span className="text-slate-500">Referencia</span>
                      <span className="font-bold text-slate-900">{c.referencia}</span>
                    </div>
                  )}
                </div>
                {(c.prestamosActivos !== undefined || c.montoTotal !== undefined) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
                      <p className="text-[9px] font-bold text-blue-400 uppercase">Préstamos Activos</p>
                      <p className="text-lg font-black text-blue-900">{c.prestamosActivos ?? 0}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
                      <p className="text-[9px] font-bold text-emerald-400 uppercase">Monto Total</p>
                      <p className="text-lg font-black text-emerald-900">{formatCurrency(c.montoTotal ?? 0)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Registrado: {formatDateShort(c.creadoEn)}</span>
                  <span>Actualizado: {formatDateShort(c.actualizadoEn)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
