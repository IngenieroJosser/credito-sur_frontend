'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Wallet,
  DollarSign,
  Calendar,
  FileText as FileTextIcon,
  ArrowLeft as ArrowLeftIcon,
  ChevronRight,
  TrendingUp,
  Sparkles,
  MapPin,
  AlertCircle,
  UserPlus,
  Plus,
  User,
  Phone,
  CreditCard,
  Fingerprint,
  CalendarDays,
  Star,
  History,
  Loader2
} from 'lucide-react'

import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RutaDetalleMock } from '@/lib/rutas-data'
import { routesService } from '@/services/routes-service'
import { clientesService } from '@/services/clientes-service'
import { useNotification } from '@/components/providers/NotificationProvider'

import PagoModal from '@/components/cobranza/PagoModal'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'
import ReprogramarModal from '@/components/cobranza/ReprogramarModal'
import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'
import { StaticVisitaItem, SeleccionClienteModal } from '@/components/dashboards/shared/CobradorElements'
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal'
import { useAuth } from '@/hooks/useAuth'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'
import { prestamosService } from '@/services/prestamos-service'
import { FrecuenciaPago } from '@/types/enums'

interface GastoRuta {
  id: string
  tipo: 'OPERATIVO' | 'TRANSPORTE' | 'OTRO'
  descripcion: string
  valor: number
  hora: string
}

interface RutaClientProps {
  initialRuta: RutaDetalleMock | null;
}

