
'use client'

import React, { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft,
  BarChart3,
  Smartphone,
  DollarSign,
  CheckCircle,
  Loader2,
  Plus,
  X,
  CreditCard,
  ShoppingBag,
  UserPlus,
} from 'lucide-react'
import ClienteDetalleElegante, { Cliente, Prestamo, Pago, Comentario } from '@/components/cliente/DetalleCliente'
import Link from 'next/link'
import { MOCK_CLIENTES } from '@/services/clientes-service'
import { formatCOPInputValue, formatMilesCOP, parseCOPInputToNumber } from '@/lib/utils'

const MODAL_Z_INDEX = 2147483647

function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export default function ClienteDetalleSupervisorPage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params?.id
  const id = Array.isArray(rawId) ? rawId[0] : (rawId as string)

  const [isFabOpen, setIsFabOpen] = useState(false)
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [showCreditoModal, setShowCreditoModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)

  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO')
  const [montoPagoInput, setMontoPagoInput] = useState('')
  const [comprobanteTransferencia, setComprobanteTransferencia] = useState<File | null>(null)
  const [comprobanteTransferenciaPreviewUrl, setComprobanteTransferenciaPreviewUrl] = useState<string | null>(null)

  const [creditType, setCreditType] = useState<'prestamo' | 'articulo'>('prestamo')
  const [montoPrestamoInput, setMontoPrestamoInput] = useState('')
  const [tasaInteresInput, setTasaInteresInput] = useState('')
  const [cuotasPrestamoInput, setCuotasPrestamoInput] = useState('')
  const [cuotaInicialArticuloInput, setCuotaInicialArticuloInput] = useState('')

  const [formularioNuevoCliente, setFormularioNuevoCliente] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    correo: '',
    direccion: '',
    referencia: '',
  })
  const [fotosCliente, setFotosCliente] = useState({
    fotoPerfil: null as File | null,
    documentoFrente: null as File | null,
    documentoReverso: null as File | null,
    comprobanteDomicilio: null as File | null,
  })

  const clienteEncontrado = MOCK_CLIENTES.find((c) => c.id === id) || MOCK_CLIENTES[0]

  const clienteData = {
    ...clienteEncontrado,
    prestamos: [],
    pagos: [],
  }

  const isLoading = false
  const error = null

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Cargando información del cliente...</p>
        </div>
      </div>
    )
  }

  if (error || !clienteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error al cargar</h2>
          <p className="text-slate-500 mb-6">No se pudo obtener la información del cliente. Verifique su conexión o intente nuevamente.</p>
          <Link
            href="/supervisor/clientes"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al listado</span>
          </Link>
        </div>
      </div>
    )
  }

  const cliente: Cliente = {
    ...clienteData,
    fechaRegistro: clienteData.fechaRegistro || 'No disponible',
    avatarColor: 'bg-blue-600',
  }

  const prestamos: Prestamo[] = (clienteData.prestamos || []).map((p: unknown) => {
    return {
      ...(p as Partial<Prestamo>),
      icono: <Smartphone className="w-5 h-5" />,
      categoria: 'General',
    } as Prestamo
  })

  const pagos: Pago[] = (clienteData.pagos || []).map((p: unknown) => {
    return {
      ...(p as Partial<Pago>),
      icono: <DollarSign className="w-5 h-5" />,
      estado: 'confirmado',
    } as Pago
  })

  const comentarios: Comentario[] = []

  useEffect(() => {
    if (metodoPago !== 'TRANSFERENCIA') {
      setComprobanteTransferencia(null)
      setComprobanteTransferenciaPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }

    if (!comprobanteTransferencia) {
      setComprobanteTransferenciaPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }

    const isImage = comprobanteTransferencia.type.startsWith('image/')
    if (!isImage) {
      setComprobanteTransferenciaPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }

    const url = URL.createObjectURL(comprobanteTransferencia)
    setComprobanteTransferenciaPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [comprobanteTransferencia, metodoPago])

  const resetPagoModal = () => {
    setShowPagoModal(false)
    setMetodoPago('EFECTIVO')
    setMontoPagoInput('')
    setComprobanteTransferencia(null)
    setComprobanteTransferenciaPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const resetCreditoModal = () => {
    setShowCreditoModal(false)
    setCreditType('prestamo')
    setMontoPrestamoInput('')
    setTasaInteresInput('')
    setCuotasPrestamoInput('')
    setCuotaInicialArticuloInput('')
  }

  const resetNuevoClienteForm = () => {
    setShowNewClientModal(false)
    setFormularioNuevoCliente({
      dni: '',
      nombres: '',
      apellidos: '',
      telefono: '',
      correo: '',
      direccion: '',
      referencia: '',
    })
    setFotosCliente({
      fotoPerfil: null,
      documentoFrente: null,
      documentoReverso: null,
      comprobanteDomicilio: null,
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/supervisor/clientes"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">
                    <span className="text-blue-600">Gestión de </span>
                    <span className="text-orange-500">Clientes</span>
                  </h1>
                  <p className="text-sm font-medium">
                    <span className="text-blue-600">Detalle y análisis </span>
                    <span className="text-orange-500">de cartera</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <ClienteDetalleElegante
          cliente={cliente}
          prestamos={prestamos}
          pagos={pagos}
          comentarios={comentarios}
          rolUsuario="supervisor"
        />
      </main>

      {showPagoModal && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: MODAL_Z_INDEX }}
            onClick={resetPagoModal}
          >
            <div
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Registrar Pago</h3>
                  <button
                    type="button"
                    onClick={resetPagoModal}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-sm text-slate-500">Cliente</p>
                    <p className="font-bold text-slate-900 text-lg">{cliente.nombres} {cliente.apellidos}</p>
                    <p className="text-xs text-slate-400">CC: {cliente.dni}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMetodoPago('EFECTIVO')}
                        className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                          metodoPago === 'EFECTIVO'
                            ? 'bg-[#08557f] text-white border-[#08557f]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        EFECTIVO
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetodoPago('TRANSFERENCIA')}
                        className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                          metodoPago === 'TRANSFERENCIA'
                            ? 'bg-[#08557f] text-white border-[#08557f]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        TRANSFERENCIA
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Monto Recibido</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={montoPagoInput}
                        onChange={(e) => setMontoPagoInput(formatCOPInputValue(e.target.value))}
                        className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-bold text-2xl text-slate-900 placeholder:text-slate-300"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[10000, 20000, 50000, 100000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          const nuevo = parseCOPInputToNumber(montoPagoInput) + amount
                          setMontoPagoInput(nuevo === 0 ? '' : formatMilesCOP(nuevo))
                        }}
                        className="py-2 px-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                      >
                        +${(amount / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>

                  {metodoPago === 'TRANSFERENCIA' && (
                    <div className="pt-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante (Obligatorio)</label>
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">Sube el comprobante</p>
                              {comprobanteTransferencia && (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#08557f] border border-blue-100">
                                  ADJUNTO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">Imagen o PDF.</p>
                          </div>
                          {comprobanteTransferencia && (
                            <button
                              type="button"
                              onClick={() => setComprobanteTransferencia(null)}
                              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Quitar
                            </button>
                          )}
                        </div>

                        {comprobanteTransferenciaPreviewUrl && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <img src={comprobanteTransferenciaPreviewUrl} alt="Comprobante" className="w-full h-40 object-cover" />
                          </div>
                        )}

                        {comprobanteTransferencia && !comprobanteTransferenciaPreviewUrl && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-bold text-slate-700 truncate">Archivo: {comprobanteTransferencia.name}</p>
                          </div>
                        )}

                        <div className="mt-3">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => setComprobanteTransferencia(e.target.files?.[0] || null)}
                            className="w-full text-sm"
                            required
                          />
                        </div>
                      </div>
                      {!comprobanteTransferencia && (
                        <p className="mt-2 text-xs font-bold text-rose-600">Adjunta el comprobante para confirmar una transferencia.</p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      console.log('Registrar pago:', {
                        clienteId: id,
                        monto: parseCOPInputToNumber(montoPagoInput),
                        metodoPago,
                        comprobanteTransferencia,
                      })
                      resetPagoModal()
                    }}
                    disabled={
                      parseCOPInputToNumber(montoPagoInput) <= 0 ||
                      (metodoPago === 'TRANSFERENCIA' && !comprobanteTransferencia)
                    }
                    className="w-full bg-[#08557f] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Confirmar Pago
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showCreditoModal && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: MODAL_Z_INDEX }}
            onClick={resetCreditoModal}
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
                    onClick={resetCreditoModal}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
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
                      <ShoppingBag className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-bold text-sm">Crédito por Artículo</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cliente</label>
                    <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900">
                      {cliente.nombres} {cliente.apellidos} • {cliente.dni}
                    </div>
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
                          <label className="block text-sm font-bold text-slate-700 mb-2">Tasa de Interés (%)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={tasaInteresInput}
                            onChange={(e) => setTasaInteresInput(e.target.value.replace(/[^0-9.]/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                            placeholder="5.0"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Frecuencia de Pago</label>
                          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                            <option>Diario</option>
                            <option>Semanal</option>
                            <option>Quincenal</option>
                            <option>Mensual</option>
                          </select>
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
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuota Inicial</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                              type="text"
                              inputMode="numeric"
                              value={cuotaInicialArticuloInput}
                              onChange={(e) => setCuotaInicialArticuloInput(formatCOPInputValue(e.target.value))}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cuotas</label>
                          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900">
                            <option>3 cuotas</option>
                            <option>6 cuotas</option>
                            <option>12 cuotas</option>
                            <option>18 cuotas</option>
                            <option>24 cuotas</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">Resumen</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tipo:</span>
                        <span className="font-bold text-slate-900">
                          {creditType === 'prestamo' ? 'Préstamo en Efectivo' : 'Crédito por Artículo'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Estado:</span>
                        <span className="font-bold text-orange-600">Pendiente de Aprobación</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetCreditoModal}
                      className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Crear crédito:', {
                          clienteId: id,
                          tipo: creditType,
                          montoPrestamo: parseCOPInputToNumber(montoPrestamoInput),
                          tasaInteres: tasaInteresInput,
                          cuotas: cuotasPrestamoInput,
                          cuotaInicial: parseCOPInputToNumber(cuotaInicialArticuloInput),
                        })
                        resetCreditoModal()
                      }}
                      className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all"
                    >
                      Crear Crédito
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showNewClientModal && (
        <Portal>
          <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: MODAL_Z_INDEX }}
            onClick={resetNuevoClienteForm}
          >
            <div
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Crear Cliente</h3>
                  <button
                    type="button"
                    onClick={resetNuevoClienteForm}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    console.log('Crear cliente:', { ...formularioNuevoCliente, fotos: fotosCliente })
                    resetNuevoClienteForm()
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cédula / CC</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formularioNuevoCliente.dni}
                        onChange={(e) =>
                          setFormularioNuevoCliente((prev) => ({
                            ...prev,
                            dni: e.target.value.replace(/\D/g, ''),
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                        placeholder="Número de cédula (CC)"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={formularioNuevoCliente.telefono}
                        onChange={(e) =>
                          setFormularioNuevoCliente((prev) => ({
                            ...prev,
                            telefono: e.target.value.replace(/\D/g, ''),
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                        placeholder="Ej: 3001234567"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nombres</label>
                      <input
                        value={formularioNuevoCliente.nombres}
                        onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, nombres: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Apellidos</label>
                      <input
                        value={formularioNuevoCliente.apellidos}
                        onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, apellidos: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Correo (Opcional)</label>
                    <input
                      type="email"
                      value={formularioNuevoCliente.correo}
                      onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, correo: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                      placeholder="correo@dominio.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Dirección (Opcional)</label>
                    <input
                      value={formularioNuevoCliente.direccion}
                      onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, direccion: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400"
                      placeholder="Dirección del cliente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Referencia (Opcional)</label>
                    <textarea
                      value={formularioNuevoCliente.referencia}
                      onChange={(e) => setFormularioNuevoCliente((prev) => ({ ...prev, referencia: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                      rows={3}
                      placeholder="Punto de referencia / observaciones"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Foto de perfil</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            fotoPerfil: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cédula/CC (Frente)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            documentoFrente: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cédula/CC (Reverso)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            documentoReverso: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante de domicilio</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          setFotosCliente((prev) => ({
                            ...prev,
                            comprobanteDomicilio: e.target.files?.[0] ?? null,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#08557f] file:text-white file:text-xs file:font-bold hover:file:bg-[#063a58]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetNuevoClienteForm}
                      className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#08557f] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all"
                    >
                      Guardar Cliente
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <div className="fixed right-6 z-50 flex flex-col items-end gap-3 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-none">
        <div
          className={`flex flex-col gap-3 transition-all duration-200 origin-bottom-right ${
            isFabOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setShowCreditoModal(true)
              setIsFabOpen(false)
            }}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Crear Crédito</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
              <CreditCard className="h-5 w-5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFabOpen(false)
              setMetodoPago('EFECTIVO')
              setMontoPagoInput('')
              setShowPagoModal(true)
            }}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Registrar pago</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
              <DollarSign className="h-5 w-5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowNewClientModal(true)
              setIsFabOpen(false)
            }}
            className={`flex items-center justify-between w-56 gap-3 ${isFabOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="bg-[#08557f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#08557f]/20">Crear cliente</span>
            <div className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-[#08557f] border border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb] transition-all">
              <UserPlus className="h-5 w-5" />
            </div>
          </button>
        </div>

        <button
          onClick={() => setIsFabOpen((v) => !v)}
          className="pointer-events-auto h-14 w-14 rounded-full bg-[#08557f] text-white shadow-xl shadow-[#08557f]/25 flex items-center justify-center border border-white/30"
          aria-label={isFabOpen ? 'Cerrar acciones' : 'Abrir acciones'}
        >
          {isFabOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </div>
  )
}
