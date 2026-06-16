'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  X,
  DollarSign,
  Plus,
  Calculator,
  Calendar,
  CheckCircle2,
  Package,
  Loader2
} from 'lucide-react'
import { formatCOPInputValue, formatCurrency, formatLoanTerm, parseCOPInputToNumber } from '@/lib/utils'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import { clientesService, Cliente } from '@/services/clientes-service'
import { articulosService, Articulo } from '@/services/articulos-service'
import { offlineStore } from '@/lib/offline/offlineDb'
import { TipoAmortizacion } from '@/types/enums'
import { getBogotaDateKey, toBogotaDateTimeLocalInputValue } from '@/lib/rutas-core'
import FieldLabel from '@/components/ui/FieldLabel'

interface CrearCreditoModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    creditType: 'prestamo' | 'articulo'
    clienteCreditoId: string
    monto: number
    tipoInteres?: TipoAmortizacion
    tipoAmortizacion?: TipoAmortizacion
    tasaInteres?: number
    cuotasTotales?: number
    cantidadCuotas?: number
    cuotas?: number
    frecuenciaPago?: string
    fechaInicio?: string
    fechaPrimerCobro?: string
    articuloId?: string
    precioProductoId?: string
    plazoMeses?: number
    numCuotas?: number
    cuotaInicialArticulo?: number
    notas?: string
    ventaContado?: boolean
  }) => void | Promise<void>
  defaultClienteId?: string
  defaultCreditType?: 'prestamo' | 'articulo'
  hideTypeSelector?: boolean
  defaultVentaContado?: boolean
  lockVentaContado?: boolean
  allowVentaContadoOption?: boolean
}

const dateTimeLocalToBogotaOffsetIso = (value: string) => {
  const clean = String(value || '').trim()
  if (!clean) return ''
  if (!clean.includes('T')) return `${clean}T00:00:00.000-05:00`
  const [datePart, timePartRaw = '00:00'] = clean.split('T')
  const timeParts = timePartRaw.split(':')
  const hh = timeParts[0]?.padStart(2, '0') || '00'
  const mm = timeParts[1]?.padStart(2, '0') || '00'
  const ss = timeParts[2]?.padStart(2, '0') || '00'
  return `${datePart}T${hh}:${mm}:${ss}.000-05:00`
}

const addDaysSkippingSunday = (date: Date, days: number) => {
  const target = new Date(date)
  target.setDate(target.getDate() + days)
  if (target.getDay() === 0) target.setDate(target.getDate() + 1)
  return target
}

const nextQuincenalDate = (base: Date) => {
  const baseKey = getBogotaDateKey(base)
  const [yearStr, monthStr] = baseKey.split('-')
  const baseYear = Number(yearStr)
  const baseMonth = Number(monthStr)

  for (let monthOffset = 0; monthOffset < 14; monthOffset++) {
    const monthCursor = new Date(baseYear, baseMonth - 1 + monthOffset, 1, 12, 0, 0, 0)
    const year = monthCursor.getFullYear()
    const monthIndex = monthCursor.getMonth()

    for (const day of [15, 30]) {
      const candidate = new Date(year, monthIndex, day, 12, 0, 0, 0)
      const isRealDay = candidate.getFullYear() === year
        && candidate.getMonth() === monthIndex
        && candidate.getDate() === day
      if (!isRealDay || candidate.getDay() === 0) continue

      const candidateKey = getBogotaDateKey(candidate)
      if (candidateKey >= baseKey) return candidate
    }
  }

  return addDaysSkippingSunday(base, 15)
}

const addOneMonthClamped = (base: Date) => {
  const baseKey = getBogotaDateKey(base)
  const [yearStr, monthStr, dayStr] = baseKey.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const targetMonthIndex = month
  const lastDayOfTargetMonth = new Date(year, targetMonthIndex + 1, 0, 12, 0, 0, 0).getDate()
  return new Date(year, targetMonthIndex, Math.min(day, lastDayOfTargetMonth), 12, 0, 0, 0)
}