const RutaClient = ({ initialRuta }: RutaClientProps) => {
  const { showNotification } = useNotification()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  
  // No mocks. Use backend data or empty state managed by modals.
  const [gastos] = useState<GastoRuta[]>([])

  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false)
  const [nuevoGasto, setNuevoGasto] = useState({ tipo: 'OPERATIVO', descripcion: '', valor: '' })
  // const [searchQuery, setSearchQuery] ... used in render
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false) // Used in render toggle
  const [rutaCompletada, setRutaCompletada] = useState(!!initialRuta?.activa)
  const [showClienteSelector, setShowClienteSelector] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showCrearCreditoModal, setShowCrearCreditoModal] = useState(false)
  const [defaultClienteId, setDefaultClienteId] = useState<string | null>(null)

  // Estados para filtros y historial (Portados de VistaCobrador)
  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<'TODOS' | 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES'>('TODOS')
  const [showHistory, setShowHistory] = useState(false)
  const [historialRutas, setHistorialRutas] = useState<any>(null)
  const [historyViewMode, setHistoryViewMode] = useState<'DAYS' | 'MONTHS'>('DAYS')
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)

  // Map ALL asignaciones from backend to visits UI model
  const [visitasCobrador, setVisitasCobrador] = useState<VisitaRuta[]>(() => {
      const asignaciones = initialRuta?.asignaciones || initialRuta?.asignacionesRuta;
      if (!asignaciones || !Array.isArray(asignaciones)) return [];
      
      return (asignaciones as any[]).map((asig: any, index: number) => {
          const prestamo = asig.cliente?.prestamos?.[0];
          const proximaCuota = prestamo?.cuotas?.[0];

          return {
            id: asig.id || `temp-${index}`,
            cliente: `${asig.cliente?.nombres || ''} ${asig.cliente?.apellidos || ''}`.trim() || 'Cliente Desconocido',
            direccion: asig.cliente?.direccion || 'Sin dirección registrada',
            telefono: asig.cliente?.telefono || '',
            horaSugerida: asig.horaSugerida || '08:00 AM',
            montoCuota: Number(proximaCuota?.monto || 0),
            saldoTotal: Number(prestamo?.saldoPendiente || 0),
            estado: asig.estado?.toLowerCase() || 'pendiente',
            proximaVisita: proximaCuota?.fechaVencimiento || new Date().toISOString().split('T')[0],
            ordenVisita: asig.ordenVisita || index + 1,
            prioridad: (asig.prioridad?.toLowerCase() as any) || 'media',
            cobradorId: initialRuta.cobradorId || '',
            periodoRuta: (() => {
              const f = prestamo?.frecuenciaPago || 'DIARIO';
              if (f === 'DIARIO') return 'DIA';
              if (f === 'SEMANAL') return 'SEMANA';
              if (f === 'QUINCENAL') return 'QUINCENA';
              if (f === 'MENSUAL') return 'MES';
              return 'DIA';
            })() as any,
            nivelRiesgo: (() => {
              const r = asig.cliente?.nivelRiesgo || 'VERDE';
              if (r === 'VERDE') return 'bajo';
              if (r === 'AMARILLO') return 'leve';
              if (r === 'ROJO') return 'moderado';
              if (r === 'LISTA_NEGRA') return 'critico';
              return 'bajo';
            })() as any,
            clienteId: asig.cliente?.id || '',
            prestamoId: prestamo?.id || ''
          };
      });
  })

  // Agrupar visitas por frecuencia de pago
  const { visitasAgrupadas, totalMostradas } = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let filtradas = visitasCobrador.filter(v => 
      v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.direccion.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Aplicar filtro de periodo
    if (periodoRutaFiltro !== 'TODOS') {
        filtradas = filtradas.filter(v => v.periodoRuta === periodoRutaFiltro);
    }

    const agrupar = {
      MES: filtradas.filter(v => v.periodoRuta === 'MES'),
      QUINCENA: filtradas.filter(v => v.periodoRuta === 'QUINCENA'),
      SEMANA: filtradas.filter(v => v.periodoRuta === 'SEMANA'),
      DIA: filtradas.filter(v => v.periodoRuta === 'DIA'),
    }

    return { visitasAgrupadas: agrupar, totalMostradas: filtradas.length };
  }, [visitasCobrador, searchQuery, periodoRutaFiltro]);

  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)
  const [accionPendiente, setAccionPendiente] = useState<'PAGO' | 'ABONO' | 'REPROGRAMAR' | 'ESTADO_CUENTA' | null>(null)
  
  const [estadoCuentaVisita, setEstadoCuentaVisita] = useState<VisitaRuta | null>(null)
  const [pagoVisita, setPagoVisita] = useState<{visita: VisitaRuta, tipo: 'PAGO' | 'ABONO'} | null>(null)
  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)
  const [detalleVisita, setDetalleVisita] = useState<VisitaRuta | null>(null)

  const getEstadoClasses = useCallback((estado: EstadoVisita) => {
    switch (estado) {
      case 'pagado': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'en_mora': return 'bg-rose-50 text-rose-700 border-rose-100'
      case 'ausente': return 'bg-amber-50 text-amber-700 border-amber-100'
      case 'reprogramado': return 'bg-blue-50 text-blue-700 border-blue-100'
      default: return 'bg-slate-50 text-slate-700 border-slate-100'
    }
  }, [])

  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {
    switch (prioridad) {
      case 'alta': return '#ef4444'
      case 'media': return '#f59e0b'
      default: return '#10b981'
    }
  }, [])

  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => setDetalleVisita(visita), [setDetalleVisita])
  const handleAbrirPago = useCallback((visita: VisitaRuta) => setPagoVisita({ visita, tipo: 'PAGO' }), [setPagoVisita])
  const handleAbrirAbono = useCallback((visita: VisitaRuta) => setPagoVisita({ visita, tipo: 'ABONO' }), [setPagoVisita])
  const handleAbrirEstadoCuenta = useCallback((visita: VisitaRuta) => setEstadoCuentaVisita(visita), [setEstadoCuentaVisita])

  const handleGuardarGasto = (e: React.FormEvent) => {
    e.preventDefault()
    setIsGastoModalOpen(false)
    setNuevoGasto({ tipo: 'OPERATIVO', descripcion: '', valor: '' })
  }
  
  const handleActivarRuta = async () => {
    if (!initialRuta) return;
    try {
      await routesService.toggleActive(initialRuta.id);
      setRutaCompletada(!rutaCompletada);
      showNotification('success', `Ruta ${!rutaCompletada ? 'activada' : 'desactivada'} correctamente`, 'Éxito');
    } catch (error) {
      console.error('Error toggling route:', error);
      showNotification('error', 'No se pudo cambiar el estado de la ruta', 'Error');
    }
  }

  // Clases de riesgo para el badge superior
  const getRiesgoBadgeClasses = (riesgo: string) => {
    switch (riesgo) {
        case 'PELIGRO_MINIMO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'LEVE_RETRASO': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'PRECAUCION': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'RIESGO_MODERADO': return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'ALTO_RIESGO': return 'bg-rose-100 text-rose-800 border-rose-200';
        default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }

  const getRiesgoLabel = (riesgo: string) => {
      return riesgo.replace('_', ' ');
  }

  if (!initialRuta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
            <h2 className="text-xl font-bold text-slate-800">Ruta no encontrada</h2>
            <Link href="/rutas" className="text-primary hover:underline mt-2 block">Volver al listado</Link>
        </div>
      </div>
    )
  }

  const { estadisticas, nivelRiesgo } = initialRuta;
  const porcentajeProgreso = estadisticas.avanceDiario || 0;

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-slate-50"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-6">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <Link href="/rutas" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
                  <ArrowLeftIcon className="h-5 w-5 text-slate-600" />
               </Link>
               <div>
                 <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">
                        <span className="text-blue-600">Ruta </span>
                        <span className="text-orange-500">{(initialRuta.nombre || '').replace(/^Ruta\s+/i, '')}</span>
                    </h1>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiesgoBadgeClasses(nivelRiesgo)}`}>
                        {getRiesgoLabel(nivelRiesgo)}
                    </span>
                    
                 </div>
                 <p className="text-slate-500 font-medium text-sm">
                   {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} • {initialRuta.codigo} • {initialRuta.cobrador}
                 </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
               <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Recaudado Hoy</p>
                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(estadisticas.cobranzaDelDia)}</div>
                  <p className="text-xs text-slate-400 mt-1">Meta: {formatCurrency(estadisticas.metaDelDia)}</p>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${porcentajeProgreso}%` }} />
              </div>
            </div>
          </div>
        </header>

        {/* Action Bar & Filtros */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] shadow-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Botones de Acción y Navegación (Estilo Cobrador) */}
              <div className="mt-4 border-t border-slate-100 pt-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
                  <button 
                    onClick={() => setShowHistory(false)}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                      !showHistory 
                        ? 'bg-[#08557f] text-white border-[#08557f]' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="hidden md:inline">Ver Ruta Actual</span>
                  </button>

                  <button 
                    onClick={() => setShowHistory(true)}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                      showHistory 
                        ? 'bg-[#08557f] text-white border-[#08557f]' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <History className="h-4 w-4" />
                    <span className="hidden md:inline">Historial</span>
                  </button>

                  {!rutaCompletada && !showHistory && (
                    <button 
                      type="button"
                      onClick={handleActivarRuta}
                      className="px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm bg-white text-slate-700 border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="hidden md:inline">Activar Ruta</span>
                    </button>
                  )}

                  {(currentUser?.rol === 'SUPER_ADMINISTRADOR' || currentUser?.rol === 'ADMIN') && !showHistory && (
                    <button
                      onClick={() => setShowNewClientModal(true)}
                      className="px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm bg-white text-slate-700 border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <UserPlus className="h-4 w-4 text-slate-400" />
                      <span className="hidden md:inline">Crear Cliente</span>
                    </button>
                  )}
              </div>

              {/* Filtros de Periodo (Estilo Cobrador Exacto) */}
              {!showHistory && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período de ruta</div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(
                        [
                          { key: 'TODOS' as const, label: 'Todo' },
                          { key: 'DIA' as const, label: 'Día' },
                          { key: 'SEMANA' as const, label: 'Semanal' },
                          { key: 'QUINCENA' as const, label: 'Quincenal' },
                          { key: 'MES' as const, label: 'Mensual' },
                        ]
                      ).map((item) => (
                        <button
                          key={item.key}
                          onClick={() => setPeriodoRutaFiltro(item.key)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                            periodoRutaFiltro === item.key
                              ? 'bg-[#08557f] text-white border-[#08557f] shadow-lg shadow-[#08557f]/20'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
        </div>
        
         {/* Contenido Principal: Lista o Historial */}
         <div className="space-y-6">
            
            {showHistory ? (
              // ========================= VISTA HISTORIAL =========================
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                      <div className="flex items-center gap-3">
                          <History className="h-6 w-6 text-[#08557f]" />
                          <h3 className="font-bold text-slate-900 text-xl">
                              Historial de la Ruta
                          </h3>
                      </div>
                  </div>

                  {(!historialRutas || Object.keys(historialRutas).length === 0) ? (
                      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                         <History className="h-16 w-16 mb-4 opacity-20" />
                         <p className="font-black text-lg text-slate-500">Sin historial disponible</p>
                         <p className="text-sm font-medium opacity-70 mt-1">Las rutas completadas o cerradas aparecerán aquí.</p>
                      </div>
                  ) : (
                      // TODO: Implementar lista de historial real cuando haya datos
                      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                          <p className="font-bold text-slate-600">Historial cargado ({Object.keys(historialRutas).length} registros)</p>
                      </div>
                  )}
              </div>
            ) : (
              // ========================= VISTA VISITAS ACTUALES =========================
              <>
                  <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-slate-900 text-xl flex items-center gap-3">
                                Visitas de la Ruta
                                <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full shadow-sm">{totalMostradas}</span>
                            </h3>
                        </div>
                    </div>

                    {/* Leyenda de Riesgos Simplificada */}
                    <div className="flex flex-wrap gap-2 text-[10px] font-black text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm uppercase tracking-tighter">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-500/20">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> 
                            <span>Mínimo</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg border border-blue-500/20">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div> 
                            <span>Leve</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 rounded-lg border border-yellow-500/20">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div> 
                            <span>Precaución</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg border border-amber-500/20">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div> 
                            <span>Moderado</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 rounded-lg border border-rose-500/20">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div> 
                            <span>Crítico</span>
                        </div>
                    </div>
                  </div>

                  {/* LISTA DE VISITAS AGRUPADA POR FRECUENCIA */}
                  <div className="space-y-10">
                    {Object.entries({
                        MES: 'Mensual',
                        QUINCENA: 'Quincenal',
                        SEMANA: 'Semanal',
                        DIA: 'Diario'
                    }).map(([key, label]) => {
                        const visitas = visitasAgrupadas[key as keyof typeof visitasAgrupadas];
                        if (visitas.length === 0) return null;
                        
                        return (
                            <div key={key} className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-slate-200"></div>
                                    <span className="text-[11px] font-black text-[#08557f] uppercase tracking-[0.25em] bg-blue-50/50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm">
                                        {label}
                                    </span>
                                    <div className="h-px flex-1 bg-slate-200"></div>
                                </div>

                                <div className="space-y-4">
                                    {visitas.map((visita) => (
                                        <StaticVisitaItem
                                            key={visita.id}
                                            visita={visita}
                                            allowClick={false}
                                            onVerCliente={handleAbrirClienteInfo}
                                            getEstadoClasses={getEstadoClasses}
                                            getPrioridadColor={getPrioridadColor}
                                        >
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleAbrirPago(visita); }}
                                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                                >
                                                    <DollarSign className="h-4 w-4 mb-1" />
                                                    <span className="text-[9px] font-bold uppercase">Pago</span>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleAbrirAbono(visita); }}
                                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                                                >
                                                    <Wallet className="h-4 w-4 mb-1" />
                                                    <span className="text-[9px] font-bold uppercase">Abono</span>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleAbrirEstadoCuenta(visita); }}
                                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                                >
                                                    <FileTextIcon className="h-4 w-4 mb-1 text-slate-400" />
                                                    <span className="text-[9px] font-bold uppercase">Estado</span>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setVisitaReprogramar(visita); }}
                                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                                >
                                                    <Calendar className="h-4 w-4 mb-1 text-slate-400" />
                                                    <span className="text-[9px] font-bold uppercase">Repro.</span>
                                                </button>
                                            </div>
                                        </StaticVisitaItem>
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    {totalMostradas === 0 && (
                        <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400">
                            <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">No se encontraron visitas para mostrar en este modo</p>
                        </div>
                    )}
                  </div>
              </>
            )}
         </div>
      </div>

      {/* Modales (Gasto, Pago, etc...) */}
      {isGastoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <form onSubmit={handleGuardarGasto} className="p-6 space-y-4 bg-white rounded-lg">
              {/* Contenido simplificado gasto por brevedad de edicion */}
               <h3 className="font-bold">Registrar Gasto</h3>
               <button type="submit">Guardar</button>
           </form>
        </div>
      )}

      {/* Modal de Estado de Cuenta */}
      {estadoCuentaVisita && (
        <EstadoCuentaModal 
          visita={estadoCuentaVisita} 
          onClose={() => setEstadoCuentaVisita(null)} 
        />
      )}
      {/* Modal de Pago/Abono */}
      {pagoVisita && (
        <PagoModal
          visita={pagoVisita.visita}
          tipo={pagoVisita.tipo}
          onClose={() => setPagoVisita(null)}
          onConfirm={(monto, metodo, comprobante) => {
            alert(`Registrar ${pagoVisita.tipo}: $${monto} - ${metodo}`)
            setPagoVisita(null)
          }}
        />
      )}
      {visitaReprogramar && (
        <ReprogramarModal
            visita={visitaReprogramar}
            onClose={() => setVisitaReprogramar(null)}
            onConfirm={(fecha, motivo) => {
                alert(`Reprogramar para: ${fecha} - ${motivo}`)
                setVisitaReprogramar(null)
            }}
        />
      )}
      {showClienteSelector && (
        <SeleccionClienteModal
          visitas={visitasCobrador}
          onSelect={(visita) => {
            setShowClienteSelector(false)
            if (accionPendiente === 'PAGO') handleAbrirPago(visita)
            else if (accionPendiente === 'ABONO') handleAbrirAbono(visita)
            else if (accionPendiente === 'REPROGRAMAR') setVisitaReprogramar(visita)
            else handleAbrirEstadoCuenta(visita) 
            setAccionPendiente(null)
          }}
          onClose={() => setShowClienteSelector(false)}
        />
      )}
      
      {detalleVisita && (
        <ClienteDetalleModal
          visita={detalleVisita}
          onClose={() => setDetalleVisita(null)}
        />
      )}
      
      {showNewClientModal && (
        <NuevoClienteModal
          onClose={() => setShowNewClientModal(false)}
          onClienteCreado={async (nuevo) => {
            setShowNewClientModal(false)
            if (nuevo?.id) {
              const deseaCredito = typeof window !== 'undefined' ? window.confirm('¿Deseas crearle un crédito a este cliente ahora?') : false
              if (deseaCredito) {
                setDefaultClienteId(nuevo.id)
                setShowCrearCreditoModal(true)
              } else {
                showNotification('success', 'Cliente creado correctamente', 'Éxito')
              }
            } else {
              showNotification('warning', 'Cliente creado, pero no se obtuvo el ID', 'Aviso')
            }
          }}
        />
      )}
      
      {showCrearCreditoModal && (
        <CrearCreditoModal
          isOpen={showCrearCreditoModal}
          defaultClienteId={defaultClienteId || undefined}
          onClose={() => setShowCrearCreditoModal(false)}
          onConfirm={async (data) => {
            try {
              if (data.creditType === 'prestamo' && data.clienteCreditoId) {
                const mapFrecuencia = (f: string): FrecuenciaPago => {
                  const val = (f || '').toLowerCase().trim()
                  if (val.startsWith('diar')) return FrecuenciaPago.DIARIO
                  if (val.startsWith('seman')) return FrecuenciaPago.SEMANAL
                  if (val.startsWith('quin')) return FrecuenciaPago.QUINCENAL
                  if (val.startsWith('mens')) return FrecuenciaPago.MENSUAL
                  return FrecuenciaPago.MENSUAL
                }
                const pagosPorMes = (f: string) => {
                  switch (f) {
                    case 'Diaria': return 30
                    case 'Semanal': return 4
                    case 'Quincenal': return 2
                    default: return 1
                  }
                }
                const cuotas = Number(data.cuotasPrestamo || 0)
                const meses = Math.max(1, Math.ceil(cuotas / pagosPorMes(data.frecuenciaPago || 'Mensuales')))
                await prestamosService.crearPrestamo({
                  clienteId: data.clienteCreditoId,
                  tipoPrestamo: 'EFECTIVO',
                  monto: Number(data.montoPrestamo || 0),
                  tasaInteres: Number(data.tasaInteres || 0),
                  tasaInteresMora: 0,
                  plazoMeses: meses,
                  frecuenciaPago: mapFrecuencia(data.frecuenciaPago || 'Mensuales'),
                  fechaInicio: data.fechaInicio || new Date().toISOString().split('T')[0],
                  creadoPorId: currentUser?.id || ''
                })
                if (initialRuta?.id && initialRuta?.cobradorId) {
                  await routesService.assignClient(initialRuta.id, data.clienteCreditoId, initialRuta.cobradorId)
                }
                showNotification('success', 'Crédito creado y cliente asignado a la ruta', 'Éxito')
                setShowCrearCreditoModal(false)
              } else {
                showNotification('warning', 'Selecciona "Préstamo" y un cliente válido', 'Aviso')
              }
            } catch (e) {
              console.error('Error creando crédito/asignando ruta', e)
              showNotification('error', 'Ocurrió un error al crear el crédito', 'Error')
            }
          }}
        />
      )}
    </div>
  )
}

