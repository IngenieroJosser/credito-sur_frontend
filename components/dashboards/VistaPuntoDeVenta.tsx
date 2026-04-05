'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
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
import { exportService } from '@/services/export-service'
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'
import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import ClientePortalModal from '@/components/cliente/ClientePortalModal'
import ArticulosContent from '@/components/articulos/ArticulosContent'
import { toast } from 'sonner'

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

const getEstadoConfig = (estado: string) => {
  switch (estado) {
    case 'ACTIVO': return { label: 'Activo', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' }
    case 'PENDIENTE': 
    case 'PENDIENTE_APROBACION': 
      return { label: 'Pendiente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' }
    case 'COMPLETADO':
    case 'PAGADO':
      return { label: 'Completado', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' }
    case 'EN_MORA': return { label: 'En Mora', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' }
    default: return { label: (estado || 'Sin estado').replace('_', ' '), bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' }
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
  const [userSession, setUserSession] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUserSession(JSON.parse(userData))
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])

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
      c.nombres.toLowerCase().includes(q) ||
      c.apellidos.toLowerCase().includes(q) ||
      c.dni.toLowerCase().includes(q)
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
      const data = await clientesService.obtenerClientes()
      setClientes(data || [])
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



  // Tiempo real: refrescar lista de ventas cuando haya nuevos préstamos o clientes
  useRealtimeData(['prestamos_actualizados', 'clientes_actualizados'], useCallback(() => {
    fetchVentasRecientes()
  }, []))

  const fabActions: FabAction[] = [
    {
      label: 'Nuevo Crédito Artículo',
      icon: <ShoppingBag className="h-5 w-5" />,
      onClick: () => setShowCreditoModal(true),
    },
    {
      label: 'Nuevo Cliente',
      icon: <UserPlus className="h-5 w-5" />,
      color: 'blue',
      onClick: () => setShowNewClientModal(true),
    },
    {
      label: 'Clientes Registrados',
      icon: <Users className="h-5 w-5" />,
      color: 'emerald',
      onClick: handleOpenClientes,
    },
    {
      label: 'Ventas Recientes',
      icon: <Clock className="h-5 w-5" />,
      color: 'orange',
      onClick: handleOpenVentas,
    },
  ]

  const handleCrearCredito = async (data: any) => {
    try {
      const esContado = Boolean((data as any).ventaContado)
      const isArticulo = data.creditType === 'articulo'
      const freq = esContado ? 'MENSUAL' : (data.frecuenciaPago || 'DIARIO')

      const payload: any = {
        clienteId: data.clienteCreditoId,
        tipoPrestamo: isArticulo ? 'ARTICULO' : 'EFECTIVO',
        monto: data.monto || 0,
        tasaInteres: esContado ? 0 : (data.tasaInteres || 0),
        tasaInteresMora: 2,
        plazoMeses: data.plazoMeses || 1,
        cantidadCuotas: data.cantidadCuotas || data.cuotas || data.cuotasTotales || (isArticulo ? data.numCuotas : 0),
        cuotas: data.cuotas || data.cantidadCuotas || data.cuotasTotales || (isArticulo ? data.numCuotas : 0),
        frecuenciaPago: freq,
        fechaInicio: data.fechaInicio || toBogotaDateTimeOffsetIso(new Date()),
        fechaPrimerCobro: data.fechaPrimerCobro,
        creadoPorId: userSession?.id || '',
        cuotaInicial: data.cuotaInicialArticulo || 0,
        notas: isArticulo
          ? `${esContado ? 'Venta de contado' : 'Crédito de artículo'}: ${(data as any).articuloNombre || ''}`
          : (data.notas || ''),
        tipoAmortizacion: isArticulo ? 'INTERES_SIMPLE' : (data.tipoInteres || 'INTERES_SIMPLE'),
        esContado: esContado,
      };

      if (isArticulo) {
        payload.productoId = data.articuloId
        payload.precioProductoId = esContado ? undefined : data.precioProductoId
      }

      const prestamo = await prestamosService.crearPrestamo(payload);
      
      toast.success('Crédito creado', {
        description: 'El crédito ha sido registrado exitosamente.'
      });
      setShowCreditoModal(false);

      if (isArticulo && prestamo?.id) {
        try {
          await exportService.exportContrato(prestamo.id);
        } catch (err) {
          console.error('Error al descargar contrato:', err);
        }
      }
    } catch (error: any) {
      toast.error('Error al crear crédito', {
        description: error?.message || 'Ocurrió un error inesperado.'
      });
    }
  }

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
        onConfirm={handleCrearCredito}
        defaultCreditType="articulo"
        hideTypeSelector
      />

      {/* Modal Nuevo Cliente */}
      {showNewClientModal && (
        <NuevoClienteModal
          onClose={() => setShowNewClientModal(false)}
          onClienteCreado={() => {
            setShowNewClientModal(false)
            fetchClientes()
          }}
        />
      )}

      {/* Modal Lista de Clientes */}
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
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-emerald-600" />
                    </div>
                    Clientes Registrados
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 ml-10">Directorio completo de clientes en el sistema</p>
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
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, apellido o CC..."
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-3 text-sm text-slate-400">Cargando clientes...</p>
                </div>
              ) : clientesFiltrados.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">
                    {clientesSearch ? 'No se encontraron resultados' : 'No hay clientes registrados'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {clientesPaginados.map((cliente) => {
                    const tieneMora = (cliente.montoMora ?? 0) > 0 || (cliente.diasMora ?? 0) > 0;
                    const riesgoReal = tieneMora ? 'ROJO' : (cliente.nivelRiesgo || 'VERDE');
                    const riesgoStyle = getRiesgoStyle(riesgoReal);
                    return (
                      <div key={cliente.id} className="px-6 py-3 hover:bg-slate-50/80 transition-colors group flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border",
                            tieneMora ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"
                          )}>
                            <span className={cn(
                              "text-[10px] font-black",
                              tieneMora ? "text-rose-600" : "text-emerald-600"
                            )}>
                              {(cliente.nombres[0] || '') + (cliente.apellidos[0] || '')}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{cliente.nombres} {cliente.apellidos}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] text-slate-500 truncate font-mono">CC: {cliente.dni}</p>
                              {tieneMora && (
                                <span className="text-[9px] font-black text-rose-600 animate-pulse uppercase">¡En Mora!</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className={cn(
                            'inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border w-24 justify-center',
                            riesgoStyle.bg, riesgoStyle.text, riesgoStyle.border
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', riesgoStyle.dot)} />
                            {tieneMora ? 'EN MORA' : (cliente.nivelRiesgo || 'VERDE')}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowClienteDetalle(cliente.id) }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Ver perfil completo"
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Detalle de Cliente */}
      {showClienteDetalle && (
        <ClientePortalModal
          clientId={showClienteDetalle}
          onClose={() => setShowClienteDetalle(null)}
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
                            estadoCfg?.bg || 'bg-slate-50', 
                            estadoCfg?.text || 'text-slate-600', 
                            estadoCfg?.border || 'border-slate-200'
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', estadoCfg?.dot || 'bg-slate-400')} />
                            {estadoCfg?.label || venta.estado}
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
                  <div className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border', cfg?.bg || 'bg-slate-50', cfg?.text || 'text-slate-600', cfg?.border || 'border-slate-200')}>
                    <span className={cn('w-2 h-2 rounded-full', cfg?.dot || 'bg-slate-400')} />
                    {cfg?.label || v.estado}
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


    </div>
  )
}
