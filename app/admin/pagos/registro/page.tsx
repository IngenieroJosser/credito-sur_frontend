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

  const montoNumero = parseFloat(monto) || 0
  const montoExcede = montoNumero > resumenCuota.total

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8 space-y-8">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#08557f]/5 text-xs font-medium text-[#08557f] tracking-wide border border-[#08557f]/10">
            <Wallet className="h-3.5 w-3.5" />
            <span>Registro de pago / cuota</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-light text-gray-900 tracking-tight">
              Captura de pagos en ruta
            </h1>
            <p className="text-sm text-gray-500 max-w-xl font-light leading-relaxed">
              Registra pagos con desglose automático de capital, intereses y mora. 
              Los datos se sincronizarán al detectar conexión.
            </p>
          </div>
        </header>

        <main className="grid gap-8 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-[0.2em] font-semibold">
                    <User className="h-3.5 w-3.5 text-[#08557f]" />
                    <span>Cliente y crédito</span>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-3 text-sm text-gray-900">
                      <span className="font-semibold text-lg">{cliente.nombre}</span>
                      {cliente.enRuta && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 tracking-wide">
                          EN RUTA
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                        <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-mono font-medium">{prestamo.codigo}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>Vence: {formatDate(prestamo.proximaCuota)}</span>
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border font-medium",
                        prestamo.riesgo === 'ALTO' ? 'bg-red-50 border-red-100 text-red-700' :
                        prestamo.riesgo === 'MEDIO' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                        'bg-emerald-50 border-emerald-100 text-emerald-700'
                      )}>
                        <Tag className="h-3.5 w-3.5" />
                        <span>{prestamo.riesgo}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-3 text-sm group">
                    <span className="text-gray-700 font-medium flex items-center gap-2">
                      Monto recibido
                      <span className="text-gray-300 font-light text-xs">(COP)</span>
                    </span>
                    <div className="relative transition-all duration-300 group-focus-within:scale-[1.02]">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                        $
                      </div>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/30 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-[#08557f] focus:ring-4 focus:ring-[#08557f]/5 transition-all font-medium placeholder:text-gray-300"
                        placeholder="0"
                      />
                    </div>
                    {montoExcede && (
                      <p className="flex items-center gap-1.5 text-xs text-amber-600 font-medium animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Monto supera el total de la cuota.
                      </p>
                    )}
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="text-gray-700 font-medium">Método de pago</span>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMetodoPago('EFECTIVO')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs font-medium transition-all duration-200",
                            metodoPago === 'EFECTIVO'
                              ? "border-[#08557f] bg-[#08557f]/5 text-[#08557f] ring-1 ring-[#08557f]"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <Wallet className="h-4 w-4" />
                          <span>Efectivo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMetodoPago('TRANSFERENCIA')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs font-medium transition-all duration-200",
                            metodoPago === 'TRANSFERENCIA'
                              ? "border-[#08557f] bg-[#08557f]/5 text-[#08557f] ring-1 ring-[#08557f]"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <CreditCard className="h-4 w-4" />
                          <span>Transf.</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMetodoPago('PAGO_MOVIL')}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs font-medium transition-all duration-200",
                          metodoPago === 'PAGO_MOVIL'
                            ? "border-[#08557f] bg-[#08557f]/5 text-[#08557f] ring-1 ring-[#08557f]"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <Smartphone className="h-4 w-4" />
                        <span>Pago Móvil / Nequi</span>
                      </button>
                    </div>
                  </label>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Comentario del cobrador</span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold bg-gray-50 px-2 py-0.5 rounded">
                      Requerido
                    </span>
                  </div>
                  <textarea
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/30 px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#08557f] focus:ring-4 focus:ring-[#08557f]/5 transition-all resize-none placeholder:text-gray-400"
                    placeholder="Detalles del pago, acuerdos o razones de pago parcial..."
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => setEsAbonoParcial(!esAbonoParcial)}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-xs font-medium transition-all duration-200",
                      esAbonoParcial
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full transition-colors", esAbonoParcial ? "bg-amber-500" : "bg-gray-300")} />
                    <span>Es abono parcial</span>
                  </button>

                  <button
                    type="submit"
                    disabled={estadoEnvio === 'enviando'}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#08557f] px-8 py-3 text-sm font-medium text-white shadow-lg shadow-[#08557f]/20 hover:bg-[#064060] hover:shadow-[#08557f]/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                  >
                    <span>
                      {estadoEnvio === 'enviando'
                        ? 'Registrando...'
                        : 'Registrar Pago'}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {estadoEnvio !== 'idle' && (
                  <div
                    className={cn(
                      "mt-4 flex items-center gap-3 rounded-xl p-4 text-sm animate-in fade-in slide-in-from-bottom-2",
                      estadoEnvio === 'exito'
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : estadoEnvio === 'error' 
                        ? "bg-red-50 text-red-700 border border-red-100"
                        : "bg-blue-50 text-blue-700 border border-blue-100"
                    )}
                  >
                    {estadoEnvio === 'exito' ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0" />
                    )}
                    <span className="font-medium">{mensajeEstado}</span>
                  </div>
                )}
              </form>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  Desglose de la cuota
                </h2>
                <span className="rounded-full bg-gray-50 px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Referencial
                </span>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <span className="text-gray-500">Capital</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(resumenCuota.capital)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <span className="text-gray-500">Interés</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(resumenCuota.interes)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-100/50">
                  <span className="text-gray-600 font-medium">Mora</span>
                  <span className="font-bold text-amber-700">
                    {formatCurrency(resumenCuota.mora)}
                  </span>
                </div>
                <div className="my-2 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Total
                  </span>
                  <span className="text-2xl font-light text-gray-900">
                    {formatCurrency(resumenCuota.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#08557f] to-[#064060] rounded-2xl text-white p-6 relative overflow-hidden group shadow-lg shadow-[#08557f]/20">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
              
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                      Modo Offline
                    </p>
                  </div>
                  <p className="text-sm font-light leading-relaxed text-white/90">
                    Los pagos se guardan localmente y se sincronizan automáticamente al recuperar la conexión a internet.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}

export default RegistroPagoPage
