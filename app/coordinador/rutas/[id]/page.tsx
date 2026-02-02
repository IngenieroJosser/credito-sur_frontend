'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Banknote,
  ArrowLeft,
  Save,
  Search,
  FileText as FileTextIcon
} from 'lucide-react'

import { formatCOPInputValue, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback } from 'react'
import { MOCK_CLIENTES } from '@/services/clientes-service'


import PagoModal from '@/components/cobranza/PagoModal'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'
import ReprogramarModal from '@/components/cobranza/ReprogramarModal'
import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'
import { StaticVisitaItem, SeleccionClienteModal } from '@/components/dashboards/shared/CobradorElements'

// Interfaces de datos
interface ClienteRuta {
  id: string
  nombre: string
  direccion: string
  telefono: string
  cuota: number
  saldoPendiente: number
  diasMora: number
  estadoVisita: 'PENDIENTE' | 'VISITADO_PAGO' | 'VISITADO_NO_PAGO'
  horaVisita?: string
}

const DetalleRutaPage = () => {
  const params = useParams()
  // Manejo seguro del ID de la ruta
  const rutaId = params?.id ? decodeURIComponent(params.id as string) : 'Desconocida'

  // Datos de prueba (Mock Data)
  const [clientes] = useState<ClienteRuta[]>([])

  const progreso = {
    total: clientes.length,
    visitados: clientes.filter(c => c.estadoVisita !== 'PENDIENTE').length,
    recaudado: 150000
  }

  const porcentajeProgreso = progreso.total > 0 ? (progreso.visitados / progreso.total) * 100 : 0

  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false)
  const [nuevoGasto, setNuevoGasto] = useState({ tipo: 'OPERATIVO', descripcion: '', valor: '' })
  const [searchQuery, setSearchQuery] = useState('')

  const [rutaCompletada, setRutaCompletada] = useState(false)

  // Datos de prueba iniciales para visitasCobrador
  const [visitasCobrador] = useState<VisitaRuta[]>([
    {
      id: 'v1',
      cliente: 'Juan Pérez',
      direccion: 'Calle 10 # 5-23, Centro',
      telefono: '310 123 4567',
      horaSugerida: '09:00 AM',
      montoCuota: 25000,
      saldoTotal: 450000,
      estado: 'pendiente',
      proximaVisita: '2023-10-25',
      ordenVisita: 1,
      prioridad: 'alta',
      cobradorId: 'cob1',
      periodoRuta: 'DIA',
      nivelRiesgo: 'leve'
    },
    {
      id: 'v2',
      cliente: 'Ana Gómez',
      direccion: 'Av. Principal # 20-10',
      telefono: '320 987 6543',
      horaSugerida: '10:30 AM',
      montoCuota: 15000,
      saldoTotal: 180000,
      estado: 'en_mora',
      proximaVisita: '2023-10-24',
      ordenVisita: 2,
      prioridad: 'media',
      cobradorId: 'cob1',
      periodoRuta: 'DIA',
      nivelRiesgo: 'critico'
    },
    {
      id: 'v3',
      cliente: 'Carlos Ruiz',
      direccion: 'Barrio La Paz, Mz C Casa 5',
      telefono: '300 456 7890',
      horaSugerida: '11:45 AM',
      montoCuota: 30000,
      saldoTotal: 800000,
      estado: 'pagado',
      proximaVisita: '2023-10-26',
      ordenVisita: 3,
      prioridad: 'baja',
      cobradorId: 'cob1',
      periodoRuta: 'DIA',
      nivelRiesgo: 'bajo'
    },
    {
      id: 'v4',
      cliente: 'Luisa Martínez',
      direccion: 'Urb. Los Pinos, Bloque 4',
      telefono: '315 555 5555',
      horaSugerida: '02:00 PM',
      montoCuota: 20000,
      saldoTotal: 350000,
      estado: 'ausente',
      proximaVisita: '2023-10-25',
      ordenVisita: 4,
      prioridad: 'media',
      cobradorId: 'cob1',
      periodoRuta: 'DIA',
      nivelRiesgo: 'moderado'
    }
  ])
  
  const [estadoCuentaVisita, setEstadoCuentaVisita] = useState<VisitaRuta | null>(null)
  const [pagoVisita, setPagoVisita] = useState<{visita: VisitaRuta, tipo: 'PAGO' | 'ABONO'} | null>(null)
  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)
  const [clienteDetalle, setClienteDetalle] = useState<import('@/services/clientes-service').Cliente | null>(null)
  const [showClienteSelector, setShowClienteSelector] = useState(false)

  const getEstadoClasses = useCallback((estado: EstadoVisita) => {
    switch (estado) {
      case 'pagado':
        return 'bg-blue-50 text-blue-700 border-blue-500 ring-1 ring-blue-500' 
      case 'pendiente':
        return 'bg-emerald-50 text-emerald-700 border-emerald-500 ring-1 ring-emerald-500' 
      case 'ausente':
        return 'bg-orange-50 text-orange-700 border-orange-500 ring-1 ring-orange-500' 
      case 'en_mora':
        return 'bg-red-50 text-red-700 border-red-500 ring-1 ring-red-500' 
      default:
        return 'bg-slate-50 text-slate-700 border-slate-300'
    }
  }, [])

  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {
    switch (prioridad) {
      case 'alta':
        return '#f97316' 
      case 'media':
        return '#08557f' 
      default:
        return '#94a3b8' 
    }
  }, [])


  const handleAbrirClienteInfo = (visita: VisitaRuta) => {
    const clienteReal = MOCK_CLIENTES.find(c => c.nombres + ' ' + c.apellidos === visita.cliente) || {
        ...MOCK_CLIENTES[0],
        nombres: visita.cliente.split(' ')[0],
        apellidos: visita.cliente.split(' ').slice(1).join(' '),
        direccion: visita.direccion,
        telefono: visita.telefono
    }
    setClienteDetalle(clienteReal)
  }

  const handleAbrirEstadoCuenta = useCallback((visita: VisitaRuta) => {
    setEstadoCuentaVisita(visita)
  }, [setEstadoCuentaVisita])

  const handleGuardarGasto = (e: React.FormEvent) => {
    e.preventDefault()
    const horaActual = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    console.log('Guardando gasto:', { ...nuevoGasto, hora: horaActual })
    setIsGastoModalOpen(false)
    setNuevoGasto({ tipo: 'OPERATIVO', descripcion: '', valor: '' })
  }
  
  const handleActivarRuta = () => {
    setRutaCompletada(!rutaCompletada)
    alert(rutaCompletada ? 'Ruta desactivada' : 'Ruta activada correctamente')
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-slate-50"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-6">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <Link href="/coordinador/rutas" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
               </Link>
               <div>
                 <h1 className="text-3xl font-bold tracking-tight">
                   <span className="text-blue-600">Ruta </span><span className="text-orange-500">Diaria</span>
                 </h1>
                 <p className="text-slate-500 font-medium text-sm">
                   {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} • ID: {rutaId}
                 </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
               <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Recaudado Hoy</p>
                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(progreso.recaudado)}</div>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${porcentajeProgreso}%` }} />
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente, dirección..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] shadow-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div className="flex gap-2">
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
        </div>

        <div className="flex gap-2">
            <button
              onClick={() => { setShowClienteSelector(true); }} 
              className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2 active:scale-95"
            >
              <FileTextIcon className="h-4 w-4 text-slate-400" />
              Ver Estado de Cuenta
            </button>
        </div>

         <div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg">Visitas del Día</h3>
                </div>
                
                 <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-lg border border-blue-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> 
                        <span>Peligro Mínimo</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> 
                        <span>Leve Retraso</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-orange-50 rounded-lg border border-orange-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> 
                        <span>Riesgo Moderado</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-red-50 rounded-lg border border-red-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> 
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
                          onSelect={() => {}}
                          onVerCliente={handleAbrirClienteInfo}
                          getEstadoClasses={getEstadoClasses}
                          getPrioridadColor={getPrioridadColor}
                        />
                      ))}
                 </div>
              </div>
         </div>
      </div>

      {isGastoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-900">
                <span className="text-blue-600">Registrar</span> <span className="text-orange-500">Gasto</span>
              </h3>
              <button onClick={() => setIsGastoModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleGuardarGasto} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tipo de Gasto</label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"
                  value={nuevoGasto.tipo}
                  onChange={e => setNuevoGasto({...nuevoGasto, tipo: e.target.value})}
                >
                  <option value="OPERATIVO">OPERATIVO</option>
                  <option value="TRANSPORTE">TRANSPORTE</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Descripción</label>
                <textarea 
                  required
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 resize-none"
                  placeholder="Detalles del gasto..."
                  value={nuevoGasto.descripcion}
                  onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    required
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                    placeholder="0"
                    value={nuevoGasto.valor}
                    onChange={e => setNuevoGasto({ ...nuevoGasto, valor: formatCOPInputValue(e.target.value) })}
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-3 border border-blue-100">
                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600 mt-0.5">
                  <Banknote className="h-4 w-4" />
                </div>
                <div className="text-xs text-blue-800">
                  <p className="font-bold mb-0.5">Nota Importante</p>
                  <p>Este gasto quedará en estado <strong>Pendiente de Aprobación</strong> hasta que el supervisor lo valide.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsGastoModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {estadoCuentaVisita && (
        <EstadoCuentaModal visita={estadoCuentaVisita} onClose={() => setEstadoCuentaVisita(null)} />
      )}
      
      {pagoVisita && (
        <PagoModal
          visita={pagoVisita.visita}
          tipo={pagoVisita.tipo}
          onClose={() => setPagoVisita(null)}
          onConfirm={(monto, metodo) => {
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
            handleAbrirEstadoCuenta(visita)
          }}
          onClose={() => setShowClienteSelector(false)}
        />
      )}
      
      {clienteDetalle && (
        <ClienteDetalleModal
          cliente={clienteDetalle}
          onClose={() => setClienteDetalle(null)}
        />
      )}
    </div>
  )
}

function ClienteDetalleModal({ cliente, onClose }: { cliente: import('@/services/clientes-service').Cliente; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-900">
            <span className="text-blue-600">Detalles del</span> <span className="text-orange-500">Cliente</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg">
            <XCircle className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 shadow-sm border border-blue-100">
              {cliente.nombres?.charAt(0)}{cliente.apellidos?.charAt(0)}
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">{cliente.nombres} {cliente.apellidos}</h4>
              <p className="text-sm text-slate-500 font-medium">ID: {cliente.id} • CC: {cliente.dni}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teléfono</label>
               <p className="text-sm font-bold text-slate-700">{cliente.telefono}</p>
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Código</label>
               <p className="text-sm font-bold text-slate-700">{cliente.codigo || 'No registrado'}</p>
             </div>
             <div className="space-y-1 col-span-2">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dirección</label>
               <p className="text-sm font-bold text-slate-700">{cliente.direccion || 'No registrada'}</p>
             </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
             <button onClick={onClose} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                Cerrar
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetalleRutaPage
