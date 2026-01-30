'use client'

import { useState } from 'react'
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
import { useParams } from 'next/navigation'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MOCK_CLIENTES } from '@/services/clientes-service'


import PagoModal from '@/components/cobranza/PagoModal'
import EstadoCuentaModal from '@/components/cobranza/EstadoCuentaModal'
import ReprogramarModal from '@/components/cobranza/ReprogramarModal'
import { VisitaRuta, EstadoVisita } from '@/lib/types/cobranza'
import { StaticVisitaItem } from '@/components/dashboards/shared/CobradorElements'

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

interface GastoRuta {
  id: string
  tipo: 'OPERATIVO' | 'TRANSPORTE' | 'OTRO'
  descripcion: string
  valor: number
  hora: string
}

const DetalleRutaPage = () => {
  const params = useParams()
  const router = useRouter()
  // Manejo seguro del ID de la ruta
  const rutaId = params?.id ? decodeURIComponent(params.id as string) : 'Desconocida'

  // Datos de prueba (Mock Data)
  const [clientes] = useState<ClienteRuta[]>([
   
  ])


  

  const progreso = {
    total: clientes.length,
    visitados: clientes.filter(c => c.estadoVisita !== 'PENDIENTE').length,
    recaudado: 150000
  }

  // const totalGastos = gastos.reduce((acc, g) => acc + g.valor, 0) // Unused?

  const porcentajeProgreso = (progreso.visitados / progreso.total) * 100

  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false)
  const [nuevoGasto, setNuevoGasto] = useState({ tipo: 'OPERATIVO', descripcion: '', valor: '' })
  const [searchQuery, setSearchQuery] = useState('')

  // const [showHistory, setShowHistory] = useState(false) // Unused
  const [rutaCompletada, setRutaCompletada] = useState(false)

  // const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<'TODOS' | 'DIA' | 'SEMANA' | 'MES'>('TODOS')
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
      periodoRuta: 'DIA'
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
      periodoRuta: 'DIA'
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
      periodoRuta: 'DIA'
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
      periodoRuta: 'DIA'
    }
  ])
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)
  /* infoClienteVisita eliminado ya que ahora redirigimos */
  const [estadoCuentaVisita, setEstadoCuentaVisita] = useState<VisitaRuta | null>(null)
  const [pagoVisita, setPagoVisita] = useState<{visita: VisitaRuta, tipo: 'PAGO' | 'ABONO'} | null>(null)
  const [visitaReprogramar, setVisitaReprogramar] = useState<VisitaRuta | null>(null)

  // ... Handlers auxiliares ...

  // ... (resto de handlers hasta EstadoCuentaModal) ...
  const getEstadoClasses = useCallback((estado: EstadoVisita) => {
    switch (estado) {
      case 'pagado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'en_mora':
        return 'bg-rose-50 text-rose-700 border-rose-100'
      case 'ausente':
        return 'bg-amber-50 text-amber-700 border-amber-100'
      case 'reprogramado':
        return 'bg-blue-50 text-blue-700 border-blue-100'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100'
    }
  }, [])

  const getPrioridadColor = useCallback((prioridad: 'alta' | 'media' | 'baja') => {
    switch (prioridad) {
      case 'alta':
        return '#ef4444'
      case 'media':
        return '#f59e0b'
      default:
        return '#10b981'
    }
  }, [])

  const handleAbrirClienteInfo = useCallback((visita: VisitaRuta) => {
    // Buscar el ID real del cliente en los mocks o usar uno por defecto
    const clienteReal = MOCK_CLIENTES.find(c => c.nombres + ' ' + c.apellidos === visita.cliente) || MOCK_CLIENTES[0]
    router.push(`/coordinador/clientes/${clienteReal?.id || '1'}`)
  }, [router])

  const handleAbrirPago = useCallback((visita: VisitaRuta) => {
    setPagoVisita({ visita, tipo: 'PAGO' })
  }, [setPagoVisita])

  const handleAbrirAbono = useCallback((visita: VisitaRuta) => {
    setPagoVisita({ visita, tipo: 'ABONO' })
  }, [setPagoVisita])

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
  
  // Función para activar ruta (simulada)
  const handleActivarRuta = () => {
    setRutaCompletada(!rutaCompletada)
    // Aquí iría la llamada a la API
    alert(rutaCompletada ? 'Ruta desactivada' : 'Ruta activada correctamente')
  }



  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* Background simplificado */}
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

         {/* Lista de visitas ESTÁTICA (sin DnD) */}
         <div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg">Visitas del Día</h3>
                </div>
              </div>

              <div className="space-y-6">
                 {/* Renderizado simple de lista sin contexto de drag and drop */}
                 <div className="space-y-3">
                      {visitasCobrador.map((visita) => (
                        <StaticVisitaItem
                          key={visita.id}
                          visita={visita}
                          isSelected={visitaSeleccionada === visita.id}
                          onSelect={(id: string) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                          onVerCliente={handleAbrirClienteInfo}
                          getEstadoClasses={getEstadoClasses}
                          getPrioridadColor={getPrioridadColor}
                        >
                            <div className="mt-3 space-y-3">
                              {visita.estado === 'pagado' ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirAbono(visita)}
                                    disabled={rutaCompletada}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                                  >
                                    <Wallet className="h-4 w-4" />
                                    Registrar Abono
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirEstadoCuenta(visita)}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200 border border-slate-200"
                                  >
                                    <FileTextIcon className="h-4 w-4" />
                                    Ver Estado de Cuenta
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirPago(visita)}
                                      disabled={rutaCompletada}
                                      className="flex items-center justify-center gap-2 rounded-xl bg-[#08557f] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#063a58] shadow-lg shadow-[#08557f]/20"
                                    >
                                      <DollarSign className="h-4 w-4" />
                                      Registrar Pago
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirAbono(visita)}
                                      disabled={rutaCompletada}
                                      className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-[11px] font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                                    >
                                      <Wallet className="h-4 w-4" />
                                      Registrar Abono
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirEstadoCuenta(visita)}
                                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200 border border-slate-200"
                                    >
                                      <FileTextIcon className="h-4 w-4" />
                                      Ver Estado de Cuenta
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setVisitaReprogramar(visita)}
                                      disabled={rutaCompletada}
                                      className="flex items-center justify-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-[11px] font-bold text-orange-700 hover:bg-orange-100 border border-orange-200"
                                    >
                                      <Calendar className="h-4 w-4" />
                                      Reprogramar
                                    </button>
                                  </div>
                                </>
                              )}

                              <div className="text-[11px] text-slate-600">
                                <div className="flex items-center justify-between mb-1">
                                  <span>Saldo total:</span>
                                  <span className="font-bold">${visita.saldoTotal.toLocaleString('es-CO')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Próxima visita:</span>
                                  <span className="font-medium">{visita.proximaVisita}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Teléfono:</span>
                                  <span className="font-medium">{visita.telefono}</span>
                                </div>
                              </div>
                            </div>
                        </StaticVisitaItem>
                      ))}
                 </div>
              </div>
         </div>
      </div>

        {/* Sección de Gastos */}
        

      

      {/* Modal de Registro de Gasto */}
      {isGastoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-900">
                <span className="text-blue-600">Registrar</span> <span className="text-orange-500">Gasto</span>
              </h3>
              <button 
                onClick={() => setIsGastoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            {/* Modal Body */}
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
                    min="0"
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

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGastoModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
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
    </div>
  )
}

// Removed local modal component definitions
export default DetalleRutaPage
