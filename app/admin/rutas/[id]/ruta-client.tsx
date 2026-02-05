'use client'

import { useState, useCallback } from 'react'
import {
  CheckCircle2,
  XCircle,
  Banknote,
  ArrowLeft,
  Save,
  Search,
  Filter,
  Wallet,
  DollarSign,
  Calendar,
  FileText as FileTextIcon
} from 'lucide-react'

import { formatCOPInputValue, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RutaDetalleMock } from '@/lib/rutas-data'

import PagoModal from '@/components/cobranza/PagoModal'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'
import ReprogramarModal from '@/components/cobranza/ReprogramarModal'
import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'
import { StaticVisitaItem, SeleccionClienteModal } from '@/components/dashboards/shared/CobradorElements'

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
  const router = useRouter()
  
  // TODO: Cargar gastos reales del backend. Por ahora mock local para UI.
  const [gastos] = useState<GastoRuta[]>([
    {
      id: '1',
      tipo: 'TRANSPORTE',
      descripcion: 'Gasolina',
      valor: 15000,
      hora: '08:00 AM'
    }
  ])

  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false)
  const [nuevoGasto, setNuevoGasto] = useState({ tipo: 'OPERATIVO', descripcion: '', valor: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [rutaCompletada, setRutaCompletada] = useState(false)
  const [showClienteSelector, setShowClienteSelector] = useState(false)

  // MOCK de visitas (Debería venir de initialRuta.asignaciones o similar)
  // Por ahora mantenemos el mock para no romper la visualización de la lista
  const [visitasCobrador, setVisitasCobrador] = useState<VisitaRuta[]>([
    { id: 'v1', cliente: 'Juan Pérez', direccion: 'Calle 10 # 5-23', telefono: '310 123 4567', horaSugerida: '09:00 AM', montoCuota: 25000, saldoTotal: 450000, estado: 'pendiente', proximaVisita: '2023-10-25', ordenVisita: 1, prioridad: 'alta', cobradorId: 'cob1', periodoRuta: 'DIA', nivelRiesgo: 'leve' },
    { id: 'v2', cliente: 'Ana Gómez', direccion: 'Av. Principal # 20-10', telefono: '320 987 6543', horaSugerida: '10:30 AM', montoCuota: 15000, saldoTotal: 180000, estado: 'en_mora', proximaVisita: '2023-10-24', ordenVisita: 2, prioridad: 'media', cobradorId: 'cob1', periodoRuta: 'DIA', nivelRiesgo: 'critico' },
    // ... más mocks si necesario
  ])

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
  
  const handleActivarRuta = () => {
    setRutaCompletada(!rutaCompletada)
  }

  // Clases de riesgo para el badge superior
  const getRiesgoBadgeClasses = (riesgo: string) => {
    switch (riesgo) {
        case 'PELIGRO_MINIMO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'LEVE_RETRASO': return 'bg-blue-100 text-blue-800 border-blue-200';
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
            <Link href="/admin/rutas" className="text-primary hover:underline mt-2 block">Volver al listado</Link>
        </div>
      </div>
    )
  }

  const { id: rutaId, estadisticas, nivelRiesgo } = initialRuta;
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
               <Link href="/admin/rutas" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
               </Link>
               <div>
                 <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">
                        <span className="text-blue-600">Ruta </span><span className="text-orange-500">{initialRuta.nombre}</span>
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
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
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFilters((v) => !v)}
                    className="px-4 py-2 border rounded-xl flex items-center gap-2 font-medium bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filtros</span>
                  </button>
                 
                  <button 
                    type="button"
                    onClick={handleActivarRuta}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors ${
                      rutaCompletada
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden md:inline">{rutaCompletada ? 'Ruta Activa' : 'Activar Ruta'}</span>
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS - Standardized */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                <button
                   onClick={() => { setAccionPendiente('PAGO'); setShowClienteSelector(true); }}
                   className="px-4 py-3 rounded-xl text-sm font-bold shadow-sm bg-[#08557f] text-white hover:bg-[#063a58] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <DollarSign className="h-4 w-4" />
                  Registrar Pago
                </button>
                <button
                   onClick={() => { setAccionPendiente('ABONO'); setShowClienteSelector(true); }}
                   className="px-4 py-3 rounded-xl text-sm font-bold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <Wallet className="h-4 w-4" />
                  Registrar Abono
                </button>
                <button
                   onClick={() => { setAccionPendiente('ESTADO_CUENTA'); setShowClienteSelector(true); }} 
                   className="px-4 py-3 rounded-xl text-sm font-bold shadow-sm bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <FileTextIcon className="h-4 w-4 text-slate-400" />
                  Estado de Cuenta
                </button>
                <button
                   onClick={() => { setAccionPendiente('REPROGRAMAR'); setShowClienteSelector(true); }}
                   className="px-4 py-3 rounded-xl text-sm font-bold shadow-sm bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Reprogramar
                </button>
            </div>
        </div>
        
         {/* Lista de visitas ESTÁTICA */}
         <div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg">Visitas del Día</h3>
                </div>
                 {/* Leyenda de Riesgos Actualizada Semánticamente */}
                 <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> 
                        <span>Peligro Mínimo</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-lg border border-blue-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> 
                        <span>Leve Retraso</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 rounded-lg border border-amber-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> 
                        <span>Riesgo Moderado</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-rose-50 rounded-lg border border-rose-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> 
                        <span>Alto Riesgo</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-3">
                      {visitasCobrador.map((visita) => (
                        <StaticVisitaItem
                          key={visita.id}
                          visita={visita}
                          allowClick={false}
                          isSelected={visitaSeleccionada === visita.id}
                          onSelect={(id: string) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                          onVerCliente={handleAbrirClienteInfo}
                          getEstadoClasses={getEstadoClasses}
                          getPrioridadColor={getPrioridadColor}
                        />
                      ))}
                 </div>
              </div>
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
    </div>
  )
}

function ClienteDetalleModal({ visita, onClose }: { visita: VisitaRuta; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        
        <div className="px-6 pt-6 flex justify-between items-center bg-white">
          <h3 className="font-extrabold text-2xl text-slate-900">Cliente</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-full">
            <XCircle className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
           {/* Perfil Card */}
           <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] -mr-4 -mt-4 z-0"></div>
             <div className="w-16 h-16 bg-white rounded-2xl border-2 border-slate-100 flex items-center justify-center text-slate-300 z-10 shadow-sm">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
             </div>
             <div className="z-10">
               <h4 className="text-xl font-bold text-slate-900 leading-tight">{visita.cliente}</h4>
               <div className="flex items-center gap-2 mt-1">
                 <span className="bg-[#08557f] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">ACTIVO</span>
               </div>
             </div>
          </div>
          {/* Información de Contacto */}
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Información de Contacto</h5>
            <div className="space-y-3">
               <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dirección Exacta</p>
                 <p className="text-sm font-bold text-slate-900">{visita.direccion}</p>
               </div>
            </div>
          </div>
          {/* Resumen Financiero */}
          <div>
             <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Resumen Financiero</h5>
             <div className="p-4 rounded-2xl bg-[#fff7ed] border border-orange-100 flex flex-col justify-center mb-3">
                 <p className="text-[10px] font-bold text-orange-500 uppercase mb-1">Saldo Total</p>
                 <p className="text-xl font-black text-[#7c2d12]">${visita.saldoTotal.toLocaleString('es-CO')}</p>
             </div>
          </div>
           {/* Botón Cerrar */}
           <div className="pt-2">
              <button 
                onClick={onClose} 
                className="w-full py-4 bg-[#08557f] hover:bg-[#063a58] text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] uppercase tracking-wider text-sm"
              >
                 Cerrar Detalles
              </button>
           </div>
        </div>
      </div>
    </div>
  )
}

export default RutaClient
