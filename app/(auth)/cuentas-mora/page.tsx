'use client'

/**
 * ============================================================================
 * CUENTAS EN MORA - PÁGINA UNIFICADA (PERMISSION-BASED)
 * ============================================================================
 * 
 * @description
 * Módulo unificado de gestión de cuentas en mora.
 * Reemplaza las versiones duplicadas por rol:
 * - /admin/cuentas-mora (versión completa con estadísticas separadas)
 * - /coordinador/cuentas-mora (versión con loansService_)
 * - /contador/cuentas-mora (re-exportaba admin)
 * - /supervisor/cuentas-mora (era solo redirect a /supervisor/clientes)
 * 
 * @permissions
 * - CUENTAS_MORA_VIEW: Acceso al módulo
 * - CUENTAS_MORA_EXPORTAR: Exportar reportes
 * - CUENTAS_MORA_VER_PERFIL: Ver perfil completo del cliente
 * 
 * @roles
 * Adaptaciones visuales según rol:
 * - ADMIN/SUPER_ADMIN: Etiqueta "Gestión de Cartera", estadísticas con variación mensual
 * - COORDINADOR: Etiqueta "Control de Mora - Coordinación"
 * - CONTADOR: Etiqueta "Cartera en Mora - Contabilidad"
 */

import { useState, useEffect, useCallback } from 'react'
import {
  AlertCircle,
  Search,
  Filter,
  TrendingUp,
  User,
  ChevronRight,
  Phone,
  MapPin,
  FileWarning,
  CheckCircle,
  Ban,
  AlertTriangle,
  LayoutGrid,
  List,
  RefreshCw,
  Loader2,
  AlertCircle as AlertCircleIcon
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'
import DetalleMoraModal from '@/components/cobranza/DetalleMoraModal'
import ClientePortalModal from '@/components/cliente/ClientePortalModal'
import ProtectedPage from '@/components/auth/ProtectedPage'
import { usePermission } from '@/hooks/usePermission'
import { apiRequest } from '@/lib/api/api'
import { exportService } from '@/services/export-service'
import { toast } from 'sonner'
import { offlineStore } from '@/lib/offline/offlineDb'

// Enums alineados con Prisma
type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
type EstadoPrestamo = 'EN_MORA' | 'INCUMPLIDO' | 'PERDIDA';
type ViewMode = 'list' | 'grid';

interface CuentaMora {
  id: string
  numeroPrestamo: string
  cliente: {
    id: string
    nombre: string
    documento: string
    telefono: string
    direccion: string
  }
  diasMora: number
  montoMora: number
  montoTotalDeuda: number
  cuotasVencidas: number
  ruta: string
  cobrador: string
  nivelRiesgo: NivelRiesgo
  estado: EstadoPrestamo
  ultimoPago?: string
}

interface EstadisticasMora {
  totalMora: number;
  totalDeudaRiesgo: number;
  totalClientesAfectados: number;
  clientesCriticos: number;
  variacionMensual: number;
}

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

function CuentasMoraContent() {
  const { can, rol } = usePermission()

  // --- Variaciones de UI por rol ---
  const esCoordinador = rol === 'COORDINADOR'
  const esContador = rol === 'CONTADOR'
  const headerLabel = esCoordinador 
    ? 'Control de Mora - Coordinación' 
    : esContador 
      ? 'Cartera en Mora - Contabilidad'
      : 'Gestión de Cartera'
  const headerDescription = esCoordinador
    ? 'Reporte consolidado de clientes con pagos retrasados y alertas de riesgo.'
    : 'Monitoreo y recuperación de cartera vencida de CrediSur.'
  
  // Rol para el modal de perfil de cliente
  const rolParaModal = esCoordinador ? 'coordinador' : esContador ? 'contador' : 'admin'

  // Fallback por rol para permisos
  const rolesConAcceso = ['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'CONTADOR']
  const puedeExportar = can('CUENTAS_MORA_EXPORTAR') || rolesConAcceso.includes(rol || '')
  const puedeVerPerfil = can('CUENTAS_MORA_VER_PERFIL') || rolesConAcceso.includes(rol || '')

  // Estados de datos
  const [cuentas, setCuentas] = useState<CuentaMora[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticasMora | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [isDataLoading, setIsDataLoading] = useState(true)

  // Estados de filtros y UI
  const [busqueda, setBusqueda] = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState<NivelRiesgo | 'TODOS'>('TODOS')
  const [filtroRuta, setFiltroRuta] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  
  // Modales
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaMora | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)

  // Paginación
  const [page, setPage] = useState(1)
  const limit = 50

  const fetchData = useCallback(async () => {
    setIsDataLoading(true)
    try {
      const params: any = {
        pagina: page,
        limite: limit,
      }
      
      if (busqueda) params.busqueda = busqueda
      if (filtroRiesgo !== 'TODOS') params.riesgo = filtroRiesgo
      if (filtroRuta) params.rutaId = filtroRuta

      const response = await apiRequest<PaginatedResponse<CuentaMora>>(
        'GET',
        '/reports/prestamos-mora',
        undefined,
        { params }
      )
      
      const items = Array.isArray(response) ? response : Array.isArray(response.data) ? response.data : []
      setCuentas(items)
    } catch (error) {
      console.error('Error al cargar cuentas en mora:', error)
      // Fallback offline: construir desde préstamos en IndexedDB
      try {
        const offPrestamos = await offlineStore.getAll<any>('prestamos');
        const offClientes = await offlineStore.getAll<any>('clientes');
        const moraItems: CuentaMora[] = offPrestamos
          .filter((p: any) => p.estado === 'EN_MORA' || p.estado === 'INCUMPLIDO' || (p.diasMora && p.diasMora > 0))
          .map((p: any) => {
            const cli = offClientes.find((c: any) => c.id === p.clienteId);
            return {
              id: p.id,
              numeroPrestamo: p.numeroPrestamo || p.id,
              cliente: {
                id: cli?.id || p.clienteId || '',
                nombre: cli ? `${cli.nombres} ${cli.apellidos}` : '',
                documento: cli?.dni || '',
                telefono: cli?.telefono || '',
                direccion: cli?.direccion || '',
              },
              diasMora: p.diasMora || 0,
              montoMora: p.montoMora || 0,
              montoTotalDeuda: p.saldoPendiente || p.montoTotal || 0,
              cuotasVencidas: 0,
              ruta: '',
              cobrador: '',
              nivelRiesgo: (p.diasMora > 30 ? 'ROJO' : p.diasMora > 15 ? 'AMARILLO' : 'VERDE') as NivelRiesgo,
              estado: (p.estado || 'EN_MORA') as EstadoPrestamo,
            };
          });
        if (moraItems.length > 0) {
          setCuentas(moraItems);
          return;
        }
      } catch { /* ignore */ }
      toast.error('Error al cargar la lista de cuentas en mora')
    } finally {
      setIsDataLoading(false)
    }
  }, [page, busqueda, filtroRiesgo, filtroRuta])

  const fetchEstadisticas = async () => {
    setIsStatsLoading(true)
    try {
      const items = await apiRequest<EstadisticasMora>(
        'GET',
        '/reports/estadisticas-mora'
      )
      setEstadisticas(items)
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
      setEstadisticas(null)
    } finally {
      setIsStatsLoading(false)
    }
  }

  // Cargar estadísticas al inicio
  useEffect(() => {
    fetchEstadisticas()
  }, [])

  // Cargar datos cuando cambian filtros
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [fetchData])

  const handleVerDetalle = (cuenta: CuentaMora) => {
    setSelectedCuenta(cuenta)
    setIsModalOpen(true)
  }

  const handleVerCliente = (id: string) => {
    setSelectedClientId(id)
    setIsClientModalOpen(true)
  }

  const handleExportExcel = async () => {
    try {
      toast.info('Generando reporte Excel...')
      await exportService.exportMora('excel', {
        busqueda,
        riesgo: filtroRiesgo !== 'TODOS' ? filtroRiesgo : undefined,
        rutaId: filtroRuta || undefined,
      })
      toast.success('Archivo descargado exitosamente')
    } catch (error) {
      toast.error('Error al exportar reporte')
    }
  }

  const handleExportPDF = async () => {
    try {
      toast.info('Generando reporte PDF...')
      await exportService.exportMora('pdf', {
        busqueda,
        riesgo: filtroRiesgo !== 'TODOS' ? filtroRiesgo : undefined,
        rutaId: filtroRuta || undefined,
      })
      toast.success('Archivo descargado exitosamente')
    } catch (error) {
      toast.error('Error al exportar reporte')
    }
  }

  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'AMARILLO': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'ROJO': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'LISTA_NEGRA': return 'bg-slate-900 text-white border-slate-700';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  }

  const getRiesgoIcon = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return <CheckCircle className="h-4 w-4" />;
      case 'AMARILLO': return <AlertTriangle className="h-4 w-4" />;
      case 'ROJO': return <AlertCircle className="h-4 w-4" />;
      case 'LISTA_NEGRA': return <Ban className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  }

  // Totales: backend si disponible, sino cálculo local
  const totalMora = estadisticas?.totalMora ?? (cuentas?.reduce((acc, curr) => acc + curr.montoMora, 0) || 0)
  const totalDeuda = estadisticas?.totalDeudaRiesgo ?? (cuentas?.reduce((acc, curr) => acc + curr.montoTotalDeuda, 0) || 0)
  const clientesAfectados = estadisticas?.totalClientesAfectados ?? (cuentas?.length || 0)
  const clientesCriticos = estadisticas?.clientesCriticos ?? (cuentas?.filter(c => c.nivelRiesgo === 'ROJO').length || 0)

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-rose-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 mb-2 border border-rose-100">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{headerLabel}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Cuentas en </span><span className="text-orange-500">Mora</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1 font-medium">
              {headerDescription}
              <span className="text-slate-400 ml-2">({(cuentas || []).length} registros)</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
             <button 
              onClick={() => { fetchData(); fetchEstadisticas(); }}
              className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all"
              title="Actualizar datos"
            >
              <RefreshCw className={cn("h-5 w-5", (isDataLoading || isStatsLoading) && "animate-spin")} />
            </button>
            {puedeExportar && (
              <ExportButton 
                label="Exportar" 
                onExportExcel={handleExportExcel} 
                onExportPDF={handleExportPDF} 
              />
            )}
          </div>
        </div>

        <div className="px-1 md:px-1 py-4 space-y-8">
        {/* Resumen de métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total en Mora</p>
                {isStatsLoading ? (
                  <div className="h-8 w-32 bg-slate-200 animate-pulse rounded mt-2"></div>
                ) : (
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalMora)}</h3>
                )}
              </div>
              <div className="p-3 bg-rose-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="h-5 w-5 text-rose-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />
                {estadisticas?.variacionMensual ? `+${estadisticas.variacionMensual}%` : '+0%'}
              </span>
              <span className="text-xs font-medium text-slate-400">vs mes anterior</span>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deuda Total Riesgo</p>
                {isStatsLoading ? (
                  <div className="h-8 w-32 bg-slate-200 animate-pulse rounded mt-2"></div>
                ) : (
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalDeuda)}</h3>
                )}
              </div>
              <div className="p-3 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FileWarning className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Capital + Intereses + Mora</span>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes Afectados</p>
                 {isStatsLoading ? (
                  <div className="h-8 w-16 bg-slate-200 animate-pulse rounded mt-2"></div>
                ) : (
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{clientesAfectados}</h3>
                )}
              </div>
              <div className="p-3 bg-sky-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <User className="h-5 w-5 text-sky-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">
                {clientesCriticos} en estado crítico
              </span>
            </div>
          </div>
        </div>

        {/* Filtros y Controles */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 w-full md:w-auto">
                <FiltroRuta 
                    onRutaChange={(r: string | null) => setFiltroRuta(r)}
                    selectedRutaId={filtroRuta}
                    layout="wrap"
                    showAllOption={true}
                    hideLabel={true}
                />
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, documento o ruta..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium placeholder:text-slate-400 bg-white shadow-sm"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 flex-wrap bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
              
              {[
                { id: 'TODOS', label: 'Todos' },
                { id: 'AMARILLO', label: 'Riesgo' },
                { id: 'ROJO', label: 'Mora' },
                { id: 'LISTA_NEGRA', label: 'Lista Negra' }
              ].map((filtro) => (
                <button
                  key={filtro.id}
                  onClick={() => setFiltroRiesgo(filtro.id as NivelRiesgo | 'TODOS')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                    filtroRiesgo === filtro.id 
                      ? 'bg-primary text-white shadow-md shadow-primary/20' 
                      : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  {filtro.label}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  viewMode === 'list' 
                    ? "bg-white text-primary shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  viewMode === 'grid' 
                    ? "bg-white text-primary shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Lista de cuentas */}
        {isDataLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
                <RefreshCw className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-slate-500 font-medium">Cargando cuentas en mora...</p>
            </div>
        ) : !cuentas || cuentas.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="inline-flex p-4 rounded-full bg-emerald-50 mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Todo en orden</h3>
            <p className="text-slate-500 font-medium">No se encontraron cuentas en mora con los filtros actuales.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cuentas.map((cuenta) => (
              <div key={cuenta.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden group flex flex-col">
                <div className="p-6 flex-1 space-y-6">
                  {/* Info Cliente */}
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-primary transition-colors">{cuenta.cliente.nombre}</h3>
                        <p className="text-sm text-slate-500 font-mono font-medium">{cuenta.cliente.documento}</p>
                      </div>
                      <span className={cn("px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5", getRiesgoColor(cuenta.nivelRiesgo))}>
                        {getRiesgoIcon(cuenta.nivelRiesgo)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 text-sm text-slate-600 font-medium mt-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{cuenta.cliente.telefono}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate max-w-xs">{cuenta.cliente.direccion}</span>
                      </div>
                    </div>
                  </div>

                  {/* Info Deuda */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Mora</p>
                      <p className="text-lg font-bold text-rose-600">{formatCurrency(cuenta.montoMora)}</p>
                      <p className="text-xs text-rose-500 font-medium">{cuenta.diasMora} días</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Total</p>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(cuenta.montoTotalDeuda)}</p>
                      <p className="text-xs text-slate-500 font-medium">{cuenta.cuotasVencidas} cuotas</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Ruta</p>
                      <p className="text-sm font-bold text-slate-700">{cuenta.ruta}</p>
                      <p className="text-xs text-slate-500 font-medium">{cuenta.cobrador}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Último Pago</p>
                      <p className="text-sm font-bold text-slate-700">{cuenta.ultimoPago ? new Date(cuenta.ultimoPago).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="pt-4 border-t border-slate-100 flex gap-2">
                    {puedeVerPerfil && (
                      <button
                        onClick={() => handleVerCliente(cuenta.cliente.id)}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-slate-50 text-slate-700 rounded-xl hover:bg-blue-50 hover:text-blue-700 text-sm font-bold transition-colors"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Perfil
                      </button>
                    )}
                    <button
                      onClick={() => handleVerDetalle(cuenta)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark text-sm font-bold transition-colors shadow-lg shadow-primary/20"
                    >
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Detalle
                    </button>
                  </div>
                </div>
                
                {/* Barra de estado visual */}
                <div className={cn("h-1 w-full", 
                  cuenta.nivelRiesgo === 'ROJO' ? 'bg-rose-500' : 
                  cuenta.nivelRiesgo === 'AMARILLO' ? 'bg-amber-500' : 
                  cuenta.nivelRiesgo === 'LISTA_NEGRA' ? 'bg-slate-900' : 'bg-emerald-500'
                )} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Cliente / Documento</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Riesgo</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Ubicación</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Deuda Total</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Mora</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cuentas.map((cuenta) => (
                    <tr key={cuenta.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 font-bold">
                            {cuenta.cliente.nombre.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">{cuenta.cliente.nombre}</div>
                            <div className="text-xs text-slate-500 font-medium font-mono">{cuenta.cliente.documento}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5", getRiesgoColor(cuenta.nivelRiesgo))}>
                          {getRiesgoIcon(cuenta.nivelRiesgo)}
                          {cuenta.nivelRiesgo.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-700 font-bold text-xs">{cuenta.ruta}</span>
                          <span className="text-slate-500 text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {cuenta.cliente.direccion}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-base font-black text-slate-900">{formatCurrency(cuenta.montoTotalDeuda)}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Deuda Total</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-base font-black text-rose-600">{formatCurrency(cuenta.montoMora)}</div>
                        <div className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Mora ({cuenta.diasMora}d)</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {puedeVerPerfil && (
                            <button 
                              onClick={() => handleVerCliente(cuenta.cliente.id)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                              title="Ver Perfil"
                            >
                              <User className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleVerDetalle(cuenta)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                            title="Ver Detalle"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {cuentas.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-full bg-slate-50 mb-4">
                  <CheckCircle className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Sin resultados</h3>
                <p className="text-slate-500 font-medium">No se encontraron cuentas con los filtros seleccionados.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
      {/* Modal de Detalle */}
      {isModalOpen && selectedCuenta && (
        <DetalleMoraModal 
          cuenta={selectedCuenta} 
          onClose={() => setIsModalOpen(false)} 
          onVerCliente={handleVerCliente}
        />
      )}

      {/* Modal de Perfil de Cliente */}
      {isClientModalOpen && selectedClientId && (
        <ClientePortalModal 
          clientId={selectedClientId} 
          onClose={() => setIsClientModalOpen(false)} 
          rolUsuario={rolParaModal}
        />
      )}
  </div>
  )
}

export default function CuentasMoraPage() {
  return (
    <ProtectedPage permiso="CUENTAS_MORA_VIEW">
      <CuentasMoraContent />
    </ProtectedPage>
  )
}
