'use client'

import { useState, useEffect } from 'react'
import {
  X,
  DollarSign,
  CheckCircle2,
  Users,
  User,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import Image from 'next/image'
import { formatCOPInputValue, formatMilesCOP, parseCOPInputToNumber } from '@/lib/utils'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import { MOCK_CLIENTES } from '@/services/clientes-service'

interface Visita {
  id: string
  cliente: string
  direccion: string
  montoCuota: number
  saldoTotal: number
}

interface PagoModalProps {
  isOpen: boolean
  onClose: () => void
  initialVisita?: Visita
  availableVisitas?: Visita[]
  onConfirm: (data: {
    clienteId: string
    monto: number
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA'
    comprobante: File | null
    isAbono: boolean
  }) => void
  initialIsAbono?: boolean
}

export default function PagoModal({ 
  isOpen, 
  onClose, 
  initialVisita, 
  availableVisitas,
  onConfirm,
  initialIsAbono = false
}: PagoModalProps) {
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<Visita | null>(null)
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO')
  const [montoPagoInput, setMontoPagoInput] = useState('')
  const [comprobanteTransferencia, setComprobanteTransferencia] = useState<File | null>(null)
  const [comprobanteTransferenciaPreviewUrl, setComprobanteTransferenciaPreviewUrl] = useState<string | null>(null)
  const [isAbono, setIsAbono] = useState(initialIsAbono)

  const [prevIsOpen, setPrevIsOpen] = useState(false)

  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true)
    setIsAbono(initialIsAbono)
    if (initialVisita) {
      setVisitaSeleccionada(initialVisita)
      setMontoPagoInput(formatMilesCOP(initialVisita.montoCuota || 0))
    } else {
      setVisitaSeleccionada(null)
      setMontoPagoInput('')
    }
    setMetodoPago('EFECTIVO')
    setComprobanteTransferencia(null)
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false)
  }

  useEffect(() => {
    let url: string | null = null

    if (comprobanteTransferencia && metodoPago === 'TRANSFERENCIA' && comprobanteTransferencia.type.startsWith('image/')) {
      url = URL.createObjectURL(comprobanteTransferencia)
    }

    const timeout = setTimeout(() => {
      setComprobanteTransferenciaPreviewUrl(url)
    }, 0)

    return () => {
      clearTimeout(timeout)
      if (url) URL.revokeObjectURL(url)
    }
  }, [comprobanteTransferencia, metodoPago])

  if (!isOpen) return null

  const handleReset = () => {
    onClose()
    if (!initialVisita) {
      setVisitaSeleccionada(null)
      setMontoPagoInput('')
    }
    setMetodoPago('EFECTIVO')
    setComprobanteTransferencia(null)
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={handleReset}
      >
        <div
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">{isAbono ? 'Registrar Abono' : 'Registrar Pago'}</h3>
              <button
                type="button"
                onClick={handleReset}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {!visitaSeleccionada ? (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Buscar Cliente</label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-slate-900 outline-none focus:border-[#08557f] font-bold"
                    onChange={(e) => {
                      const v = availableVisitas?.find((x) => x.id === e.target.value)
                      if (v) {
                        setVisitaSeleccionada(v)
                        setMontoPagoInput(formatMilesCOP(v.montoCuota))
                      } else {
                         const c = MOCK_CLIENTES.find(x => x.id === e.target.value);
                         if(c) {
                            setVisitaSeleccionada({
                               id: c.id,
                               cliente: `${c.nombres} ${c.apellidos}`,
                               direccion: c.direccion || '',
                               montoCuota: 120000,
                               saldoTotal: 1500000
                            });
                            setMontoPagoInput(formatMilesCOP(120000));
                         }
                      }
                    }}
                    value=""
                  >
                    <option value="" disabled>Seleccione cliente...</option>
                    {availableVisitas?.map((v) => (
                      <option key={v.id} value={v.id}>{v.cliente}</option>
                    )) || MOCK_CLIENTES.map(c => (
                      <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-[#08557f]/5 p-5 rounded-3xl border border-[#08557f]/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#08557f]/5 rounded-full -mr-12 -mt-12"></div>
                  {!initialVisita && (
                    <button
                      onClick={() => {
                        setVisitaSeleccionada(null)
                        setMontoPagoInput('')
                      }}
                      className="absolute top-4 right-4 p-2 bg-white text-slate-400 rounded-xl hover:text-slate-700 shadow-sm border border-slate-100 transition-all z-10"
                      title="Cambiar cliente"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  )}

                  <div className="relative z-10 flex gap-4 items-center">
                    <div className="h-14 w-14 rounded-2xl bg-white border border-[#08557f]/10 flex items-center justify-center text-[#08557f] shadow-sm">
                      <User className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-[#08557f] uppercase tracking-widest mb-0.5">Cliente Seleccionado</p>
                      <p className="font-bold text-slate-900 text-lg truncate">{visitaSeleccionada.cliente}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <p className="text-xs text-slate-500 truncate">{visitaSeleccionada.direccion}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#08557f]/10 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Cuota Esperada</div>
                      <div className="text-slate-900 font-black text-lg">${formatMilesCOP(visitaSeleccionada.montoCuota)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Saldo Total</div>
                      <div className="text-[#08557f] font-black text-lg">${formatMilesCOP(visitaSeleccionada.saldoTotal || 0)}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMetodoPago('EFECTIVO')}
                      className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                        metodoPago === 'EFECTIVO'
                          ? 'bg-[#08557f] text-white border-[#08557f] shadow-lg shadow-[#08557f]/20'
                          : 'bg-white text-slate-700 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      EFECTIVO
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPago('TRANSFERENCIA')}
                      className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                        metodoPago === 'TRANSFERENCIA'
                          ? 'bg-[#08557f] text-white border-[#08557f] shadow-lg shadow-[#08557f]/20'
                          : 'bg-white text-slate-700 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      TRANSFERENCIA
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700">Monto Recibido</label>
                    <button
                      onClick={() => setIsAbono(!isAbono)}
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${
                        isAbono ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isAbono ? 'Modo Abono' : 'Modo Cuota'}
                    </button>
                  </div>
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

                {metodoPago === 'TRANSFERENCIA' && (
                  <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Comprobante (Obligatorio)</label>
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 hover:bg-slate-50 transition-colors">
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
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-sm"
                          >
                            Quitar
                          </button>
                        )}
                      </div>

                      {comprobanteTransferenciaPreviewUrl && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white relative h-48">
                          <Image
                            src={comprobanteTransferenciaPreviewUrl}
                            alt="Comprobante"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}

                      {!comprobanteTransferencia && (
                        <div className="mt-3 flex flex-col items-center justify-center py-6 text-slate-400">
                          <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Esperando archivo...</p>
                        </div>
                      )}

                      <div className="mt-3">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setComprobanteTransferencia(e.target.files?.[0] || null)}
                          className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          required
                        />
                      </div>
                    </div>
                    {!comprobanteTransferencia && (
                      <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest">Se requiere comprobante</p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (visitaSeleccionada) {
                      onConfirm({
                        clienteId: visitaSeleccionada.id,
                        monto: parseCOPInputToNumber(montoPagoInput),
                        metodoPago,
                        comprobante: comprobanteTransferencia,
                        isAbono,
                      })
                      onClose()
                    }
                  }}
                  disabled={
                    !visitaSeleccionada ||
                    parseCOPInputToNumber(montoPagoInput) <= 0 ||
                    (metodoPago === 'TRANSFERENCIA' && !comprobanteTransferencia)
                  }
                  className={`w-full ${isAbono ? 'bg-orange-600 shadow-orange-600/20 hover:bg-orange-700' : 'bg-[#08557f] shadow-[#08557f]/20 hover:bg-[#063a58]'} text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 uppercase tracking-widest text-xs`}
                >
                  {isAbono ? <RefreshCw className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                  Confirmar {isAbono ? 'Abono' : 'Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
