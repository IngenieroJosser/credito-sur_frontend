'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import { clientesService, Cliente } from '@/services/clientes-service'
import { articulosService, Articulo } from '@/services/articulos-service'
import { offlineStore } from '@/lib/offline/offlineDb'
import { TipoAmortizacion } from '@/types/enums'

interface CrearCreditoModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    creditType: 'prestamo' | 'articulo'
    clienteCreditoId: string
    monto: number
    tipoInteres?: TipoAmortizacion
    tasaInteres?: number
    cuotasTotales?: number
    frecuenciaPago?: string
    fechaInicio?: string
    fechaPrimerCobro?: string
    articuloId?: string
    precioProductoId?: string
    plazoMeses?: number
    numCuotas?: number
    cuotaInicialArticulo?: number
  }) => void | Promise<void>
  defaultClienteId?: string
  defaultCreditType?: 'prestamo' | 'articulo'
  hideTypeSelector?: boolean
}

export default function CrearCreditoModal({ isOpen, onClose, onConfirm, defaultClienteId, defaultCreditType, hideTypeSelector }: CrearCreditoModalProps) {
  const [creditType, setCreditType] = useState<'prestamo' | 'articulo'>(defaultCreditType || 'prestamo')
  const [clienteCreditoId, setClienteCreditoId] = useState('')
  const [montoPrestamoInput, setMontoPrestamoInput] = useState('')
  const [tipoInteres, setTipoInteres] = useState<TipoAmortizacion>(TipoAmortizacion.INTERES_SIMPLE)
  const [tasaInteresInput, setTasaInteresInput] = useState('10')
  const [cuotasPrestamoInput, setCuotasPrestamoInput] = useState('12')
  const [cuotaInicialArticuloInput, setCuotaInicialArticuloInput] = useState('')
  const [fechaCreditoInput, setFechaCreditoInput] = useState(() => {
    const now = new Date()
    const tzAdjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    return tzAdjusted.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
  })
  const [frecuenciaPago, setFrecuenciaPago] = useState('Diaria')
  const [fechaPrimerCobro, setFechaPrimerCobro] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [articuloSeleccionadoId, setArticuloSeleccionadoId] = useState<string>('')
  const [planArticuloIndex, setPlanArticuloIndex] = useState<number | null>(null)
  
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);

  useEffect(() => {
    if (isOpen) {
        if (defaultClienteId) setClienteCreditoId(defaultClienteId)
        Promise.all([
          clientesService.obtenerTodos(),
          articulosService.obtenerArticulos()
        ]).then(([c, a]) => {
          setClientes(c);
          setArticulos(a);
          offlineStore.saveMany('clientes', c).catch(() => {});
        }).catch(async () => {
          // Fallback offline
          try {
            const offClientes = await offlineStore.getAll<Cliente>('clientes');
            setClientes(offClientes);
          } catch { /* ignore */ }
        });
    }
  }, [isOpen, defaultClienteId]);

  const articuloSeleccionado = articulos.find(a => a.id === articuloSeleccionadoId)
  const [esContado, setEsContado] = useState(false)

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

  if (!isOpen) return null

  const handleReset = () => {
    setClienteCreditoId('')
    setCreditType('prestamo')
    setMontoPrestamoInput('')
    setTipoInteres(TipoAmortizacion.INTERES_SIMPLE)
    setTasaInteresInput('10')
    setCuotasPrestamoInput('12')
    setCuotaInicialArticuloInput('')
    setArticuloSeleccionadoId('')
    setPlanArticuloIndex(null)
    setFrecuenciaPago('Diaria')
    {
      const now = new Date()
      const tzAdjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      setFechaCreditoInput(tzAdjusted.toISOString().slice(0, 16))
    }
    onClose()
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={handleReset}
      >
        <div
          className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Crear Nuevo Crédito</h3>
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
                <label className="block text-sm font-bold text-slate-700 mb-3">Tipo de Crédito</label>
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
                <div className="p-4 rounded-xl border-2 border-orange-500 bg-orange-50 text-orange-700 text-center w-56">
                  <Package className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-bold text-sm">Crédito por Artículo</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cliente</label>
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
                      <label className="block text-sm font-bold text-slate-700 mb-2">Monto del Préstamo</label>
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
                      <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Interés</label>
                      <select
                        value={tipoInteres}
                        onChange={(e) => setTipoInteres(e.target.value as TipoAmortizacion)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                      >
                        <option value={TipoAmortizacion.INTERES_SIMPLE}>Interés Simple</option>
                        <option value={TipoAmortizacion.FRANCESA}>Francés (Amortizable)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Tasa de Interés (%)</label>
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
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cuotas</label>
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
                      <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia de Pago</label>
                      <select 
                         value={frecuenciaPago}
                         onChange={(e) => setFrecuenciaPago(e.target.value)}
                         className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                      >
                        <option value="DIARIO">Diario</option>
                        <option value="SEMANAL">Semanal</option>
                        <option value="QUINCENAL">Quincenal</option>
                        <option value="MENSUAL">Mensual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Crédito</label>
                       <input 
                          type="datetime-local"
                          value={fechaCreditoInput}
                          readOnly
                          className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-500 cursor-not-allowed"
                       />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3 items-start">
                    <Calculator className="w-5 h-5 text-blue-600 mt-0.5" />
                    <p className="text-xs font-medium text-blue-900 leading-relaxed">
                      <strong>Venta de Artículos:</strong> Elige crédito por meses o marca <strong>Compra de Contado</strong>. En contado no se generan cuotas ni plan de pagos.
                    </p>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Modo de Venta</label>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Artículo</label>
                      <select 
                        value={articuloSeleccionadoId}
                        onChange={(e) => {
                          setArticuloSeleccionadoId(e.target.value)
                          setPlanArticuloIndex(null)
                          setEsContado(false)
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
                            <label className="block text-sm font-bold text-slate-700 mt-3 mb-2">Plazo (Meses)</label>
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
                                    const meses = Number(op.numeroCuotas);
                                    if (isNaN(meses)) return null;
                                    return (
                                      <option key={idx} value={idx}>
                                        {meses} {meses === 1 ? 'Mes' : 'Meses'} - Total: {formatCurrency(op.precioTotal)}
                                      </option>
                                    );
                                })}
                            </select>
                          </>
                        )}
                    </div>
                  </div>

                  {!esContado && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia de Pago</label>
                        <select 
                           value={frecuenciaPago}
                           onChange={(e) => setFrecuenciaPago(e.target.value)}
                           className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                        >
                           <option value="DIARIO">Diaria</option>
                          <option value="SEMANAL">Semanal</option>
                          <option value="QUINCENAL">Quincenal</option>
                          <option value="MENSUAL">Mensual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Cuota Inicial</label>
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
                    <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Crédito</label>
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
                  <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Primer Cobro</label>
                  <input 
                    type="date"
                    value={fechaPrimerCobro}
                    onChange={(e) => setFechaPrimerCobro(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Notas (Opcional)</label>
                <textarea 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 resize-none"
                  rows={3}
                  placeholder="Observaciones adicionales..."
                ></textarea>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Resumen</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Tipo:</span>
                    <span className="font-bold text-slate-900">
                      {creditType === 'prestamo' ? 'Préstamo en Efectivo' : 'Crédito de un Artículo'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Estado Inicial:</span>
                    <span className="font-bold text-blue-600">Pendiente de Aprobación</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleReset}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (isSubmitting) return;
                    setIsSubmitting(true);
                    try {
                       const payload = creditType === 'prestamo' 
                        ? {
                            creditType,
                            clienteCreditoId,
                            monto: parseCOPInputToNumber(montoPrestamoInput),
                            tipoInteres,
                            tasaInteres: Number(tasaInteresInput),
                            cuotasTotales: Number(cuotasPrestamoInput),
                            frecuenciaPago,
                            fechaInicio: new Date(fechaCreditoInput).toISOString(),
                            fechaPrimerCobro
                          }
                        : {
                            creditType,
                            clienteCreditoId,
                            articuloId: articuloSeleccionadoId,
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
                            fechaInicio: new Date(fechaCreditoInput).toISOString(),
                            plazoMeses: esContado ? 1 : mesesPlan,
                            numCuotas: esContado ? 1 : (calculoCreditoArticulo?.numCuotas || 0),
                            ventaContado: esContado ? true : undefined
                          }
                      await onConfirm(payload as any)
                      handleReset()
                    } catch (error) {
                      console.error('Error al crear crédito:', error)
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  disabled={isSubmitting || !clienteCreditoId || (creditType === 'prestamo' ? !montoPrestamoInput : !calculoCreditoArticulo)}
                  className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isSubmitting ? 'Procesando...' : 'Crear Crédito'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
