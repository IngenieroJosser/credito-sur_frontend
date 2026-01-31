'use client'

import { useState, useMemo } from 'react'
import {
  X,
  DollarSign,
  Plus,
  Calculator,
  Calendar,
  CheckCircle2,
  Package,
} from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import { MOCK_CLIENTES } from '@/services/clientes-service'
import { MOCK_ARTICULOS } from '@/services/articulos-service'

interface CrearCreditoModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    creditType: 'prestamo' | 'articulo'
    clienteCreditoId: string
    [key: string]: unknown
  }) => void
}

export default function CrearCreditoModal({ isOpen, onClose, onConfirm }: CrearCreditoModalProps) {
  const [creditType, setCreditType] = useState<'prestamo' | 'articulo'>('prestamo')
  const [clienteCreditoId, setClienteCreditoId] = useState('')
  const [montoPrestamoInput, setMontoPrestamoInput] = useState('')
  const [tipoInteres, setTipoInteres] = useState<'SIMPLE' | 'AMORTIZABLE'>('SIMPLE')
  const [tasaInteresInput, setTasaInteresInput] = useState('10')
  const [cuotasPrestamoInput, setCuotasPrestamoInput] = useState('12')
  const [cuotaInicialArticuloInput, setCuotaInicialArticuloInput] = useState('')
  const [fechaCreditoInput, setFechaCreditoInput] = useState(new Date().toISOString().split('T')[0])
  const [frecuenciaPago, setFrecuenciaPago] = useState('Diaria')
  const [fechaPrimerCobro, setFechaPrimerCobro] = useState('')
  
  const [articuloSeleccionadoId, setArticuloSeleccionadoId] = useState<string>('')
  const [planArticuloIndex, setPlanArticuloIndex] = useState<number | null>(null)
  
  const articuloSeleccionado = MOCK_ARTICULOS.find(a => a.id === articuloSeleccionadoId)

  const planSeleccionado = useMemo(() => (articuloSeleccionado && planArticuloIndex !== null) 
    ? articuloSeleccionado.opcionesCuotas[planArticuloIndex] 
    : null, [articuloSeleccionado, planArticuloIndex]);

  const mesesPlan = useMemo(() => planSeleccionado ? planSeleccionado.numeroCuotas / 2 : 0, [planSeleccionado]);
  
  const calculoCreditoArticulo = useMemo(() => {
     if(!planSeleccionado || !mesesPlan) return null;
     
     const precioTotal = planSeleccionado.precioTotal;
     const inicial = parseCOPInputToNumber(cuotaInicialArticuloInput);
     const aFinanciar = Math.max(0, precioTotal - inicial);
     
     let numCuotas = 0;
     if (frecuenciaPago === 'Diaria') numCuotas = Math.ceil(mesesPlan * 30);
     else if (frecuenciaPago === 'Semanal') numCuotas = Math.ceil(mesesPlan * 4);
     else if (frecuenciaPago === 'Quincenal') numCuotas = Math.ceil(mesesPlan * 2); 
     else if (frecuenciaPago === 'Mensuales') numCuotas = Math.ceil(mesesPlan * 1);
     
     const valorCuota = numCuotas > 0 ? Math.ceil(aFinanciar / numCuotas) : 0;
     
     return {
        meses: mesesPlan,
        precioTotal,
        aFinanciar,
        numCuotas,
        valorCuota
     };
  }, [planSeleccionado, mesesPlan, frecuenciaPago, cuotaInicialArticuloInput]);

  if (!isOpen) return null

  const handleReset = () => {
    setClienteCreditoId('')
    setCreditType('prestamo')
    setMontoPrestamoInput('')
    setTipoInteres('SIMPLE')
    setTasaInteresInput('10')
    setCuotasPrestamoInput('12')
    setCuotaInicialArticuloInput('')
    setArticuloSeleccionadoId('')
    setPlanArticuloIndex(null)
    setFrecuenciaPago('Diaria')
    setFechaCreditoInput(new Date().toISOString().split('T')[0])
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cliente</label>
                <select
                  value={clienteCreditoId}
                  onChange={(e) => setClienteCreditoId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
                >
                  <option value="">Selecciona un cliente</option>
                  {MOCK_CLIENTES.map((c) => (
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
                        onChange={(e) => setTipoInteres(e.target.value as 'SIMPLE' | 'AMORTIZABLE')}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                      >
                        <option value="SIMPLE">Interés Simple</option>
                        <option value="AMORTIZABLE">Amortizable</option>
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
                        <option value="Diaria">Diario</option>
                        <option value="Semanal">Semanal</option>
                        <option value="Quincenal">Quincenal</option>
                        <option value="Mensuales">Mensual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Inicio</label>
                       <input 
                          type="date"
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
                      <strong>Venta de Artículos:</strong> Los plazos y precios totales están predefinidos. La frecuencia de pago ajustará automáticamente el valor de cada cuota.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Artículo</label>
                      <select 
                        value={articuloSeleccionadoId}
                        onChange={(e) => {
                          setArticuloSeleccionadoId(e.target.value)
                          setPlanArticuloIndex(null)
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                      >
                        <option value="">Seleccionar artículo...</option>
                        {MOCK_ARTICULOS.map((articulo) => (
                          <option key={articulo.id} value={articulo.id}>
                            {articulo.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Plazo (Meses)</label>
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
                            {articuloSeleccionado?.opcionesCuotas.map((op, idx) => (
                                <option key={idx} value={idx}>
                                  {op.numeroCuotas / 2} Meses - Total: {formatCurrency(op.precioTotal)}
                                </option>
                            ))}
                        </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia de Pago</label>
                      <select 
                         value={frecuenciaPago}
                         onChange={(e) => setFrecuenciaPago(e.target.value)}
                         className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-slate-900"
                      >
                        <option value="Diaria">Diaria</option>
                        <option value="Semanal">Semanal</option>
                        <option value="Quincenal">Quincenal</option>
                        <option value="Mensuales">Mensual</option>
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

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Inicio</label>
                    <input 
                       type="date"
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
                              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">A Financiar</span>
                           </div>
                           <span className="font-black text-emerald-900 text-xl">{formatCurrency(calculoCreditoArticulo.aFinanciar)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white/50 p-3 rounded-xl border border-emerald-100">
                              <div className="text-[10px] text-emerald-800 font-bold uppercase mb-1 flex items-center gap-1.5">
                                 <Calendar className="w-3 h-3" />
                                 Cuotas
                              </div>
                              <div className="font-black text-emerald-900 text-lg">
                                 {calculoCreditoArticulo.numCuotas} <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">x {frecuenciaPago}</span>
                              </div>
                           </div>
                           <div className="bg-white/50 p-3 rounded-xl border border-emerald-100">
                              <div className="text-[10px] text-emerald-800 font-bold uppercase mb-1 flex items-center gap-1.5">
                                 <DollarSign className="w-3 h-3" />
                                 Valor Cuota
                              </div>
                              <div className="font-black text-emerald-900 text-lg">
                                 {formatCurrency(calculoCreditoArticulo.valorCuota)}
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Primer Cobro</label>
                <input 
                  type="date"
                  value={fechaPrimerCobro}
                  onChange={(e) => setFechaPrimerCobro(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                />
              </div>

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
                      {creditType === 'prestamo' ? 'Préstamo en Efectivo' : 'Crédito por Artículo'}
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
                  onClick={() => {
                    onConfirm({ creditType, clienteCreditoId })
                    handleReset()
                  }}
                  disabled={!clienteCreditoId || (creditType === 'prestamo' ? !montoPrestamoInput : !calculoCreditoArticulo)}
                  className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Crear Crédito
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
