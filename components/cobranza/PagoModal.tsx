'use client'

import { useState, useEffect } from 'react'
import {
  X,
  DollarSign,
  CheckCircle2
} from 'lucide-react'
import { VisitaRuta } from '@/lib/types/cobranza'
import { formatCOPInputValue, parseCOPInputToNumber, formatMilesCOP } from '@/lib/utils'
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal'

interface PagoModalProps {
  visita: VisitaRuta
  tipo: 'PAGO' | 'ABONO'
  onClose: () => void
  onConfirm: (monto: number, metodo: 'EFECTIVO' | 'TRANSFERENCIA', comprobante: File | null) => void
}

export default function PagoModal({ visita, tipo, onClose, onConfirm }: PagoModalProps) {
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO')
  const [montoPagoInput, setMontoPagoInput] = useState(
    tipo === 'PAGO' ? formatMilesCOP(visita.montoCuota) : ''
  )
  const [comprobanteTransferencia, setComprobanteTransferencia] = useState<File | null>(null)
  const [comprobanteTransferenciaPreviewUrl, setComprobanteTransferenciaPreviewUrl] = useState<string | null>(null)

  // Cleanup preview URL on unmount or change
  useEffect(() => {
    return () => {
      if (comprobanteTransferenciaPreviewUrl) {
        URL.revokeObjectURL(comprobanteTransferenciaPreviewUrl)
      }
    }
  }, [comprobanteTransferenciaPreviewUrl])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setComprobanteTransferencia(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setComprobanteTransferenciaPreviewUrl(url)
    } else {
      setComprobanteTransferenciaPreviewUrl(null)
    }
  }

  const handleConfirmClick = () => {
    onConfirm(parseCOPInputToNumber(montoPagoInput), metodoPago, comprobanteTransferencia)
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">{tipo === 'ABONO' ? 'Registrar Abono' : 'Registrar Pago'}</h3>
              <button 
                onClick={onClose}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-sm text-slate-500">Cliente</p>
                <p className="font-bold text-slate-900 text-lg">{visita.cliente}</p>
                <p className="text-xs text-slate-500">{visita.direccion}</p>
                <p className="text-xs text-slate-400">Cuota esperada: ${formatMilesCOP(visita.montoCuota)}</p>
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
                {[10000, 20000, 50000, 100000].map(amount => (
                  <button 
                    key={amount}
                    type="button"
                    onClick={() => {
                      const nuevo = parseCOPInputToNumber(montoPagoInput) + amount
                      setMontoPagoInput(nuevo === 0 ? '' : formatMilesCOP(nuevo))
                    }}
                    className="py-2 px-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                  >
                    +${(amount/1000).toFixed(0)}k
                  </button>
                ))}
              </div>

              <button 
                type="button"
                onClick={handleConfirmClick}
                disabled={
                  parseCOPInputToNumber(montoPagoInput) <= 0 ||
                  (metodoPago === 'TRANSFERENCIA' && !comprobanteTransferencia)
                }
                className="w-full bg-[#08557f] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#08557f]/20 hover:bg-[#063a58] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <CheckCircle2 className="h-5 w-5" />
                {tipo === 'ABONO' ? 'Confirmar Abono' : 'Confirmar Pago'}
              </button>

              {metodoPago === 'TRANSFERENCIA' && (
                <div className="pt-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Comprobante (Obligatorio)
                  </label>
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
                        <p className="text-xs text-slate-500">Imagen o PDF. Recomendado: foto clara del recibo.</p>
                      </div>
                      {comprobanteTransferencia && (
                        <button
                          type="button"
                          onClick={() => {
                            setComprobanteTransferencia(null)
                            setComprobanteTransferenciaPreviewUrl(null)
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          Quitar
                        </button>
                      )}
                    </div>

                    {comprobanteTransferenciaPreviewUrl && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={comprobanteTransferenciaPreviewUrl}
                          alt="Comprobante"
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    )}

                    {comprobanteTransferencia && !comprobanteTransferenciaPreviewUrl && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs font-bold text-slate-700 truncate">
                          Archivo: {comprobanteTransferencia.name}
                        </p>
                      </div>
                    )}

                    <div className="mt-3">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="w-full text-sm"
                        required
                      />
                    </div>
                  </div>
                  {!comprobanteTransferencia && (
                    <p className="mt-2 text-xs font-bold text-rose-600">
                      Adjunta el comprobante para confirmar una transferencia.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