const getDefaultFirstCollectionDate = (frecuencia: string, base: Date = new Date()) => {
  switch (frecuencia) {
    case 'DIARIO':
      return getBogotaDateKey(addDaysSkippingSunday(base, 1))
    case 'SEMANAL':
      return getBogotaDateKey(addDaysSkippingSunday(base, 7))
    case 'QUINCENAL':
      return getBogotaDateKey(nextQuincenalDate(base))
    case 'MENSUAL':
      return getBogotaDateKey(addDaysSkippingSunday(addOneMonthClamped(base), 0))
    default:
      return getBogotaDateKey(base)
  }
}

const calcularPrestamoPreview = (params: {
  monto: number
  cuotas: number
  tasa: number
  meses: number
  tipoInteres: TipoAmortizacion
}) => {
  const monto = Number(params.monto || 0)
  const cuotas = Number(params.cuotas || 0)
  const tasa = Number(params.tasa || 0)

  if (!(monto > 0) || !(cuotas > 0)) {
    return null
  }

  if (params.tipoInteres === TipoAmortizacion.INTERES_PLANO || params.tipoInteres === TipoAmortizacion.FRANCESA) {
    // Interés plano (nuevo) / Amortización
    const intereses = Math.round(monto * (tasa / 100))
    const total = monto + intereses
    const valorCuota = Math.floor(total / cuotas)
    // La última cuota absorbe el residuo
    const residuo = total - valorCuota * cuotas

    return {
      meses: params.meses,
      monto,
      intereses,
      total,
      valorCuota, // cuotas 1..n-1
      valorUltimaCuota: valorCuota + residuo, // última cuota
      numCuotas: cuotas,
      sistema: 'Amortización',
    }
  }

  // INTERES_SIMPLE
  const mesesInteres = Math.max(1, params.meses)
  const intereses = (monto * tasa * mesesInteres) / 100
  const total = monto + intereses
  const valorCuota = cuotas > 0 ? total / cuotas : 0

  return {
    meses: params.meses,
    monto,
    intereses,
    total,
    valorCuota,
    numCuotas: cuotas,
    sistema: 'Interés Simple',
  }
}

