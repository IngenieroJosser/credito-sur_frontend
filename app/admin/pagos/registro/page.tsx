'use client'

import { useState } from 'react'
import {
  User,
  CreditCard,
  Wallet,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Tag,
  Smartphone
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

// Enums alineados con Prisma (asumiendo convención UPPERCASE)
type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'PAGO_MOVIL' | 'OTRO'

interface ResumenCuota {
  capital: number
  interes: number
  mora: number
  total: number
}

// Mock data interfaces
interface ClienteMock {
  id: string
  nombre: string
  enRuta: boolean
}

interface PrestamoMock {
  id: string
  codigo: string
  proximaCuota: string
  riesgo: 'BAJO' | 'MEDIO' | 'ALTO'
}

const RegistroPagoPage = () => {
  // Estado simulado que vendría de props o contexto/API
  const [cliente] = useState<ClienteMock>({
    id: 'c1',
    nombre: 'Carlos Rodríguez',
    enRuta: true
  })
  
  const [prestamo] = useState<PrestamoMock>({
    id: 'p1',
    codigo: 'PR-2024-00125',
    proximaCuota: '2024-03-15',
    riesgo: 'MEDIO'
  })

  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO')
  const [monto, setMonto] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [esAbonoParcial, setEsAbonoParcial] = useState(false)
  const [estadoEnvio, setEstadoEnvio] = useState<'idle' | 'enviando' | 'exito' | 'error'>('idle')
  const [mensajeEstado, setMensajeEstado] = useState('')

  const resumenCuota: ResumenCuota = {
    capital: 120000,
    interes: 30000,
    mora: 10000,
    total: 160000
  }

  // Utilidad para formateo de fecha
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!monto.trim() || !comentarios.trim()) {
      setEstadoEnvio('error')
      setMensajeEstado('Monto y comentario son obligatorios')
      return
    }

    setEstadoEnvio('enviando')
    setMensajeEstado('')

    // Simulación de envío a API / Store offline
    setTimeout(() => {
      setEstadoEnvio('exito')
      setMensajeEstado('Pago registrado en cola de sincronización')
      // Reset form opcional
      // setMonto('')
      // setComentarios('')
    }, 800)
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full space-y-8 p-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-blue-600">Registro</span> <span className="text-orange-500">Pagos</span>
              </h1>
            </div>
            <p className="text-sm font-medium text-slate-500 max-w-xl">
              Gestione la cobranza y registre pagos de manera eficiente.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Información Contextual */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tarjeta Cliente */}
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">Cliente</h3>
                    <p className="text-xs font-medium text-slate-500">Información del deudor</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{cliente.nombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      En ruta activa
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta Préstamo */}
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">Préstamo Activo</h3>
                    <p className="text-xs font-medium text-slate-500">{prestamo.codigo}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-sm font-medium text-slate-500">Próximo Vencimiento</span>
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(prestamo.proximaCuota)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-slate-500">Nivel de Riesgo</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                      prestamo.riesgo === 'MEDIO' && "bg-amber-50 text-amber-700 border-amber-100"
                    )}>
                      {prestamo.riesgo}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Formulario de Pago */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
              <div className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Selección de Método de Pago */}
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-slate-500" />
                      Método de Pago
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => setMetodoPago('EFECTIVO')}
                          className={cn(
                            "py-4 px-4 rounded-xl text-sm font-bold border-2 transition-all duration-200 flex items-center justify-center gap-3",
                            metodoPago === 'EFECTIVO'
                              ? "bg-secondary/10 border-secondary text-secondary shadow-sm"
                              : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-full transition-colors",
                            metodoPago === 'EFECTIVO' ? "bg-secondary/20 text-secondary" : "bg-slate-100 text-slate-400"
                          )}>
                            <Wallet className="w-5 h-5" />
                          </div>
                          <span className="font-bold">Efectivo</span>
                          <span className={cn(
                            "ml-auto text-xs px-2 py-1 rounded-full font-bold",
                            metodoPago === 'EFECTIVO' ? "bg-secondary/20 text-secondary" : "bg-slate-100 text-slate-400"
                          )}>Único disponible</span>
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5 px-1 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        <span>Por el momento solo se aceptan pagos en efectivo.</span>
                    </p>
                  </div>

                  {/* Input de Monto */}
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700">Monto a Pagar</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-medium text-lg">$</span>
                      </div>
                      <input
                        type="number"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-4 rounded-xl border-slate-200 bg-slate-50/50 text-2xl font-light text-primary focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-300 shadow-sm"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <span className="text-xs text-slate-400 font-bold bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">COP</span>
                      </div>
                    </div>
                    
                    {/* Accesos rápidos de monto */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {[resumenCuota.total, resumenCuota.total / 2, 50000, 100000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMonto(val.toString())}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all whitespace-nowrap shadow-sm"
                        >
                          {formatCurrency(val)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Desglose de Aplicación del Pago (Informativo) */}
                  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Aplicación sugerida del pago
                    </h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">Interés corriente</span>
                      <span className="font-bold text-slate-900">{formatCurrency(resumenCuota.interes)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">Mora acumulada</span>
                      <span className="font-bold text-slate-900">{formatCurrency(resumenCuota.mora)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                      <span className="text-slate-600 font-medium">Abono a capital</span>
                      <span className="font-bold text-slate-900">{formatCurrency(resumenCuota.capital)}</span>
                    </div>
                  </div>

                  {/* Comentarios */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Notas / Observaciones</label>
                    <textarea
                      value={comentarios}
                      onChange={(e) => setComentarios(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all text-sm resize-none font-medium text-slate-700 shadow-sm"
                      placeholder="Detalles adicionales sobre el pago..."
                    />
                  </div>

                  {/* Botón de Acción */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={estadoEnvio === 'enviando' || estadoEnvio === 'exito'}
                      className={cn(
                        "w-full py-4 px-6 rounded-xl text-white font-medium shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-center gap-2",
                        estadoEnvio === 'exito' 
            ? "bg-primary hover:bg-primary-dark" 
            : "bg-primary hover:bg-primary-dark shadow-primary/20"
                      )}
                    >
                      {estadoEnvio === 'enviando' ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Procesando...
                        </>
                      ) : estadoEnvio === 'exito' ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          ¡Pago Registrado!
                        </>
                      ) : (
                        <>
                          Registrar Pago
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                    
                    {estadoEnvio === 'error' && (
                      <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {mensajeEstado}
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegistroPagoPage
