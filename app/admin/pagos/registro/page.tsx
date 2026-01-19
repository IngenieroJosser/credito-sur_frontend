'use client'

import { useState } from 'react'
import {
  User,
  CreditCard,
  Wallet,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Tag
} from 'lucide-react'

type MetodoPago = 'efectivo' | 'transferencia'

interface ResumenCuota {
  capital: number
  interes: number
  mora: number
  total: number
}

const RegistroPagoPage = () => {
  const [cliente] = useState('Carlos Rodríguez')
  const [prestamo] = useState('PR-2024-00125')
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [monto, setMonto] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [esAbonoParcial, setEsAbonoParcial] = useState(false)
  const [estadoEnvio, setEstadoEnvio] = useState<'idle' | 'enviando' | 'exito' | 'error'>('idle')
  const [mensajeEstado, setMensajeEstado] = useState('')

  const resumenCuota: ResumenCuota = {
    capital: 120,
    interes: 30,
    mora: 10,
    total: 160
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

    setTimeout(() => {
      setEstadoEnvio('exito')
      setMensajeEstado('Pago registrado en cola de sincronización')
    }, 800)
  }

  const montoNumero = parseFloat(monto) || 0
  const montoExcede = montoNumero > resumenCuota.total

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-primary/5 text-primary tracking-wide">
            <Wallet className="h-3 w-3" />
            <span>Registro de pago / cuota</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
            Captura de pagos en ruta
          </h1>
          <p className="text-sm text-gray-500 max-w-xl">
            Registra pagos con desglose claro de capital, intereses y mora, listo para sincronizarse cuando haya conexión.
          </p>
        </header>

        <main className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 md:p-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-[0.15em]">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>Cliente y crédito</span>
                  </div>
                  <div className="mt-3 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-gray-800">
                      <span className="font-medium">{cliente}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px]">
                        En ruta hoy
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="h-3 w-3 text-gray-400" />
                        <span>{prestamo}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>Próxima cuota: 15/03/2024</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Tag className="h-3 w-3 text-gray-400" />
                        <span className="text-amber-600">Riesgo medio</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="text-gray-600">Monto recibido</span>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-9 pr-3 py-2.5 text-sm text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                        placeholder="0,00"
                      />
                    </div>
                    {montoExcede && (
                      <p className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="h-3 w-3" />
                        Monto supera el total de la cuota.
                      </p>
                    )}
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="text-gray-600">Método de pago</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMetodoPago('efectivo')}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs transition-all ${
                          metodoPago === 'efectivo'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          <span>Efectivo</span>
                        </span>
                        {metodoPago === 'efectivo' && (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setMetodoPago('transferencia')}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs transition-all ${
                          metodoPago === 'transferencia'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>Transferencia</span>
                        </span>
                        {metodoPago === 'transferencia' && (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </label>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Comentario del cobrador</span>
                    <span className="text-[11px] text-gray-400">
                      Obligatorio para auditoría
                    </span>
                  </div>
                  <textarea
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#08557f] focus:ring-2 focus:ring-[#08557f]/10 transition-all resize-none"
                    placeholder="Ejemplo: Cliente pagó en efectivo, acordada regularización de saldo en la próxima visita."
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setEsAbonoParcial(!esAbonoParcial)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all ${
                      esAbonoParcial
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Marcar como abono parcial</span>
                  </button>

                  <button
                    type="submit"
                    disabled={estadoEnvio === 'enviando'}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-primary-dark transition-colors disabled:opacity-60"
                  >
                    <span>
                      {estadoEnvio === 'enviando'
                        ? 'Registrando pago...'
                        : 'Registrar pago'}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {estadoEnvio !== 'idle' && (
                  <div
                    className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
                      estadoEnvio === 'exito'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {estadoEnvio === 'exito' ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5" />
                    )}
                    <span>{mensajeEstado}</span>
                  </div>
                )}
              </form>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-800">
                  Desglose de la cuota
                </h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                  Referencial
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Capital</span>
                  <span className="font-medium text-gray-800">
                    ${resumenCuota.capital.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Interés</span>
                  <span className="font-medium text-gray-800">
                    ${resumenCuota.interes.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Mora</span>
                  <span className="font-medium text-amber-700">
                    ${resumenCuota.mora.toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-[0.2em]">
                    Total de la cuota
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    ${resumenCuota.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl text-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Seguridad en ruta
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    Pagos guardados en modo offline
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-white/70">
                Si la conexión falla, el pago queda protegido en la cola de sincronización y se envía automáticamente cuando el sistema vuelva a estar en línea.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}

export default RegistroPagoPage

