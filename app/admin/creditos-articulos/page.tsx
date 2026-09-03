'use client'


import Paginador from '@/components/ui/Paginador'
import { useState, useEffect, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { usePathname } from 'next/navigation'
import { AlertCircle, Armchair, Calendar, ChevronLeft, ChevronRight, CreditCard, Eye, Filter, MapPin, Package, Plus, Search, ShoppingBag, Smartphone, TrendingUp, Tv } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { EstadoPrestamo, NivelRiesgo, type Prestamo } from '@/components/prestamos/data'
import AnimacionCarga from '@/components/ui/AnimacionCarga'
import { loansServiceExt as loansService } from '@/services/loans-service'
import { prestamosService } from '@/services/prestamos-service'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import DetallePrestamoModal from '@/components/prestamos/DetallePrestamoModal'
import { buildCrearPrestamoPayload } from '@/lib/creditos/crear-prestamo-payload'
import { exportService } from '@/services/export-service'
import { useNotification } from '@/components/providers/NotificationProvider'

type CreditoArticuloRow = Prestamo & {
  rowKey: string
  detalleId: string
}

export default function CreditosArticulosPage() {
  const pathname = usePathname()
  const { showNotification } = useNotification()
  const [searchTerm, setSearchTerm] = useState('')
  const [rutaFiltro, setRutaFiltro] = useState('todas')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [riesgoFiltro, setRiesgoFiltro] = useState('todos')
  const [creditos, setCreditos] = useState<CreditoArticuloRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCrearCreditoModal, setShowCrearCreditoModal] = useState(false)
  const [creditoDetalleId, setCreditoDetalleId] = useState<string | null>(null)
  const isPuntoVentaView = pathname?.startsWith('/punto-de-venta')

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const [itemsPorPagina] = useState(8)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await loansService.getLoans({ limit: 100 })
      const prestamos = (response?.prestamos || []).map((p: any, index: number) => {
        const detalleId = String(p.id || p.prestamoId || '')
        const rowKey = detalleId || String(p.numeroPrestamo || `credito-articulo-${index}`)

        return {
        id: rowKey,
        rowKey,
        detalleId,
        cliente: p.cliente || '',
        clienteId: p.clienteId || '',
        producto: p.producto || p.tipoPrestamo || '',
        montoTotal: p.montoTotal || 0,
        montoPagado: p.montoPagado || 0,
        montoPendiente: p.montoPendiente || 0,
        cuotasTotales: p.cuotasTotales || 0,
        cuotasPagadas: p.cuotasPagadas || 0,
        cuotasPendientes: (p.cuotasTotales || 0) - (p.cuotasPagadas || 0),
        fechaInicio: p.fechaInicio || '',
        fechaVencimiento: p.fechaFin || p.fechaVencimiento || '',
        proximoPago: p.proximoPago || '',
        estado: (String(p.estado || 'ACTIVO').toUpperCase() === 'EN_MORA' && Number(p.diasMora || 0) <= 0)
          ? 'ACTIVO'
          : (p.estado || 'ACTIVO'),
        tasaInteres: p.tasaInteres || 0,
        diasMora: p.diasMora || 0,
        moraAcumulada: p.moraAcumulada || 0,
        riesgo: p.riesgo || 'VERDE',
        ruta: p.ruta || '',
        tipoProducto: p.tipoProducto || 'electrodomestico',
      }})
      const creditosArticulos = prestamos.filter((p: CreditoArticuloRow) =>
        p.detalleId && p.tipoProducto !== 'efectivo'
      )
      setCreditos(creditosArticulos)
    } catch (err) {
      console.error('Error cargando créditos de artículos:', err)
      setCreditos([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Tiempo real: refrescar cuando se creen/actualicen préstamos o pagos
  useRealtimeData(
    ['prestamos_actualizados', 'pagos_actualizados', 'clientes_actualizados'],
    loadData,
  )

  const getEstadoColor = (estado: EstadoPrestamo) => {
    switch(estado) {
      case 'ACTIVO': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'PENDIENTE_APROBACION': return 'bg-amber-50 text-amber-700 border-amber-100'
      case 'EN_MORA': return 'bg-rose-50 text-rose-700 border-rose-100'
      case 'INCUMPLIDO': return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'PAGADO': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      default: return 'bg-slate-50 text-slate-700 border-slate-100'
    }
  }

  const getRiesgoLabel = (riesgo: string) => {
    switch (riesgo) {
      case 'VERDE': return 'Al día'
      case 'AMARILLO': return 'Precaución'
      case 'ROJO': return 'Rojo'
      case 'LISTA_NEGRA': return 'Lista Negra'
      default: return riesgo || 'Sin riesgo'
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'ACTIVO': return 'Activo'
      case 'PENDIENTE_APROBACION': return 'Pendiente'
      case 'EN_MORA': return 'En Mora'
      case 'PAGADO': return 'Pagado'
      case 'INCUMPLIDO': return 'Incumplido'
      default: return (estado || 'Sin estado').replace(/_/g, ' ')
    }
  }

  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch(riesgo) {
      case 'VERDE': return 'text-emerald-600 bg-emerald-50 border-emerald-100 border'
      case 'AMARILLO': return 'text-amber-600 bg-amber-50 border-amber-100 border'
      case 'ROJO': return 'text-rose-600 bg-rose-50 border-rose-100 border'
      case 'LISTA_NEGRA': return 'text-slate-600 bg-slate-100 border-slate-200 border'
      default: return 'text-slate-600 bg-slate-50 border-slate-200 border'
    }
  }

  const getProductIcon = (producto: string, tipo: string) => {
    const p = producto.toLowerCase()
    if (p.includes('tv') || p.includes('televisor') || p.includes('pantalla')) return <Tv className="w-5 h-5" />
    if (p.includes('celular') || p.includes('iphone') || p.includes('samsung') || p.includes('xiaomi')) return <Smartphone className="w-5 h-5" />
    if (tipo === 'mueble' || p.includes('silla') || p.includes('mesa') || p.includes('sofa')) return <Armchair className="w-5 h-5" />
    return <ShoppingBag className="w-5 h-5" />
  }

  // Rutas que aparecen en los creditos cargados. No hace falta pedirlas al
  // servidor: cada credito ya trae la suya, y asi el desplegable solo ofrece
  // rutas que de verdad tienen algo que mostrar.
  const rutasDisponibles = Array.from(
    new Set(creditos.map((c) => c.ruta).filter((r): r is string => Boolean(r))),
  ).sort((a, b) => a.localeCompare(b))

  const filteredCreditos = creditos.filter(credito => {
    const matchesSearch = credito.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credito.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credito.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEstado = estadoFiltro === 'todos' || credito.estado === estadoFiltro
    const matchesRiesgo = riesgoFiltro === 'todos' || credito.riesgo === riesgoFiltro
    const matchesRuta = rutaFiltro === 'todas' || credito.ruta === rutaFiltro
    return matchesSearch && matchesEstado && matchesRiesgo && matchesRuta
  })

  // Lógica de paginación
  const indiceUltimo = paginaActual * itemsPorPagina
  const indicePrimero = indiceUltimo - itemsPorPagina
  const creditosPaginados = filteredCreditos.slice(indicePrimero, indiceUltimo)
  const totalPaginas = Math.ceil(filteredCreditos.length / itemsPorPagina)

  const cambiarPagina = (numeroPagina: number) => setPaginaActual(numeroPagina)

  // Estadísticas rápidas
  const stats = {
    total: creditos.length,
    activos: creditos.filter(c => c.estado === 'ACTIVO').length,
    mora: creditos.filter(c => c.estado === 'EN_MORA').length,
    valorTotal: creditos.reduce((acc, curr) => acc + curr.montoTotal, 0)
  }

  if (isLoading) {
    return <AnimacionCarga texto="Cargando créditos de artículos..." />
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        {/* Header Standard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-blue-600">Créditos</span> <span className="text-orange-500">Artículos</span>
              </h1>
            </div>
            <p className="text-slate-500 mt-1 font-medium text-sm">
              Administra créditos para electrodomésticos, muebles y tecnología.
            </p>
          </div>
          {!isPuntoVentaView && (
            <button
              onClick={() => setShowCrearCreditoModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 group shadow-sm font-bold text-sm"
            >
              <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
              <span>Nuevo Crédito</span>
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 border border-blue-100">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">Total</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.total}</div>
            <p className="text-xs font-medium text-slate-500">Créditos registrados</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 border border-emerald-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Activos</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.activos}</div>
            <p className="text-xs font-medium text-slate-500">En curso actualmente</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 border border-rose-100">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">Atención</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.mora}</div>
            <p className="text-xs font-medium text-slate-500">Créditos en mora</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 border border-violet-100">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">Cartera</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{formatCurrency(stats.valorTotal)}</div>
            <p className="text-xs font-medium text-slate-500">Valor total financiado</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row gap-4 items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="w-full md:w-96 buscador-3d">
            <Search className="icon h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por cliente, artículo o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="buscador-3d-input"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {/* Filtro de Ruta: es el corte con el que se trabaja a diario */}
            {rutasDisponibles.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <select
                  value={rutaFiltro}
                  onChange={(e) => {
                    setRutaFiltro(e.target.value)
                    cambiarPagina(1)
                  }}
                  className="min-w-0 max-w-[11rem] truncate bg-transparent text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="todas">Todas las rutas</option>
                  {rutasDisponibles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro de Estado */}
            <div className="flex items-center gap-1.5 flex-wrap bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'ACTIVO', label: 'Activos' },
                { id: 'PENDIENTE_APROBACION', label: 'Pendientes' },
                { id: 'EN_MORA', label: 'En Mora' },
                { id: 'PAGADO', label: 'Pagados' }
              ].map((filtro) => (
                <button
                  key={filtro.id}
                  onClick={() => setEstadoFiltro(filtro.id)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                    estadoFiltro === filtro.id
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  {filtro.label}
                </button>
              ))}
            </div>

            {/* Filtro de Riesgo */}
            <div className="flex items-center gap-1.5 flex-wrap bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <AlertCircle className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'VERDE', label: 'Al día' },
                { id: 'AMARILLO', label: 'Precaución' },
                { id: 'ROJO', label: 'Rojo' },
                { id: 'LISTA_NEGRA', label: 'Lista Negra' }
              ].map((filtro) => (
                <button
                  key={filtro.id}
                  onClick={() => setRiesgoFiltro(filtro.id)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                    riesgoFiltro === filtro.id
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  {filtro.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla - Desktop */}
        <div className="hidden md:block bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Artículo / Cliente</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Próximo Pago</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Progreso</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Deuda</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="h-4 w-48 bg-slate-200 rounded mb-4"></div>
                        <div className="h-3 w-32 bg-slate-100 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ) : creditosPaginados.map((credito) => (
                  <tr
                    key={credito.rowKey}
                    onClick={() => setCreditoDetalleId(credito.detalleId)}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border ${
                            credito.riesgo === 'ROJO' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                            credito.riesgo === 'AMARILLO' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                          {getProductIcon(credito.producto, credito.tipoProducto || '')}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                              {credito.producto}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                               <span className="text-xs font-medium text-slate-500">{credito.cliente}</span>
                               <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getRiesgoColor(credito.riesgo)}`}>
                                 {getRiesgoLabel(credito.riesgo)}
                               </span>
                            </div>
                          </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getEstadoColor(credito.estado)}`}>
                        {getEstadoLabel(credito.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold">{credito.proximoPago}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full max-w-[140px]">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">{credito.cuotasPagadas}/{credito.cuotasTotales} cuotas</span>
                          <span className="font-bold text-slate-900">
                            {credito.cuotasTotales > 0 ? Math.round((credito.cuotasPagadas / credito.cuotasTotales) * 100) : 0}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              credito.riesgo === 'ROJO' ? 'bg-rose-500' :
                              credito.riesgo === 'AMARILLO' ? 'bg-amber-500' :
                              'bg-primary'
                            }`}
                            style={{ width: `${credito.cuotasTotales > 0 ? (credito.cuotasPagadas / credito.cuotasTotales) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-slate-900">{formatCurrency(credito.montoPendiente)}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">Total: {formatCurrency(credito.montoTotal)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCreditoDetalleId(credito.detalleId)
                        }}
                        className="inline-block p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredCreditos.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Package className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No se encontraron artículos</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto font-medium">
                No hay créditos que coincidan con los filtros seleccionados. Intenta ajustar la búsqueda.
              </p>
            </div>
          )}

          {/* Paginación Footer */}
          {!isLoading && filteredCreditos.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                Mostrando <span className="font-bold text-slate-700">{indicePrimero + 1}</span> a <span className="font-bold text-slate-700">{Math.min(indiceUltimo, filteredCreditos.length)}</span> de <span className="font-bold text-slate-700">{filteredCreditos.length}</span> resultados
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => cambiarPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-transparent hover:border-slate-200"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => cambiarPagina(num)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        paginaActual === num
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => cambiarPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Vista de Cards - Móvil */}
        <div className="md:hidden space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 animate-pulse">
                <div className="h-6 bg-slate-100 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-100 rounded w-2/3"></div>
              </div>
            ))
          ) : creditosPaginados.length > 0 ? (
            creditosPaginados.map((credito) => (
              <button
                type="button"
                key={credito.rowKey}
                onClick={() => setCreditoDetalleId(credito.detalleId)}
                className="block w-full text-left bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm border flex-shrink-0 ${
                      credito.riesgo === 'ROJO' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                      credito.riesgo === 'AMARILLO' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                      'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {getProductIcon(credito.producto, credito.tipoProducto || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{credito.producto}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{credito.cliente}</div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ml-2 ${getEstadoColor(credito.estado)}`}>
                    {getEstadoLabel(credito.estado)}
                  </span>
                </div>

                {/* Riesgo */}
                <div className="mb-3">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Nivel de Riesgo</div>
                  <span className={`inline-flex items-center text-xs px-2 py-1 rounded font-bold ${getRiesgoColor(credito.riesgo)}`}>
                    {getRiesgoLabel(credito.riesgo)}
                  </span>
                </div>

                {/* Próximo Pago */}
                <div className="mb-3">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Próximo Pago</div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold">{credito.proximoPago}</span>
                  </div>
                </div>

                {/* Progreso */}
                <div className="mb-3 pb-3 border-b border-slate-100">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Progreso de Pago</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">{credito.cuotasPagadas}/{credito.cuotasTotales} cuotas</span>
                      <span className="text-sm font-bold text-slate-900">
                        {credito.cuotasTotales > 0 ? Math.round((credito.cuotasPagadas / credito.cuotasTotales) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          credito.riesgo === 'ROJO' ? 'bg-rose-500' :
                          credito.riesgo === 'AMARILLO' ? 'bg-amber-500' :
                          'bg-primary'
                        }`}
                        style={{ width: `${credito.cuotasTotales > 0 ? (credito.cuotasPagadas / credito.cuotasTotales) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Deuda */}
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Deuda Pendiente</div>
                  <div className="font-bold text-lg text-slate-900">{formatCurrency(credito.montoPendiente)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Total: {formatCurrency(credito.montoTotal)}</div>
                </div>
              </button>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="inline-flex p-4 rounded-full bg-slate-50">
                  <Package className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No se encontraron artículos</h3>
                <p className="text-slate-500 font-medium">No hay créditos que coincidan con los filtros seleccionados.</p>
              </div>
            </div>
          )}

          {/* Paginación Móvil */}
          {!isLoading && filteredCreditos.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4">
              <Paginador
                pagina={paginaActual}
                totalPaginas={totalPaginas}
                onCambiar={cambiarPagina}
                resumen={`Mostrando ${indicePrimero + 1} a ${Math.min(indiceUltimo, filteredCreditos.length)} de ${filteredCreditos.length}`}
                className="mt-0"
              />
            </div>
          )}
        </div>
      </div>
      {!isPuntoVentaView && (
        <CrearCreditoModal
          isOpen={showCrearCreditoModal}
          onClose={() => setShowCrearCreditoModal(false)}
          defaultCreditType="articulo"
          onConfirm={async (data) => {
            try {
              const payload = buildCrearPrestamoPayload(data)
              const response = await prestamosService.crearPrestamo(payload)

              showNotification('success', 'El crédito de artículo quedó pendiente de revisión.', 'Crédito creado')
              setShowCrearCreditoModal(false)
              await loadData()

              if (!payload.esContado) {
                const loanId = response?.data?.id || response?.id || response?.prestamo?.id || response?.data?.prestamo?.id
                if (loanId) {
                  try {
                    await exportService.exportContrato(loanId)
                  } catch {
                    showNotification('warning', 'Crédito creado. No se pudo descargar el contrato automáticamente.', 'Contrato')
                  }
                }
              }
            } catch (err: any) {
              const msg = err?.response?.data?.message || err?.message || 'No se pudo crear el crédito de artículo.'
              showNotification('error', Array.isArray(msg) ? msg.join(', ') : msg, 'Error al crear crédito')
            }
          }}
        />
      )}
      {creditoDetalleId && (
        <DetallePrestamoModal
          id={creditoDetalleId}
          onClose={() => setCreditoDetalleId(null)}
        />
      )}
    </div>
  )
}

