'use client'

/**
 * ============================================================================
 * REGISTRO CENTRAL DE COBRANZA (ADMIN)
 * ============================================================================
 *
 * @description
 * Formulario para el registro manual de pagos. Permite a los administrativos
 * recibir dinero en oficina y aplicarlo a los créditos activos.
 *
 * Recibe el prestamoId por querystring (?prestamoId=xxx) cuando se navega
 * desde el detalle de un préstamo. Si no viene parámetro, muestra un campo
 * de búsqueda manual.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  User,
  CreditCard,
  Wallet,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Search,
  Loader2,
} from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber, cn } from '@/lib/utils'
import { pagosService, CrearPagoDto } from '@/services/pagos-service'
import { prestamosService } from '@/services/prestamos-service'
import { MetodoPago } from '@/types/enums'
import { toast } from 'sonner'

interface ResumenCuota {
  capital: number
  interes: number
  mora: number
  total: number
}

interface PrestamoInfo {
  id: string
  numeroPrestamo: string
  clienteNombre: string
  clienteId: string
  saldoPendiente: number
  proximaCuota?: string
  nivelRiesgo?: string
  cobradorId?: string
}

const RegistroPagoPage = () => {
  const searchParams = useSearchParams()
  const prestamoIdParam = searchParams.get('prestamoId')

  // --- Estado del préstamo seleccionado ---
  const [prestamo, setPrestamo] = useState<PrestamoInfo | null>(null)
  const [loadingPrestamo, setLoadingPrestamo] = useState(false)
  const [busquedaId, setBusquedaId] = useState(prestamoIdParam || '')

  // --- Estado del formulario ---
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.EFECTIVO)
  const [monto, setMonto] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [esAbonoParcial, setEsAbonoParcial] = useState(false)
  const [estadoEnvio, setEstadoEnvio] = useState<'idle' | 'enviando' | 'exito' | 'error'>('idle')

  // Desglose estimado del pago (se actualiza cuando se carga el préstamo)
  const resumenCuota: ResumenCuota = {
    capital: prestamo ? Math.round(prestamo.saldoPendiente * 0.75) : 0,
    interes: prestamo ? Math.round(prestamo.saldoPendiente * 0.20) : 0,
    mora: prestamo ? Math.round(prestamo.saldoPendiente * 0.05) : 0,
    total: prestamo?.saldoPendiente || 0,
  }

  const cargarPrestamo = useCallback(async (id: string) => {
    if (!id.trim()) return
    setLoadingPrestamo(true)
    setPrestamo(null)
    try {
      const data = await prestamosService.obtenerPrestamoPorId(id.trim())
      setPrestamo({
        id: data.id,
        numeroPrestamo: data.numeroPrestamo,
        clienteNombre: data.cliente
          ? `${data.cliente.nombres || ''} ${data.cliente.apellidos || ''}`.trim()
          : 'Cliente',
        clienteId: data.cliente?.id || data.clienteId || '',
        saldoPendiente: Number(data.saldoPendiente ?? 0),
        proximaCuota: data.proximaCuotaFecha || undefined,
        nivelRiesgo: data.nivelRiesgo || undefined,
        cobradorId: data.cobradorId || undefined,
      })
      // Pre-rellenar el monto con el total del saldo
      setMonto(formatCOPInputValue(String(Math.round(Number(data.saldoPendiente ?? 0)))))
    } catch {
      toast.error('Préstamo no encontrado. Verifique el ID e intente de nuevo.')
    } finally {
      setLoadingPrestamo(false)
    }
  }, [])

  // Cargar automáticamente si viene por URL
  useEffect(() => {
    if (prestamoIdParam) {
      cargarPrestamo(prestamoIdParam)
    }
  }, [prestamoIdParam, cargarPrestamo])

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    cargarPrestamo(busquedaId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prestamo) {
      toast.error('Seleccione un préstamo antes de registrar el pago.')
      return
    }
    if (!monto.trim()) {
      toast.error('El monto es obligatorio.')
      return
    }

    setEstadoEnvio('enviando')

    // Obtener el usuario activo para el cobradorId
    let cobradorId = prestamo.cobradorId || ''
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        cobradorId = cobradorId || user.id || ''
      }
    } catch { /* no-op */ }

    const dto: CrearPagoDto = {
      prestamoId: prestamo.id,
      clienteId: prestamo.clienteId,
      cobradorId,
      montoTotal: parseCOPInputToNumber(monto),
      metodoPago: metodoPago,
      notas: comentarios || undefined,
    }

    try {
      await pagosService.registrarPago(dto)
      setEstadoEnvio('exito')
      toast.success('¡Pago registrado correctamente!')
    } catch {
      setEstadoEnvio('error')
      toast.error('Error al registrar el pago. Intente nuevamente.')
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full space-y-8 p-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-blue-600">Registro</span>{' '}
                <span className="text-orange-500">Pagos</span>
              </h1>
            </div>
            <p className="text-sm font-medium text-slate-500 max-w-xl">
              Gestione la cobranza y registre pagos de manera eficiente.
            </p>
          </div>
        </header>

        {/* Buscador de préstamo — solo si no llegó por URL o no ha cargado */}
        {!prestamo && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-xl animate-in fade-in">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              Buscar préstamo por ID
            </h2>
            <form onSubmit={handleBuscar} className="flex gap-3">
              <input
                type="text"
                value={busquedaId}
                onChange={e => setBusquedaId(e.target.value)}
                placeholder="ID del préstamo..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
              <button
                type="submit"
                disabled={loadingPrestamo || !busquedaId.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loadingPrestamo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-3 font-medium">
              También puede navegar desde el detalle de un préstamo para cargar los datos automáticamente.
            </p>
          </div>
        )}

        {/* Formulario principal — visible si hay préstamo cargado */}
        {prestamo && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
            {/* Columna Izquierda: Info contextual */}
            <div className="lg:col-span-1 space-y-6">
              {/* Tarjeta Cliente */}
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
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
                  <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{prestamo.clienteNombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Crédito activo
                    </p>
                  </div>
                </div>
              </div>

              {/* Tarjeta Préstamo */}
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-primary">Préstamo Activo</h3>
                      <p className="text-xs font-medium text-slate-500">{prestamo.numeroPrestamo}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm font-medium text-slate-500">Saldo pendiente</span>
                      <span className="text-sm font-bold text-emerald-700">
                        {formatCurrency(prestamo.saldoPendiente)}
                      </span>
                    </div>
                    {prestamo.proximaCuota && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm font-medium text-slate-500">Próximo vencimiento</span>
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(prestamo.proximaCuota)}
                        </span>
                      </div>
                    )}
                    {prestamo.nivelRiesgo && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-slate-500">Nivel de riesgo</span>
                        <span className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                          prestamo.nivelRiesgo === 'ALTO' && 'bg-rose-50 text-rose-700 border-rose-100',
                          prestamo.nivelRiesgo === 'MEDIO' && 'bg-amber-50 text-amber-700 border-amber-100',
                          prestamo.nivelRiesgo === 'BAJO' && 'bg-emerald-50 text-emerald-700 border-emerald-100',
                        )}>
                          {prestamo.nivelRiesgo}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Botón para cambiar de préstamo */}
                  <button
                    onClick={() => { setPrestamo(null); setBusquedaId(''); setMonto(''); setEstadoEnvio('idle') }}
                    className="mt-4 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors underline underline-offset-2"
                  >
                    Cambiar préstamo
                  </button>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Formulario */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
                <div className="p-6 md:p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Método de pago */}
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-slate-500" />
                        Método de Pago
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { value: MetodoPago.EFECTIVO, label: 'Efectivo' },
                          { value: MetodoPago.TRANSFERENCIA, label: 'Transferencia' },
                        ] as const).map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setMetodoPago(value)}
                            className={cn(
                              'py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all duration-200 flex items-center justify-center gap-2',
                              metodoPago === value
                                ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                                : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Monto */}
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-slate-700">Monto a Pagar</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-slate-400 font-medium text-lg">$</span>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={monto}
                          onChange={e => setMonto(formatCOPInputValue(e.target.value))}
                          placeholder="0"
                          className="w-full pl-10 pr-4 py-4 rounded-xl border-slate-200 bg-slate-50/50 text-2xl font-light text-primary focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-300 shadow-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                          <span className="text-xs text-slate-400 font-bold bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">COP</span>
                        </div>
                      </div>
                      {/* Accesos rápidos */}
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {[resumenCuota.total, Math.round(resumenCuota.total / 2), 50000, 100000].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setMonto(formatCOPInputValue(String(Math.round(val))))}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all whitespace-nowrap shadow-sm"
                          >
                            {formatCurrency(val)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Desglose estimado */}
                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Aplicación estimada del pago
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
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Distribución estimada. El sistema aplica según las reglas de negocio configuradas.
                      </p>
                    </div>

                    {/* Abono parcial */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={esAbonoParcial}
                        onChange={e => setEsAbonoParcial(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                        Registrar como abono parcial
                      </span>
                    </label>

                    {/* Observaciones */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Notas / Observaciones</label>
                      <textarea
                        value={comentarios}
                        onChange={e => setComentarios(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all text-sm resize-none font-medium text-slate-700 shadow-sm"
                        placeholder="Detalles adicionales sobre el pago..."
                      />
                    </div>

                    {/* Botón submit */}
                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={estadoEnvio === 'enviando' || estadoEnvio === 'exito'}
                        className="w-full py-4 px-6 rounded-xl text-white font-medium shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark shadow-primary/20 disabled:opacity-60"
                      >
                        {estadoEnvio === 'enviando' ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
                        ) : estadoEnvio === 'exito' ? (
                          <><CheckCircle2 className="w-5 h-5" /> ¡Pago Registrado!</>
                        ) : (
                          <>Registrar Pago <ChevronRight className="w-5 h-5" /></>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RegistroPagoPage
