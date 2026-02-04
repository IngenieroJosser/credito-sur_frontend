'use client'

import { useState, useEffect } from 'react'
import {
  Archive,
  Search,
  Clock,
  LayoutGrid,
  List,
  Calendar,
  Loader2,
  AlertCircle as AlertCircleIcon,
  CheckCircle,
  XCircle,
  Scale
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'
import GestionarVencidaModal from '@/components/cobranza/GestionarVencidaModal'
import { 
  vencidasService, 
  type CuentaVencida, 
  type NivelRiesgo,
  type DecisionCastigo,
  type DecisionCastigoRequest
} from '@/services/vencidas-service'
import { toast } from 'sonner'

type ViewMode = 'list' | 'grid';

const CuentasVencidasCoordinador = () => {
  const [cuentas, setCuentas] = useState<CuentaVencida[]>([])
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showModal, setShowModal] = useState(false)
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaVencida | null>(null)
  const [filtroRuta, setFiltroRuta] = useState<string | null>(null)
  const [filtroRiesgo, setFiltroRiesgo] = useState<NivelRiesgo | 'TODOS'>('TODOS')
  const [totales, setTotales] = useState({
    totalVencido: 0,
    diasPromedioVencimiento: 0
  })

  const fetchCuentasVencidas = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const filtros = {
        busqueda: busqueda || undefined,
        nivelRiesgo: filtroRiesgo !== 'TODOS' ? filtroRiesgo : undefined,
        rutaId: filtroRuta || undefined
      }

      const response = await vencidasService.obtenerCuentasVencidas(filtros)
      
      setCuentas(response.cuentas)
      setTotales({
        totalVencido: response.totales.totalVencido,
        diasPromedioVencimiento: response.totales.diasPromedioVencimiento
      })
    } catch (err) {
      setError('Error al cargar las cuentas vencidas')
      toast.error('No se pudieron cargar las cuentas vencidas')
      console.error('Error fetching cuentas vencidas:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setExportLoading(true)
      const filtros = {
        busqueda: busqueda || undefined,
        nivelRiesgo: filtroRiesgo !== 'TODOS' ? filtroRiesgo : undefined,
        rutaId: filtroRuta || undefined
      }
      
      await vencidasService.exportarReporteVencidas('excel', filtros)
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
      const filtros = {
        busqueda: busqueda || undefined,
        nivelRiesgo: filtroRiesgo !== 'TODOS' ? filtroRiesgo : undefined,
        rutaId: filtroRuta || undefined
      }
      
      await vencidasService.exportarReporteVencidas('pdf', filtros)
      toast.success('Reporte PDF generado exitosamente')
    } catch (err) {
      toast.error('Error al exportar el reporte')
      console.error('Export error:', err)
    } finally {
      setExportLoading(false)
    }
  }

  const handleGestionar = (cuenta: CuentaVencida) => {
    setSelectedCuenta(cuenta)
    setShowModal(true)
  }

  const handleSaveDecision = async (data: { 
    decision: DecisionCastigo; 
    montoInteres: number; 
    comentarios?: string;
    nuevaFechaVencimiento?: string;
  }) => {
    try {
      if (!selectedCuenta) return;

      const request: DecisionCastigoRequest = {
        prestamoId: selectedCuenta.id,
        decision: data.decision,
        montoInteres: data.montoInteres,
        comentarios: data.comentarios,
        nuevaFechaVencimiento: data.nuevaFechaVencimiento
      };

      const response = await vencidasService.procesarDecision(request);
      
      toast.success(response.mensaje);
      
      // Actualizar la cuenta en la lista
      setCuentas(prev => prev.map(cuenta => 
        cuenta.id === selectedCuenta.id 
          ? { ...cuenta, estado: response.nuevoEstado } 
          : cuenta
      ));

      setShowModal(false);
      setSelectedCuenta(null);
      
      // Recargar datos si es necesario
      fetchCuentasVencidas();
    } catch (err) {
      toast.error('Error al procesar la decisión');
      console.error('Error processing decision:', err);
    }
  };

  // Efecto para cargar datos iniciales
  useEffect(() => {
    fetchCuentasVencidas();
  }, []);

  // Efecto para filtrar con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCuentasVencidas();
    }, 500);

    return () => clearTimeout(timer);
  }, [busqueda, filtroRuta, filtroRiesgo]);

  const getRiesgoColor = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'AMARILLO': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'ROJO': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'LISTA_NEGRA': return 'bg-slate-900 text-white border-slate-700';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getRiesgoIcon = (riesgo: NivelRiesgo) => {
    switch (riesgo) {
      case 'VERDE': return <CheckCircle className="h-4 w-4" />;
      case 'AMARILLO': return <AlertCircleIcon className="h-4 w-4" />;
      case 'ROJO': return <XCircle className="h-4 w-4" />;
      case 'LISTA_NEGRA': return <Scale className="h-4 w-4" />;
      default: return <AlertCircleIcon className="h-4 w-4" />;
    }
  };

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      'EN_MORA': { color: 'bg-amber-50 text-amber-700 border-amber-100', icon: <Clock className="h-3 w-3" /> },
      'INCUMPLIDO': { color: 'bg-rose-50 text-rose-700 border-rose-100', icon: <XCircle className="h-3 w-3" /> },
      'PERDIDA': { color: 'bg-slate-900 text-white border-slate-700', icon: <Archive className="h-3 w-3" /> },
    };

    const { color, icon } = config[estado] || { color: 'bg-slate-50 text-slate-700', icon: <AlertCircleIcon className="h-3 w-3" /> };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1 ${color}`}>
        {icon}
        {estado.replace('_', ' ')}
      </span>
    );
  };

  if (loading && cuentas.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Cargando cuentas vencidas...</p>
        </div>
      </div>
    );
  }

  if (error && cuentas.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircleIcon className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error al cargar datos</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={fetchCuentasVencidas}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8 text-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 mb-2 border border-slate-200">
              <Archive className="h-3.5 w-3.5" />
              <span>Cuentas para Castigo / Jurídico</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Cuentas </span><span className="text-slate-900">Vencidas</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1 font-medium">
              Créditos cuya fecha final de contrato ha expirado sin ser liquidados.
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Capital Final Vencido</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totales.totalVencido)}</h3>
            </div>
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
              <Archive className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Días Promedio Vencimiento</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totales.diasPromedioVencimiento} Días</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            <FiltroRuta 
                onRutaChange={(r: string | null) => setFiltroRuta(r)} 
                selectedRutaId={filtroRuta}
                showAllOption={true}
            />

            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500/10"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <select
              className="pl-4 pr-8 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/10"
              value={filtroRiesgo}
              onChange={(e) => setFiltroRiesgo(e.target.value as NivelRiesgo | 'TODOS')}
            >
              <option value="TODOS">Todos los riesgos</option>
              <option value="ROJO">Alto Riesgo</option>
              <option value="LISTA_NEGRA">Lista Negra</option>
            </select>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg", viewMode === 'list' ? "bg-slate-100 text-blue-600" : "text-slate-400")}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg", viewMode === 'grid' ? "bg-slate-100 text-blue-600" : "text-slate-400")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
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
              <Archive className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay cuentas vencidas</h3>
            <p className="text-slate-600">No se encontraron préstamos vencidos con los filtros aplicados.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                <tr>
                  <th className="px-6 py-4">Préstamo / Cliente</th>
                  <th className="px-6 py-4">Riesgo / Estado</th>
                  <th className="px-6 py-4">Vencimiento</th>
                  <th className="px-6 py-4 text-center">Días</th>
                  <th className="px-6 py-4 text-right">Saldo Pendiente</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cuentas.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{c.numeroPrestamo}</div>
                      <div className="text-xs text-slate-500">{c.cliente.nombre}</div>
                      <div className="text-xs text-slate-400">{c.ruta}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 w-fit", getRiesgoColor(c.nivelRiesgo))}>
                          {getRiesgoIcon(c.nivelRiesgo)}
                          {c.nivelRiesgo}
                        </span>
                        {getEstadoBadge(c.estado)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(c.fechaVencimiento).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100">
                        {c.diasVencidos} días
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-lg font-black text-slate-900">{formatCurrency(c.saldoPendiente)}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        Original: {formatCurrency(c.montoOriginal)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleGestionar(c)} 
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-rose-200 text-rose-600 font-bold rounded-lg hover:bg-rose-50 transition-all text-xs shadow-sm hover:shadow-md"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cuentas.map((cuenta) => (
              <div key={cuenta.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{cuenta.numeroPrestamo}</h3>
                    <p className="text-sm text-slate-600">{cuenta.cliente.nombre}</p>
                  </div>
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border", getRiesgoColor(cuenta.nivelRiesgo))}>
                    {cuenta.nivelRiesgo}
                  </span>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Vencimiento:</span>
                    <span className="font-semibold">{new Date(cuenta.fechaVencimiento).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Días vencidos:</span>
                    <span className="font-semibold text-rose-600">{cuenta.diasVencidos}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Saldo pendiente:</span>
                    <span className="font-bold">{formatCurrency(cuenta.saldoPendiente)}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleGestionar(cuenta)} 
                  className="w-full py-2 bg-slate-900 text-white rounded-xl text-center text-sm font-bold block transition-all hover:bg-slate-800 shadow-lg shadow-slate-900/10"
                >
                  Gestionar Cuenta
                </button>
              </div>
            ))}
          </div>
        )}

        {showModal && selectedCuenta && (
          <GestionarVencidaModal 
            cuenta={selectedCuenta}
            onClose={() => {
              setShowModal(false)
              setSelectedCuenta(null)
            }}
            onConfirm={(data: { cobrarInteres: boolean; montoInteres: number }) => handleSaveDecision({ decision: 'CASTIGAR', montoInteres: data.montoInteres })}
          />
        )}
      </div>
    </div>
  )
}

export default CuentasVencidasCoordinador
