'use client'

import { useState, useEffect } from 'react'
import {
  AlertCircle,
  Search,
  User,
  ChevronRight,
  FileWarning,
  CheckCircle,
  Ban,
  AlertTriangle,
  LayoutGrid,
  List,
  Loader2,
  AlertCircle as AlertCircleIcon
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'
import DetalleMoraModal from '@/components/cobranza/DetalleMoraModal'
import ClientePortalModal from '@/components/cliente/ClientePortalModal'
import { 
  loansService_, 
  type CuentaMora, 
  type NivelRiesgo, 
  type EstadoPrestamo,
  type PrestamosMoraFiltros 
} from '@/services/loans-service'
import { toast } from 'sonner'

type ViewMode = 'list' | 'grid';

const CuentasMoraCoordinador = () => {
  const [cuentas, setCuentas] = useState<CuentaMora[]>([])
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState<NivelRiesgo | 'TODOS'>('TODOS')
  const [filtroRuta, setFiltroRuta] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaMora | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [totales, setTotales] = useState({
    totalMora: 0,
    totalDeuda: 0,
    totalCasosCriticos: 0
  })

  const fetchCuentasMora = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const filtros: PrestamosMoraFiltros = {
        busqueda: busqueda || undefined,
        nivelRiesgo: filtroRiesgo !== 'TODOS' ? filtroRiesgo : undefined,
        rutaId: filtroRuta || undefined
      }

      const response = await loansService_.obtenerPrestamosMora(filtros)
      
      setCuentas(response.prestamos)
      setTotales({
        totalMora: response.totales.totalMora,
        totalDeuda: response.totales.totalDeuda,
        totalCasosCriticos: response.totales.totalCasosCriticos
      })
    } catch (err) {
      setError('Error al cargar las cuentas en mora')
      toast.error('No se pudieron cargar las cuentas en mora')
      console.error('Error fetching cuentas en mora:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setExportLoading(true)
      const filtros: PrestamosMoraFiltros = {
        busqueda: busqueda || undefined,
        nivelRiesgo: filtroRiesgo !== 'TODOS' ? filtroRiesgo : undefined,
        rutaId: filtroRuta || undefined
      }
      
      await loansService_.exportarReporteMora('excel', filtros)
      toast.success('Reporte Excel generado exitosamente')
    } catch (err) {
      toast.error('Error al exportar el reporte')
      console.error('Export error:', err)
    } finally {
      setExportLoading(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      setExportLoading(true)
      const filtros: PrestamosMoraFiltros = {
        busqueda: busqueda || undefined,
        nivelRiesgo: filtroRiesgo !== 'TODOS' ? filtroRiesgo : undefined,
        rutaId: filtroRuta || undefined
      }
      
      await loansService_.exportarReporteMora('pdf', filtros)
      toast.success('Reporte PDF generado exitosamente')
    } catch (err) {
      toast.error('Error al exportar el reporte')
      console.error('Export error:', err)
    } finally {
      setExportLoading(false)
    }
  }

  const handleVerDetalle = (cuenta: CuentaMora) => {
    setSelectedCuenta(cuenta)
    setIsModalOpen(true)
  }

  const handleVerCliente = (id: string) => {
    setSelectedClientId(id)
    setIsClientModalOpen(true)
  }

  // Efecto para cargar datos iniciales
  useEffect(() => {
    fetchCuentasMora()
  }, [])

  // Efecto para filtrar con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCuentasMora()
    }, 500)

    return () => clearTimeout(timer)
  }, [busqueda, filtroRiesgo, filtroRuta])

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

  if (loading && cuentas.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Cargando cuentas en mora...</p>
        </div>
      </div>
    )
  }

  if (error && cuentas.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircleIcon className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error al cargar datos</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={fetchCuentasMora}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-rose-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8 text-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 mb-2 border border-rose-100">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Control de Mora - Coordinación</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Cuentas en </span><span className="text-orange-500">Mora</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1 font-medium">
              Reporte consolidado de clientes con pagos retrasados y alertas de riesgo.
              <span className="text-slate-400 ml-2">({cuentas.length} registros)</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExportButton 
              label="Exportar" 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mora Acumulada</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totales.totalMora)}</h3>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl">
                <AlertCircle className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capital en Riesgo</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totales.totalDeuda)}</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <FileWarning className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Casos Críticos</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{totales.totalCasosCriticos}</h3>
              </div>
              <div className="p-3 bg-sky-50 rounded-xl">
                <User className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            <FiltroRuta 
                onRutaChange={(r: string | null) => setFiltroRuta(r)} 
                selectedRutaId={filtroRuta}
                showAllOption={true}
            />

            <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                type="text"
                placeholder="Buscar por cliente, documento o ruta..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 outline-none text-sm bg-white"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
                className="pl-4 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/10"
                value={filtroRiesgo}
                onChange={(e) => setFiltroRiesgo(e.target.value as NivelRiesgo | 'TODOS')}
            >
                <option value="TODOS">Todos los riesgos</option>
                <option value="AMARILLO">Riesgo Moderado</option>
                <option value="ROJO">Alto Riesgo</option>
                <option value="LISTA_NEGRA">Lista Negra</option>
            </select>
            
            <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg", viewMode === 'list' ? "bg-slate-100 text-blue-600" : "text-slate-400")}>
                    <List className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg", viewMode === 'grid' ? "bg-slate-100 text-blue-600" : "text-slate-400")}>
                    <LayoutGrid className="h-4 w-4" />
                </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-slate-600">Actualizando datos...</span>
          </div>
        ) : cuentas.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileWarning className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay cuentas en mora</h3>
            <p className="text-slate-600">No se encontraron préstamos en mora con los filtros aplicados.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold">Cliente</th>
                    <th className="px-6 py-4 font-bold text-center">Riesgo</th>
                    <th className="px-6 py-4 font-bold text-right">Mora / Días</th>
                    <th className="px-6 py-4 font-bold text-right">Deuda Total</th>
                    <th className="px-6 py-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cuentas.map((cuenta) => (
                    <tr key={cuenta.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{cuenta.cliente.nombre}</div>
                        <div className="text-xs text-slate-500">{cuenta.cliente.documento}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5", getRiesgoColor(cuenta.nivelRiesgo))}>
                          {getRiesgoIcon(cuenta.nivelRiesgo)}
                          {cuenta.nivelRiesgo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-base font-black text-rose-600">{formatCurrency(cuenta.montoMora)}</div>
                        <div className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Mora ({cuenta.diasMora}d)</div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-base font-black text-slate-900">{formatCurrency(cuenta.montoTotalDeuda)}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Deuda Total</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleVerDetalle(cuenta)} 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg inline-block transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cuentas.map((cuenta) => (
              <div key={cuenta.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-slate-900">{cuenta.cliente.nombre}</h3>
                        <p className="text-xs text-slate-500">{cuenta.cliente.documento}</p>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border", getRiesgoColor(cuenta.nivelRiesgo))}>
                        {cuenta.nivelRiesgo}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase">Mora</p>
                        <p className="text-rose-600 font-bold">{formatCurrency(cuenta.montoMora)}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase">Deuda</p>
                        <p className="text-slate-900 font-bold">{formatCurrency(cuenta.montoTotalDeuda)}</p>
                    </div>
                </div>
                <button 
                  onClick={() => handleVerDetalle(cuenta)} 
                  className="w-full py-2 bg-slate-900 text-white rounded-xl text-center text-sm font-bold block transition-all hover:bg-slate-800 shadow-lg shadow-slate-900/10"
                >
                    Ver Detalles en Mora
                </button>
              </div>
            ))}
          </div>
        )}
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
          rolUsuario="coordinador"
        />
      )}
    </div>
  )
}

export default CuentasMoraCoordinador