/**
 * Formatea una fecha UTC para evitar saltos de día por zona horaria
 */
function formatDateUTC(dateStr: string) {
  if (!dateStr) return '---'
  const date = new Date(dateStr)
  const day = date.getUTCDate()
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  const month = monthNames[date.getUTCMonth()]
  const year = date.getUTCFullYear()
  return `${day} de ${month} de ${year}`
}

function ClienteDetalleModal({ visita, onClose }: { visita: VisitaRuta; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [clienteCompleto, setClienteCompleto] = useState<any>(null)

  useEffect(() => {
    async function loadInfo() {
      try {
        setLoading(true)
        if (visita.clienteId) {
          const res = await clientesService.obtenerPorId(visita.clienteId)
          setClienteCompleto(res)
        }
      } catch (e) {
        console.error("Error al cargar detalle del cliente", e)
      } finally {
        setLoading(false)
      }
    }
    loadInfo()
  }, [visita.clienteId])

  const r = visita.nivelRiesgo;
  const riesgoColor = 
    r === 'bajo' ? 'text-emerald-600 bg-emerald-50' :
    r === 'leve' ? 'text-blue-600 bg-blue-50' :
    r === 'moderado' ? 'text-orange-600 bg-orange-50' :
    r === 'critico' ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50';

  const riesgoLabel = 
    r === 'bajo' ? 'Peligro Mínimo' :
    r === 'leve' ? 'Leve Retraso' :
    r === 'moderado' ? 'Riesgo Moderado' :
    r === 'critico' ? 'Alto Riesgo' : 'Riesgo Desconocido';

  // Contar préstamos activos (no pagados ni cancelados)
  const prestamosActivosCount = useMemo(() => {
    if (!clienteCompleto?.prestamos) return 0;
    return clienteCompleto.prestamos.filter((p: any) => 
      p.estado !== 'PAGADO' && p.estado !== 'CANCELADO' && p.estado !== 'RECHAZADO'
    ).length;
  }, [clienteCompleto]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Compacto */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-center">
          <div>
            <h3 className="font-black text-2xl text-slate-900 tracking-tight">Expediente</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Detalle Administrativo</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all group">
            <XCircle className="h-7 w-7 group-active:scale-90" />
          </button>
        </div>
        
        <div className="px-8 pb-8 space-y-6 overflow-y-auto custom-scrollbar">
           {loading ? (
             <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-[#08557f] animate-spin" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</p>
             </div>
           ) : (
             <>
               {/* Perfil Header */}
               <div className="text-center space-y-3">
                 <div className="w-20 h-20 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center text-slate-200 border border-slate-100">
                   <User className="w-10 h-10" />
                 </div>
                 <div>
                    <h4 className="text-xl font-black text-slate-900">{visita.cliente}</h4>
                    <div className="flex justify-center gap-2 mt-1">
                       <span className={`${riesgoColor} text-[9px] font-black px-3 py-1 rounded-full uppercase border border-current/10`}>
                         {riesgoLabel}
                       </span>
                    </div>
                 </div>
               </div>

               {/* Información DINÁMICA */}
               <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                     <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                        <Fingerprint className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase">Cédula / DNI</span>
                     </div>
                     <p className="text-sm font-black text-slate-900">{clienteCompleto?.dni || '---'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                     <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                        <Star className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase">Puntaje</span>
                     </div>
                     <p className="text-sm font-black text-emerald-600">{clienteCompleto?.puntaje || 0} pts</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                     <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                        <CalendarDays className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase">Miembro Desde</span>
                     </div>
                     <p className="text-sm font-black text-slate-900 uppercase">
                       {clienteCompleto?.creadoEn ? formatDateUTC(clienteCompleto.creadoEn) : '---'}
                     </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                     <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                        <History className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase">Préstamos</span>
                     </div>
                     <p className="text-sm font-black text-[#08557f]">{prestamosActivosCount} Activos</p>
                  </div>
               </div>

               {/* Contacto Alternativo */}
               <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100">
                  <h5 className="text-[10px] font-black text-[#08557f] uppercase tracking-widest mb-3">Referencias / Contacto</h5>
                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[#08557f] shadow-sm">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-blue-400 uppercase">WhatsApp / Tel</p>
                          <p className="text-sm font-black text-slate-900">{clienteCompleto?.telefono || visita.telefono}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[#08557f] shadow-sm">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-blue-400 uppercase">Referencia de Ubicación</p>
                          <p className="text-xs font-bold text-slate-700 leading-tight">
                            {clienteCompleto?.referencia || "Sin referencias adicionales registradas."}
                          </p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Botón Cerrar */}
               <div className="pt-2">
                  <button 
                    onClick={onClose} 
                    className="w-full py-5 bg-[#08557f] hover:bg-[#063a58] text-white font-black rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-[0.97] uppercase tracking-[0.15em] text-xs"
                  >
                     Cerrar Expediente
                  </button>
               </div>
             </>
           )}
        </div>
      </div>
    </div>
  )
}

export default RutaClient