export default function CrearCreditoModal({
  isOpen,
  onClose,
  onConfirm,
  defaultClienteId,
  defaultCreditType,
  hideTypeSelector,
  defaultVentaContado = false,
  lockVentaContado = false,
  allowVentaContadoOption = true,
}: CrearCreditoModalProps) {
  const [creditType, setCreditType] = useState<'prestamo' | 'articulo'>(defaultCreditType || 'prestamo')
  const [clienteCreditoId, setClienteCreditoId] = useState('')
  const [montoPrestamoInput, setMontoPrestamoInput] = useState('')
  const [tipoInteres, setTipoInteres] = useState<TipoAmortizacion>(TipoAmortizacion.INTERES_PLANO)
  const [tasaInteresInput, setTasaInteresInput] = useState('10')
  const [cuotasPrestamoInput, setCuotasPrestamoInput] = useState('12')
  const [cuotaInicialArticuloInput, setCuotaInicialArticuloInput] = useState('')
  const [fechaCreditoInput, setFechaCreditoInput] = useState(() => {
    return toBogotaDateTimeLocalInputValue(new Date()) // YYYY-MM-DDTHH:mm
  })
  const [frecuenciaPago, setFrecuenciaPago] = useState('DIARIO')
  const [fechaPrimerCobro, setFechaPrimerCobro] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notasInput, setNotasInput] = useState('')
  const mouseDownTargetRef = useRef<EventTarget | null>(null)

  const [articuloSeleccionadoId, setArticuloSeleccionadoId] = useState<string>('')
  const [planArticuloIndex, setPlanArticuloIndex] = useState<number | null>(null)
  const [esContado, setEsContado] = useState(false)

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [articulos, setArticulos] = useState<Articulo[]>([])

  const puedeMostrarModoVenta = creditType === 'articulo' && allowVentaContadoOption && !lockVentaContado

  useEffect(() => {
    if (isOpen) {
      const nextCreditType = defaultCreditType || 'prestamo'
      const nextEsContado = nextCreditType === 'articulo' && (defaultVentaContado || lockVentaContado)
      setCreditType(nextCreditType)
      setClienteCreditoId(defaultClienteId || '')
      setMontoPrestamoInput('')
      setTipoInteres(TipoAmortizacion.INTERES_PLANO)
      setTasaInteresInput('10')
      setCuotasPrestamoInput('12')
      setCuotaInicialArticuloInput('')
      setArticuloSeleccionadoId('')
      setPlanArticuloIndex(null)
      setFrecuenciaPago('DIARIO')
      setEsContado(nextEsContado)
      setNotasInput('')
      setFechaCreditoInput(toBogotaDateTimeLocalInputValue(new Date()))
      setFechaPrimerCobro(getDefaultFirstCollectionDate('DIARIO'))
      Promise.all([
        // forCredit: true → el cobrador ve todos los clientes no bloqueados,
        // igual que el supervisor, sin restricción de ruta asignada.
        clientesService.obtenerTodos({ forCredit: true }),
        articulosService.obtenerArticulos()
      ]).then(([c, a]) => {
        setClientes(c)
        setArticulos(a)
        offlineStore.saveMany('clientes', c).catch(() => {})
      }).catch(async () => {
        // Fallback offline
        try {
          const offClientes = await offlineStore.getAll<Cliente>('clientes')
          setClientes(offClientes)
        } catch { /* ignore */ }
      })
    }
  }, [isOpen, defaultClienteId, defaultCreditType, defaultVentaContado, lockVentaContado])

  const articuloSeleccionado = articulos.find(a => a.id === articuloSeleccionadoId)

  const planSeleccionado = useMemo(() => {
    if (!articuloSeleccionado) return null
    if (esContado) return null
    if (planArticuloIndex === null) return null
    return articuloSeleccionado.opcionesCuotas[planArticuloIndex] || null
  }, [articuloSeleccionado, planArticuloIndex, esContado])

  const mesesPlan = useMemo(() => {
    if (esContado) return 0
    if (!planSeleccionado) return 0
    const n = Number(planSeleccionado.numeroCuotas)
    return isNaN(n) ? 0 : n
  }, [planSeleccionado, esContado])

  const calculoCreditoArticulo = useMemo(() => {
    if (!articuloSeleccionado) return null
    const inicial = parseCOPInputToNumber(cuotaInicialArticuloInput)
    if (esContado) {
      const precioTotal = Number(articuloSeleccionado.precioContado || articuloSeleccionado.precioBase || 0)
      const aFinanciar = precioTotal
      const numCuotas = 1
      const valorCuota = precioTotal
      return { meses: 0, precioTotal, aFinanciar, numCuotas, valorCuota }
    }
    if (!planSeleccionado || !mesesPlan) return null
    const precioTotal = planSeleccionado.precioTotal
    const aFinanciar = Math.max(0, precioTotal - inicial)
    let numCuotas = 0
    if (frecuenciaPago === 'DIARIO') numCuotas = Math.ceil(mesesPlan * 30)
    else if (frecuenciaPago === 'SEMANAL') numCuotas = Math.ceil(mesesPlan * 4)
    else if (frecuenciaPago === 'QUINCENAL') numCuotas = Math.ceil(mesesPlan * 2)
    else if (frecuenciaPago === 'MENSUAL') numCuotas = Math.ceil(mesesPlan * 1)
    const valorCuota = numCuotas > 0 ? Math.ceil(aFinanciar / numCuotas) : 0
    return { meses: mesesPlan, precioTotal, aFinanciar, numCuotas, valorCuota }
  }, [planSeleccionado, mesesPlan, frecuenciaPago, cuotaInicialArticuloInput, articuloSeleccionado, esContado])

  const calculoPrestamo = useMemo(() => {
    if (creditType !== 'prestamo') return null
    const monto = parseCOPInputToNumber(montoPrestamoInput)
    const cuotas = Number(cuotasPrestamoInput)
    if (!monto || !cuotas) return null

    let meses = 0
    if (frecuenciaPago === 'DIARIO') meses = cuotas / 30
    else if (frecuenciaPago === 'SEMANAL') meses = cuotas / 4
    else if (frecuenciaPago === 'QUINCENAL') meses = cuotas / 2
    else if (frecuenciaPago === 'MENSUAL') meses = cuotas

    const tasa = Number(tasaInteresInput) || 0
    return calcularPrestamoPreview({
      monto,
      cuotas,
      tasa,
      meses,
      tipoInteres,
    })
  }, [creditType, montoPrestamoInput, cuotasPrestamoInput, frecuenciaPago, tasaInteresInput, tipoInteres])

  if (!isOpen) return null

  const handleReset = () => {
    setClienteCreditoId('')
    const nextCreditType = defaultCreditType || 'prestamo'
    setCreditType(nextCreditType)
    setMontoPrestamoInput('')
    setTipoInteres(TipoAmortizacion.INTERES_PLANO)
    setTasaInteresInput('10')
    setCuotasPrestamoInput('12')
    setCuotaInicialArticuloInput('')
    setArticuloSeleccionadoId('')
    setPlanArticuloIndex(null)
    setFrecuenciaPago('DIARIO')
    setEsContado(nextCreditType === 'articulo' && (defaultVentaContado || lockVentaContado))
    setNotasInput('')
    setFechaCreditoInput(toBogotaDateTimeLocalInputValue(new Date()))
    onClose()
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onMouseDown={(e) => { mouseDownTargetRef.current = e.target }}
        onMouseUp={(e) => {
          if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
            handleReset()
          }
          mouseDownTargetRef.current = null
        }}
      >
        <div
          className="w-full bg-white shadow-2xl animate-in zoom-in-95 duration-200 h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-3xl sm:max-w-2xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {creditType === 'articulo' && esContado ? 'Registrar Venta' : 'Crear Nuevo Crédito'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                title="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!hideTypeSelector ? (
              <div className="mb-6">
                <FieldLabel required className="mb-3">Tipo de Crédito</FieldLabel>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreditType('prestamo')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      creditType === 'prestamo'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <DollarSign className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-bold text-sm">Préstamo en Efectivo</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditType('articulo')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      creditType === 'articulo'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Package className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-bold text-sm">Crédito por Artículo</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6 flex justify-center">
                <div className={`p-4 rounded-xl border-2 text-center w-56 ${
                  esContado
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-orange-500 bg-orange-50 text-orange-700'
                }`}>
                  <Package className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-bold text-sm">{esContado ? 'Venta de Contado' : 'Crédito por Artículo'}</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <FieldLabel required>Cliente</FieldLabel>
                <select
                  value={clienteCreditoId}
                  onChange={(e) => setClienteCreditoId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombres} {c.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              {creditType === 'prestamo' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Monto del Préstamo</FieldLabel>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={montoPrestamoInput}
                          onChange={(e) => setMontoPrestamoInput(formatCOPInputValue(e.target.value))}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel required>Tipo de Interés</FieldLabel>
                      <select
                        value={tipoInteres}
                        onChange={(e) => setTipoInteres(e.target.value as TipoAmortizacion)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                      >
                        <option value={TipoAmortizacion.INTERES_SIMPLE}>Interés Simple</option>
                        <option value={TipoAmortizacion.INTERES_PLANO}>Amortización</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Tasa de Interés (%)</FieldLabel>
                      <input
                          type="text"
                          inputMode="decimal"
                          value={tasaInteresInput}
                          onChange={(e) => setTasaInteresInput(e.target.value.replace(/[^0-9.]/g, ''))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                          placeholder="10.0"
                      />
                    </div>
                    <div>
                      <FieldLabel required>Cuotas</FieldLabel>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cuotasPrestamoInput}
                        onChange={(e) => setCuotasPrestamoInput(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                        placeholder="12"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Frecuencia de Pago</FieldLabel>
                      <select
                         value={frecuenciaPago}
                         onChange={(e) => {
                           const val = e.target.value
                           setFrecuenciaPago(val)
                           setFechaPrimerCobro(getDefaultFirstCollectionDate(val))
                         }}
                         className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                      >
                        <option value="DIARIO">Diario</option>
                        <option value="SEMANAL">Semanal</option>
                        <option value="QUINCENAL">Quincenal</option>
                        <option value="MENSUAL">Mensual</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel required>Fecha Crédito</FieldLabel>
                      <input
                         type="datetime-local"
                         value={fechaCreditoInput}
                         readOnly
                         className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {calculoPrestamo && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-center pb-3 border-b border-blue-200/50">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-500 rounded-lg text-white">
                            <Calculator className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Resumen Financiero</span>
                        </div>
                        <span className="font-black text-blue-900 text-xl">{formatCurrency(calculoPrestamo.total)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/50 p-3 rounded-xl border border-blue-100">
                          <div className="text-[10px] text-blue-800 font-bold uppercase mb-1 flex items-center gap-1.5">
                            <Calculator className="w-3 h-3" />
                            Sistema
                          </div>
                          <div className="font-black text-blue-900 text-sm leading-tight">
                            {calculoPrestamo.sistema}
                          </div>
                        </div>
                        <div className="bg-white/50 p-3 rounded-xl border border-blue-100">
                          <div className="text-[10px] text-blue-800 font-bold uppercase mb-1 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            Plazo Real
                          </div>
                          <div className="font-black text-blue-900 text-lg">
                            {calculoPrestamo.numCuotas} <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Pagos {frecuenciaPago.toLowerCase()}s</span>
                          </div>
                        </div>
                        <div className="bg-white/50 p-3 rounded-xl border border-blue-100">
                          <div className="text-[10px] text-blue-800 font-bold uppercase mb-1 flex items-center gap-1.5">
                            <DollarSign className="w-3 h-3" />
                            Interés Total
                          </div>
                          <div className="font-black text-blue-900 text-lg">
                            {formatCurrency(calculoPrestamo.intereses)}
                          </div>
                        </div>
                        <div className="bg-white/50 p-3 rounded-xl border border-blue-100">
                          <div className="text-[10px] text-blue-800 font-bold uppercase mb-1 flex items-center gap-1.5">
                            <DollarSign className="w-3 h-3" />
                            Valor Cuota
                          </div>
                          <div className="font-black text-blue-900 text-lg">
                            {formatCurrency(calculoPrestamo.valorCuota)}
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-blue-600 font-medium italic text-center">
                        Duración: {formatLoanTerm({
                          plazoMeses: calculoPrestamo.meses,
                          cantidadCuotas: calculoPrestamo.numCuotas,
                          frecuenciaPago,
                        })} de crédito.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3 items-start">
                    <Calculator className="w-5 h-5 text-blue-600 mt-0.5" />
                    <p className="text-xs font-medium text-blue-900 leading-relaxed">
                      <strong>{lockVentaContado ? 'Venta de contado:' : 'Venta de Artículos:'}</strong>{' '}
                      {lockVentaContado
                        ? 'Selecciona el cliente y el artículo. No se generan cuotas ni plan de pagos.'
                        : allowVentaContadoOption
                          ? <>Elige crédito por meses o marca <strong>Compra de Contado</strong>. En contado no se generan cuotas ni plan de pagos.</>
                          : 'Selecciona el artículo, plazo, frecuencia y fecha de primer cobro.'}
                    </p>
                  </div>

                  {puedeMostrarModoVenta && (
                  <div className="mt-3">
                    <FieldLabel required>Modo de Venta</FieldLabel>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setEsContado(false) }}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                          !esContado ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        Crédito
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEsContado(true); setPlanArticuloIndex(null); setFrecuenciaPago('MENSUAL') }}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                          esContado ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        Contado
                      </button>
                    </div>
                  </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Artículo</FieldLabel>
                      <select
                        value={articuloSeleccionadoId}
                        onChange={(e) => {
                          setArticuloSeleccionadoId(e.target.value)
                          setPlanArticuloIndex(null)
                          setEsContado(Boolean(defaultVentaContado || lockVentaContado))
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                      >
                        <option value="">Seleccionar artículo...</option>
                        {articulos.map((articulo) => (
                          <option key={articulo.id} value={articulo.id}>
                            {articulo.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      {!esContado && (
                        <>
                          <FieldLabel required className="mt-3">Plazo (Meses)</FieldLabel>
                          <select
                            value={planArticuloIndex !== null ? planArticuloIndex : ''}
                            onChange={(e) => {
                              const idx = e.target.value ? parseInt(e.target.value) : null
                              setPlanArticuloIndex(idx)
                            }}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                            disabled={!articuloSeleccionadoId}
                          >
                            <option value="">Seleccionar plazo...</option>
                            {articuloSeleccionado?.opcionesCuotas.map((op, idx) => {
                              const meses = Number(op.numeroCuotas)
                              if (isNaN(meses)) return null
                              return (
                                <option key={idx} value={idx}>
                                  {meses} {meses === 1 ? 'Mes' : 'Meses'} - Total: {formatCurrency(op.precioTotal)}
                                </option>
                              )
                            })}
                          </select>
                        </>
                      )}
                    </div>
                  </div>

                  {!esContado && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <FieldLabel required>Frecuencia de Pago</FieldLabel>
                        <select
                           value={frecuenciaPago}
                           onChange={(e) => {
                             const val = e.target.value
                             setFrecuenciaPago(val)
                             setFechaPrimerCobro(getDefaultFirstCollectionDate(val))
                           }}
                           className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                        >
                          <option value="DIARIO">Diaria</option>
                          <option value="SEMANAL">Semanal</option>
                          <option value="QUINCENAL">Quincenal</option>
                          <option value="MENSUAL">Mensual</option>
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Cuota Inicial</FieldLabel>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={cuotaInicialArticuloInput}
                            onChange={(e) => setCuotaInicialArticuloInput(formatCOPInputValue(e.target.value))}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <FieldLabel required>Fecha Crédito</FieldLabel>
                    <input
                      type="datetime-local"
                      value={fechaCreditoInput}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {calculoCreditoArticulo && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-center pb-3 border-b border-emerald-200/50">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-500 rounded-lg text-white">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">{esContado ? 'Precio Contado' : 'A Financiar'}</span>
                        </div>
                        <span className="font-black text-emerald-900 text-xl">{formatCurrency(esContado ? calculoCreditoArticulo.precioTotal : calculoCreditoArticulo.aFinanciar)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/50 p-3 rounded-xl border border-emerald-100">
                          <div className="text-[10px] text-emerald-800 font-bold uppercase mb-1 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            Cuotas
                          </div>
                          <div className="font-black text-emerald-900 text-lg">
                            {calculoCreditoArticulo.numCuotas} <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">{esContado ? '' : `x ${frecuenciaPago}`}</span>
                          </div>
                        </div>
                        <div className="bg-white/50 p-3 rounded-xl border border-emerald-100">
                          <div className="text-[10px] text-emerald-800 font-bold uppercase mb-1 flex items-center gap-1.5">
                            <DollarSign className="w-3 h-3" />
                            Valor Cuota
                          </div>
                          <div className="font-black text-emerald-900 text-lg">
                            {formatCurrency(esContado ? calculoCreditoArticulo.precioTotal : calculoCreditoArticulo.valorCuota)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!(creditType === 'articulo' && esContado) && (
                <div>
                  <FieldLabel required>Fecha Primer Cobro</FieldLabel>
                  {(() => {
                    const diaSeleccionado = fechaPrimerCobro
                      ? new Date(fechaPrimerCobro + 'T12:00:00').getDate()
                      : 0
                    const todayKey = getBogotaDateKey(new Date())
                    const esFechaPasada = !!fechaPrimerCobro && fechaPrimerCobro < todayKey
                    const esQuincenaInvalida = frecuenciaPago === 'QUINCENAL' && !!fechaPrimerCobro && diaSeleccionado !== 15 && diaSeleccionado !== 30
                    const esDomingoInvalido = !!fechaPrimerCobro
                      ? new Date(fechaPrimerCobro + 'T12:00:00').getDay() === 0
                      : false
                    const inputInvalido = esQuincenaInvalida || esDomingoInvalido || esFechaPasada
                    return (
                      <div className="space-y-1">
                        <input
                          type="date"
                          value={fechaPrimerCobro}
                          min={todayKey}
                          onChange={(e) => setFechaPrimerCobro(e.target.value)}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-0 font-medium text-slate-900 transition-colors ${
                            inputInvalido
                              ? 'border-red-400 bg-red-50 focus:border-red-500'
                              : 'bg-slate-50 border-slate-200 focus:border-[#08557f]'
                          }`}
                        />
                        {esFechaPasada && (
                          <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                            <span>⚠</span> La fecha del primer cobro no puede ser un día pasado.
                          </p>
                        )}
                        {esQuincenaInvalida && (
                          <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                            <span>⚠</span> Los créditos quincenales solo cobran el día <strong>15</strong> o el día <strong>30</strong>.
                          </p>
                        )}
                        {esDomingoInvalido && (
                          <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                            <span>⚠</span> No se realizan cobros los domingos. Elige otro día.
                          </p>
                        )}
                        {fechaPrimerCobro && !inputInvalido && frecuenciaPago === 'QUINCENAL' && (
                          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <span>✓</span> Fecha válida — día {diaSeleccionado}
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              <div>
                <FieldLabel>Notas (Opcional)</FieldLabel>
                <textarea
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 resize-none"
                  rows={3}
                  placeholder="Observaciones adicionales..."
                  value={notasInput}
                  onChange={(e) => setNotasInput(e.target.value)}
                ></textarea>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Resumen</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Tipo:</span>
                    <span className="font-bold text-slate-900">
                      {creditType === 'prestamo'
                        ? 'Préstamo en Efectivo'
                        : esContado
                          ? 'Venta de Contado'
                          : 'Crédito de un Artículo'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Estado Inicial:</span>
                    <span className="font-bold text-blue-600">
                      {creditType === 'articulo' && esContado ? 'Venta directa' : 'Pendiente de Aprobación'}
                    </span>
                  </div>
                  {creditType === 'prestamo' && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-medium">Sistema:</span>
                      <span className="font-bold text-slate-900">
                        {tipoInteres === TipoAmortizacion.INTERES_PLANO ? 'Amortización' : 'Interés Simple'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
                <button
                  onClick={handleReset}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (isSubmitting) return
                    setIsSubmitting(true)
                    try {
                      const fechaInicioPayload = dateTimeLocalToBogotaOffsetIso(fechaCreditoInput)
                      const payload = creditType === 'prestamo'
                        ? {
                            creditType,
                            clienteCreditoId,
                            monto: parseCOPInputToNumber(montoPrestamoInput),
                            tipoInteres: tipoInteres,
                            tipoAmortizacion: tipoInteres,
                            tasaInteres: Number(tasaInteresInput),
                            cuotas: Number(cuotasPrestamoInput),
                            cantidadCuotas: Number(cuotasPrestamoInput),
                            cuotasTotales: Number(cuotasPrestamoInput),
                            plazoMeses: (calculoPrestamo?.meses && calculoPrestamo.meses > 0) ? calculoPrestamo.meses : 1,
                            frecuenciaPago,
                            fechaInicio: fechaInicioPayload,
                            fechaPrimerCobro,
                            notas: notasInput.trim() || undefined,
                          }
                        : {
                            creditType,
                            clienteCreditoId,
                            articuloId: articuloSeleccionadoId,
                            articuloNombre: articuloSeleccionado?.nombre,
                            precioProductoId: articuloSeleccionado
                              ? (
                                  esContado
                                    ? articuloSeleccionado.precioContadoId
                                    : (planArticuloIndex !== null
                                      ? articuloSeleccionado.opcionesCuotas[planArticuloIndex]?.id
                                      : undefined)
                                )
                              : undefined,
                            monto: calculoCreditoArticulo?.precioTotal || 0,
                            cuotaInicialArticulo: parseCOPInputToNumber(cuotaInicialArticuloInput),
                            frecuenciaPago: esContado ? 'MENSUAL' : frecuenciaPago,
                            fechaInicio: fechaInicioPayload,
                            fechaPrimerCobro: esContado ? undefined : fechaPrimerCobro,
                            plazoMeses: esContado ? 1 : mesesPlan,
                            cantidadCuotas: esContado ? 1 : (calculoCreditoArticulo?.numCuotas || 0),
                            ventaContado: esContado ? true : undefined,
                            notas: notasInput.trim() || undefined,
                          }
                      
                      console.log('[CrearCreditoModal] payload to send:', payload);
                      await onConfirm(payload as any)
                      handleReset()
                    } catch (error) {
                      console.error('Error al crear crédito:', error)
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  disabled={
                    isSubmitting ||
                    !clienteCreditoId ||
                    (creditType === 'prestamo' ? !montoPrestamoInput : !calculoCreditoArticulo) ||
                    (!(creditType === 'articulo' && esContado) && !fechaPrimerCobro) ||
                    (fechaPrimerCobro ? new Date(fechaPrimerCobro + 'T12:00:00').getDay() === 0 : false) ||
                    (frecuenciaPago === 'QUINCENAL' && fechaPrimerCobro ? (() => { const d = new Date(fechaPrimerCobro + 'T12:00:00').getDate(); return d !== 15 && d !== 30 })() : false) ||
                    (fechaPrimerCobro ? fechaPrimerCobro < getBogotaDateKey(new Date()) : false)
                  }
                  className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isSubmitting ? 'Procesando...' : (creditType === 'articulo' && esContado ? 'Registrar Venta' : 'Crear Crédito')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
