'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  Loader2,
  Package,
  Phone,
  Search,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { exportService } from '@/services/export-service'
import { prestamosService } from '@/services/prestamos-service'
import { salesService } from '@/services/sales-service'
import { clientesService, Cliente } from '@/services/clientes-service'
import { buildCrearPrestamoPayload, buildVentaContadoPayload } from '@/lib/creditos/crear-prestamo-payload'
import { calcularResumenVentas } from '@/lib/creditos/ventas-resumen'
import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import ClientePortalModal from '@/components/cliente/ClientePortalModal'

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
  estado: 'ACTIVO' | 'PENDIENTE' | 'COMPLETADO' | 'PENDIENTE_APROBACION' | 'PAGADO' | 'EN_MORA'
  fecha: string
  fechaPrimerCobro: string
  fechaUltimoPago?: string
  vendedor: string
  observaciones?: string
}

const VENTAS_PER_PAGE = 5
const CLIENTES_PER_PAGE = 5

const getRiesgoStyle = (riesgo: string) => {
  switch (riesgo) {
    case 'VERDE': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' }
    case 'AMARILLO': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' }
    case 'ROJO': return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' }
    case 'LISTA_NEGRA': return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-600' }
    default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' }
  }
}

const getEstadoLabel = (estado: string) => {
  switch (estado) {
    case 'ACTIVO': return 'Activo'
    case 'PENDIENTE':
    case 'PENDIENTE_APROBACION': return 'Pendiente'
    case 'COMPLETADO':
    case 'PAGADO': return 'Completado'
    case 'EN_MORA': return 'En Mora'
    default: return (estado || 'Sin estado').replace(/_/g, ' ')
  }
}

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PuntoDeVentaFloatingActions() {
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showCreditoModal, setShowCreditoModal] = useState(false)
  const [creditoModalMode, setCreditoModalMode] = useState<'credito-articulo' | 'venta-contado'>('credito-articulo')
  const [showVentasModal, setShowVentasModal] = useState(false)
  const [showClientesModal, setShowClientesModal] = useState(false)
  const [showVentaDetalle, setShowVentaDetalle] = useState<VentaReciente | null>(null)
  const [showClienteDetalle, setShowClienteDetalle] = useState<string | null>(null)
  const [ventasRecientes, setVentasRecientes] = useState<VentaReciente[]>([])
  const [loadingVentas, setLoadingVentas] = useState(false)
  const [ventasSearch, setVentasSearch] = useState('')
  const [ventasFechaDesde, setVentasFechaDesde] = useState('')
  const [ventasFechaHasta, setVentasFechaHasta] = useState('')
  const [ventasPage, setVentasPage] = useState(1)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [clientesSearch, setClientesSearch] = useState('')
  const [clientesPage, setClientesPage] = useState(1)
  const [userSession, setUserSession] = useState<any>(null)

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) setUserSession(JSON.parse(userData))
    } catch {}
  }, [])

  const fetchVentasRecientes = useCallback(async () => {
    setLoadingVentas(true)
    setVentasPage(1)
    setVentasSearch('')
    setVentasFechaDesde('')
    setVentasFechaHasta('')
    try {
      const [creditosData, ventasContadoData] = await Promise.all([
        prestamosService.obtenerPrestamos({ tipo: 'ARTICULO', limit: 20 } as any),
        salesService.obtenerVentasContado().catch(() => []),
      ])

      const soloArticulos = (creditosData?.prestamos || []).filter((c: any) => {
        const tipoPrestamo = String(c.tipoPrestamo || c.tipo || '').toUpperCase()
        const tipoProducto = String(c.tipoProducto || '').toLowerCase()
        return tipoPrestamo === 'ARTICULO' || (!!tipoProducto && tipoProducto !== 'efectivo')
      }).map((c: any) => ({
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
        tipo: 'CREDITO' as const,
        estado: c.estado || 'ACTIVO',
        fecha: c.creadoEn || '',
        fechaPrimerCobro: c.fechaInicio || '',
        vendedor: c.vendedor || 'Sin asignar',
        observaciones: c.observaciones || undefined,
      }))

      const ventasContado = (ventasContadoData || []).map((v: any) => ({
        id: v.id,
        cliente: 'Cliente contado',
        clienteId: undefined,
        clienteDni: undefined,
        clienteTelefono: undefined,
        articulo:
          v.descripcion
            ?.replace(/^Venta de contado\s+(EFECTIVO|TRANSFERENCIA):\s*/i, '')
            ?.trim() || 'Venta contado',
        monto: v.monto || 0,
        cuotaInicial: 0,
        cuotas: 0,
        cuotasPagadas: 0,
        valorCuota: 0,
        frecuencia: '',
        tasaInteres: 0,
        saldoPendiente: 0,
        tipo: 'CONTADO' as const,
        estado: 'COMPLETADO' as const,
        fecha: v.fecha || '',
        fechaPrimerCobro: v.fecha || '',
        vendedor: v.vendedor || 'Sin asignar',
        observaciones: undefined,
      }))

      const todasLasVentas = [...soloArticulos, ...ventasContado]
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 20)

      setVentasRecientes(todasLasVentas)
    } catch {
      setVentasRecientes([])
    } finally {
      setLoadingVentas(false)
    }
  }, [])

  const fetchClientes = useCallback(async () => {
    setLoadingClientes(true)
    setClientesPage(1)
    setClientesSearch('')
    try {
      setClientes(await clientesService.obtenerClientes() || [])
    } catch {
      setClientes([])
    } finally {
      setLoadingClientes(false)
    }
  }, [])

  const ventasFiltradas = useMemo(() => {
    let result = ventasRecientes
    if (ventasSearch.trim()) {
      const q = ventasSearch.toLowerCase()
      result = result.filter(v => v.cliente.toLowerCase().includes(q) || v.articulo.toLowerCase().includes(q) || v.id.toLowerCase().includes(q))
    }
    if (ventasFechaDesde) result = result.filter(v => v.fecha >= ventasFechaDesde)
    if (ventasFechaHasta) result = result.filter(v => v.fecha <= `${ventasFechaHasta}T23:59:59`)
    return result
  }, [ventasRecientes, ventasSearch, ventasFechaDesde, ventasFechaHasta])

  const ventasTotalPages = Math.max(1, Math.ceil(ventasFiltradas.length / VENTAS_PER_PAGE))
  const ventasPaginadas = ventasFiltradas.slice((ventasPage - 1) * VENTAS_PER_PAGE, ventasPage * VENTAS_PER_PAGE)
  const resumenVentas = useMemo(
    () => calcularResumenVentas(ventasFiltradas),
    [ventasFiltradas],
  )

  const clientesFiltrados = useMemo(() => {
    if (!clientesSearch.trim()) return clientes
    const q = clientesSearch.toLowerCase()
    return clientes.filter(c => c.nombres.toLowerCase().includes(q) || c.apellidos.toLowerCase().includes(q) || c.dni.toLowerCase().includes(q))
  }, [clientes, clientesSearch])

  const clientesTotalPages = Math.max(1, Math.ceil(clientesFiltrados.length / CLIENTES_PER_PAGE))
  const clientesPaginados = clientesFiltrados.slice((clientesPage - 1) * CLIENTES_PER_PAGE, clientesPage * CLIENTES_PER_PAGE)

  const handleCrearCredito = async (data: any) => {
    try {
      const esContado = Boolean(data.ventaContado)
      const isArticulo = data.creditType === 'articulo'
      let prestamo: any = null

      if (esContado) {
        const payload = buildVentaContadoPayload(data, userSession?.id)
        await salesService.registrarVentaContado(payload)
      } else {
        const payload = buildCrearPrestamoPayload(data, userSession?.id)
        prestamo = await prestamosService.crearPrestamo(payload)
      }

      toast.success(esContado ? 'Venta registrada' : 'Crédito creado', {
        description: esContado
          ? 'La venta de contado ha sido registrada exitosamente.'
          : 'El crédito ha sido registrado exitosamente.',
      })
      setShowCreditoModal(false)
      if (isArticulo && !esContado && prestamo?.id) {
        try { await exportService.exportContrato(prestamo.id) } catch {}
      }
    } catch (error: any) {
      const esContado = Boolean(data?.ventaContado)
      toast.error(esContado ? 'Error al registrar venta' : 'Error al crear crédito', {
        description: error?.message || 'Ocurrió un error inesperado.',
      })
    }
  }

  const openCreditoArticulo = () => {
    setCreditoModalMode('credito-articulo')
    setShowCreditoModal(true)
  }

  const openVentaContado = () => {
    setCreditoModalMode('venta-contado')
    setShowCreditoModal(true)
  }

  const actions: FabAction[] = [
    { label: 'Venta', icon: <ShoppingBag className="h-5 w-5" />, color: 'emerald', onClick: openVentaContado },
    { label: 'Nuevo Crédito Artículo', icon: <CreditCard className="h-5 w-5" />, onClick: openCreditoArticulo },
    { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, color: 'blue', onClick: () => setShowNewClientModal(true) },
    { label: 'Clientes Registrados', icon: <Users className="h-5 w-5" />, color: 'emerald', onClick: () => { setShowClientesModal(true); fetchClientes() } },
    { label: 'Ventas Recientes', icon: <Clock className="h-5 w-5" />, color: 'orange', onClick: () => { setShowVentasModal(true); fetchVentasRecientes() } },
  ]

  return (
    <>
      <FloatingActionMenu actions={actions} />

      <CrearCreditoModal
        isOpen={showCreditoModal}
        onClose={() => setShowCreditoModal(false)}
        onConfirm={handleCrearCredito}
        defaultCreditType="articulo"
        hideTypeSelector
        defaultVentaContado={creditoModalMode === 'venta-contado'}
        lockVentaContado={creditoModalMode === 'venta-contado'}
        allowVentaContadoOption={false}
      />

      {showNewClientModal && (
        <NuevoClienteModal onClose={() => setShowNewClientModal(false)} onClienteCreado={() => { setShowNewClientModal(false); fetchClientes() }} />
      )}

      {showClientesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowClientesModal(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><Users className="h-4 w-4 text-emerald-600" /></div>
                    Clientes Registrados
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 ml-10">Directorio completo de clientes en el sistema</p>
                </div>
                <button onClick={() => setShowClientesModal(false)} className="shrink-0 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
              </div>
              {!loadingClientes && (
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input type="text" placeholder="Buscar por nombre, apellido o CC..." value={clientesSearch} onChange={(e) => { setClientesSearch(e.target.value); setClientesPage(1) }} className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-medium placeholder:text-slate-400" />
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingClientes ? (
                <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" /><p className="mt-3 text-sm text-slate-400">Cargando clientes...</p></div>
              ) : clientesFiltrados.length === 0 ? (
                <div className="p-10 text-center"><Users className="h-10 w-10 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-400 font-medium">{clientesSearch ? 'No se encontraron resultados' : 'No hay clientes registrados'}</p></div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {clientesPaginados.map((cliente) => {
                    const tieneMora = (cliente.montoMora ?? 0) > 0 || (cliente.diasMora ?? 0) > 0
                    const riesgoStyle = getRiesgoStyle(tieneMora ? 'ROJO' : (cliente.nivelRiesgo || 'VERDE'))
                    return (
                      <div key={cliente.id} className="px-6 py-3 hover:bg-slate-50/80 transition-colors group flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border', tieneMora ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200')}>
                            <span className={cn('text-[10px] font-black', tieneMora ? 'text-rose-600' : 'text-emerald-600')}>{(cliente.nombres[0] || '') + (cliente.apellidos[0] || '')}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{cliente.nombres} {cliente.apellidos}</p>
                            <p className="text-[11px] text-slate-500 truncate font-mono">CC: {cliente.dni}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className={cn('inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border w-24 justify-center', riesgoStyle.bg, riesgoStyle.text, riesgoStyle.border)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', riesgoStyle.dot)} />
                            {tieneMora ? 'EN MORA' : (cliente.nivelRiesgo || 'VERDE')}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setShowClienteDetalle(cliente.id) }} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="Ver perfil completo">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {clientesFiltrados.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                <span className="text-[10px] text-slate-400 font-medium">{(clientesPage - 1) * CLIENTES_PER_PAGE + 1}-{Math.min(clientesPage * CLIENTES_PER_PAGE, clientesFiltrados.length)} de {clientesFiltrados.length}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setClientesPage(p => Math.max(1, p - 1))} disabled={clientesPage === 1} className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-xs font-bold text-slate-700 px-2">{clientesPage} / {clientesTotalPages}</span>
                  <button onClick={() => setClientesPage(p => Math.min(clientesTotalPages, p + 1))} disabled={clientesPage === clientesTotalPages} className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showClienteDetalle && <ClientePortalModal clientId={showClienteDetalle} onClose={() => setShowClienteDetalle(null)} />}

      {showVentasModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowVentasModal(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg"><div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center"><Clock className="h-4 w-4 text-orange-600" /></div>Ventas Recientes</h3>
                  <p className="text-xs text-slate-500 mt-1 ml-10">Historial de créditos de artículos del punto de venta</p>
                </div>
                <button onClick={() => setShowVentasModal(false)} className="shrink-0 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
              </div>
              {!loadingVentas && ventasFiltradas.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-2 mb-1"><TrendingUp className="h-3.5 w-3.5 text-blue-500" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Financiado</span></div><p className="text-sm font-black text-slate-900">{formatCurrency(resumenVentas.totalFinanciado)}</p></div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-2 mb-1"><Package className="h-3.5 w-3.5 text-orange-500" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ventas Contado</span></div><p className="text-sm font-black text-slate-900">{formatCurrency(resumenVentas.totalContado)}</p></div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-2 mb-1"><CreditCard className="h-3.5 w-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuota Inicial</span></div><p className="text-sm font-black text-slate-900">{formatCurrency(resumenVentas.totalCuotaInicial)}</p></div>
                </div>
              )}
              {!loadingVentas && ventasRecientes.length > 0 && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><input type="text" placeholder="Buscar cliente, artículo o ID..." value={ventasSearch} onChange={(e) => { setVentasSearch(e.target.value); setVentasPage(1) }} className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-medium placeholder:text-slate-400" /></div>
                  <div className="flex gap-2"><input type="date" value={ventasFechaDesde} onChange={(e) => { setVentasFechaDesde(e.target.value); setVentasPage(1) }} className="px-2 py-2 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-600" title="Desde" /><input type="date" value={ventasFechaHasta} onChange={(e) => { setVentasFechaHasta(e.target.value); setVentasPage(1) }} className="px-2 py-2 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-600" title="Hasta" /></div>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingVentas ? (
                <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" /><p className="mt-3 text-sm text-slate-400">Cargando ventas...</p></div>
              ) : ventasFiltradas.length === 0 ? (
                <div className="p-10 text-center"><Package className="h-10 w-10 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-400 font-medium">{ventasSearch || ventasFechaDesde || ventasFechaHasta ? 'No se encontraron resultados' : 'No hay ventas recientes'}</p></div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ventasPaginadas.map((venta) => (
                    <button key={venta.id} type="button" onClick={() => setShowVentaDetalle(venta)} className="w-full px-6 py-4 hover:bg-slate-50/80 transition-colors text-left group">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{venta.articulo}</p>
                          <p className="text-xs text-slate-500 truncate">{venta.cliente}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{venta.id}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-slate-900">{formatCurrency(venta.monto)}</p>
                          <p className="text-[10px] text-slate-500">{formatDateShort(venta.fecha)} · {getEstadoLabel(venta.estado)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {ventasFiltradas.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                <span className="text-[10px] text-slate-400 font-medium">{(ventasPage - 1) * VENTAS_PER_PAGE + 1}-{Math.min(ventasPage * VENTAS_PER_PAGE, ventasFiltradas.length)} de {ventasFiltradas.length}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setVentasPage(p => Math.max(1, p - 1))} disabled={ventasPage === 1} className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-xs font-bold text-slate-700 px-2">{ventasPage} / {ventasTotalPages}</span>
                  <button onClick={() => setVentasPage(p => Math.min(ventasTotalPages, p + 1))} disabled={ventasPage === ventasTotalPages} className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showVentaDetalle && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none" onClick={() => setShowVentaDetalle(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="min-w-0"><h3 className="font-black text-slate-900">Detalle de venta</h3><p className="text-xs text-slate-500 font-mono">{showVentaDetalle.id}</p></div>
              <button onClick={() => setShowVentaDetalle(null)} className="shrink-0 p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-700"><Package className="h-4 w-4 text-orange-500" /><span className="font-bold">{showVentaDetalle.articulo}</span></div>
              <div className="flex items-center gap-2 text-slate-700"><Users className="h-4 w-4 text-blue-500" /><span>{showVentaDetalle.cliente}</span></div>
              {showVentaDetalle.clienteTelefono && <div className="flex items-center gap-2 text-slate-700"><Phone className="h-4 w-4 text-slate-400" /><span>{showVentaDetalle.clienteTelefono}</span></div>}
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 grid grid-cols-2 gap-3">
                <div><p className="text-[10px] uppercase font-black text-slate-400">Monto</p><p className="font-black text-slate-900">{formatCurrency(showVentaDetalle.monto)}</p></div>
                <div><p className="text-[10px] uppercase font-black text-slate-400">Saldo</p><p className="font-black text-slate-900">{formatCurrency(showVentaDetalle.saldoPendiente)}</p></div>
                <div><p className="text-[10px] uppercase font-black text-slate-400">Cuotas</p><p className="font-black text-slate-900">{showVentaDetalle.cuotasPagadas}/{showVentaDetalle.cuotas}</p></div>
                <div><p className="text-[10px] uppercase font-black text-slate-400">Estado</p><p className="font-black text-slate-900">{getEstadoLabel(showVentaDetalle.estado)}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
