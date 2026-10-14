'use client'

import { useState, useEffect } from 'react'
import {
  X,
  DollarSign,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { VisitaRuta } from '@/lib/types/cobranza'
import { MetodoPago } from '@/types/enums'
import { resolveCuotaNormalOperativa } from '@/lib/rutas-core'
import { formatCOPInputValue, parseCOPInputToNumber, formatMilesCOP, getDisplayedCOPInteger, isSameDisplayedCOPAmount } from '@/lib/utils'
import FieldLabel from '@/components/ui/FieldLabel'
import Portal, { MODAL_Z_INDEX } from '@/components/ui/Portal'
import Tooltip from '@/components/ui/Tooltip'
import AyudaContextual from '@/components/ui/AyudaContextual'
import { useModalDialog } from '@/hooks/use-modal-dialog'

const MONTO_MINIMO_ABONO_COP = 1000

export interface PagoConfirmContext {
  tipoRegistro: 'PAGO' | 'ABONO'
  cuotaNumeroEsperada?: number
  montoCuotaEsperado: number
  cuotaId?: string
  numeroReferencia?: string
  notas?: string
}

interface PagoModalProps {
  visita: VisitaRuta
  tipo: 'PAGO' | 'ABONO'
  onClose: () => void
  onConfirm: (
    monto: number,
    /**
     * El enum, no una union literal repetida. Los dos valores son los mismos, pero
     * `CrearPagoDto.metodoPago` pide `MetodoPago` y un literal no le vale (los enum
     * de TypeScript son nominales): eso obligaba a castear el cuerpo del pago en las
     * pantallas que usan este modal.
     */
    metodo: MetodoPago,
    comprobante: File | null,
    contexto: PagoConfirmContext,
  ) => void | Promise<void>
  // Optional props for cierre pendiente
  montoCuotaEsperadoOverride?: number
  cuotaNumeroEsperadaOverride?: number
}

export default function PagoModal({ visita, tipo, onClose, onConfirm, montoCuotaEsperadoOverride, cuotaNumeroEsperadaOverride }: PagoModalProps) {
  const montoCuotaEsperado = (() => {
    // Usar el valor forzado si viene (caso de cierre pendiente)
    if (montoCuotaEsperadoOverride != null) {
      return montoCuotaEsperadoOverride
    }
    const cuotaBase = resolveCuotaNormalOperativa(visita)
    const saldo = Number((visita)?.saldoTotal || 0)
    return Math.max(0, Math.min(cuotaBase, saldo > 0 ? saldo : cuotaBase))
  })()
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.EFECTIVO)
  const [montoPagoInput, setMontoPagoInput] = useState(
    tipo === 'PAGO' ? formatMilesCOP(montoCuotaEsperado) : ''
  )
  const [comprobanteTransferencia, setComprobanteTransferencia] = useState<File | null>(null)
  const [numeroReferencia, setNumeroReferencia] = useState('')
  const [notasTransferencia, setNotasTransferencia] = useState('')
  const [comprobanteTransferenciaPreviewUrl, setComprobanteTransferenciaPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Para un PAGO el monto viene prellenado con la cuota esperada, asi que "hay
  // datos" no es "el campo tiene algo": es que la persona haya cambiado algo
  // respecto a como abrio el modal.
  const montoInicial = tipo === 'PAGO' ? formatMilesCOP(montoCuotaEsperado) : ''
  const hayDatosSinGuardar =
    isSubmitting ||
    comprobanteTransferencia !== null ||
    numeroReferencia.trim() !== '' ||
    notasTransferencia.trim() !== '' ||
    metodoPago !== MetodoPago.EFECTIVO ||
    montoPagoInput !== montoInicial

  // Escape cierra, salvo mientras se esta enviando el pago.
  const { contenedorRef, alTocarElFondo, propsDialogo } = useModalDialog<HTMLDivElement>({
    onClose,
    cerrarConEscape: !isSubmitting,
  })

  // Cleanup preview URL on unmount or change
  useEffect(() => {
    return () => {
      if (comprobanteTransferenciaPreviewUrl) {
        URL.revokeObjectURL(comprobanteTransferenciaPreviewUrl)
      }
    }
  }, [comprobanteTransferenciaPreviewUrl])

  useEffect(() => {
    setErrorMsg(null)
  }, [tipo, visita?.id])

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

  const handleConfirmClick = async () => {
    if (isSubmitting) return
    const montoNum = parseCOPInputToNumber(montoPagoInput)
    if (tipo === 'PAGO') {
      const cuota = Number(montoCuotaEsperado || 0)
      const cuotaMostrada = getDisplayedCOPInteger(cuota)
      if (cuotaMostrada > 0 && !isSameDisplayedCOPAmount(montoNum, cuota)) {
        setErrorMsg(`Para un PAGO, el monto debe ser exactamente $${formatMilesCOP(cuotaMostrada)}. Para otros valores use ABONO.`)
        return
      }
    }

    if (tipo === 'ABONO' && montoNum < MONTO_MINIMO_ABONO_COP) {
      setErrorMsg(`El abono mínimo permitido es $${formatMilesCOP(MONTO_MINIMO_ABONO_COP)}.`)
      return
    }

    const saldoTotal = Number(visita?.saldoTotal || 0)
    if (saldoTotal > 0 && montoNum > saldoTotal + 1) {
      setErrorMsg(`El monto no puede exceder el saldo total del préstamo ($${formatMilesCOP(saldoTotal)})`)
      return
    }
    if (metodoPago === MetodoPago.TRANSFERENCIA && !numeroReferencia.trim()) {
      setErrorMsg('Ingrese la referencia bancaria de la transferencia.')
      return
    }
    setIsSubmitting(true)
    try {
      await onConfirm(montoNum, metodoPago, comprobanteTransferencia, {
        tipoRegistro: tipo,
        cuotaNumeroEsperada:
          cuotaNumeroEsperadaOverride ??
          (Number((visita)?.cuotaActual || 0) || undefined),
        montoCuotaEsperado,
        numeroReferencia:
          metodoPago === MetodoPago.TRANSFERENCIA ? numeroReferencia.trim() : undefined,
        notas:
          metodoPago === MetodoPago.TRANSFERENCIA
            ? notasTransferencia.trim() || undefined
            : undefined,
      })
    } catch (error) {
      console.error('Error al confirmar pago:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
        style={{ zIndex: MODAL_Z_INDEX }}
        // Un toque fuera de la tarjeta cerraba el modal con el monto escrito y el
        // comprobante ya adjunto: habia que volver a tomar la foto. Ahora el
        // fondo solo cierra si no hay nada que perder; la X siempre cierra.
        onClick={(evento) => alTocarElFondo(evento, hayDatosSinGuardar)}
      >
        <div
          ref={contenedorRef}
          className="flex max-h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 focus:outline-none sm:max-h-[90dvh] sm:rounded-2xl"
          {...propsDialogo}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
              <h3 className="text-xl font-bold text-slate-900">{tipo === 'ABONO' ? 'Registrar Abono' : 'Registrar Pago'}</h3>
              <Tooltip texto="Cerrar">
                <button 
                  onClick={onClose}
                  className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                  type="button"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </Tooltip>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-sm text-slate-500">Cliente</p>
                <p className="font-bold text-slate-900 text-lg">{visita.cliente}</p>
                <p className="text-xs text-slate-500 break-words">{visita.direccion}</p>
                <p className="text-xs text-slate-400">Cuota esperada: ${formatMilesCOP(montoCuotaEsperado)}</p>
              </div>

              <div>
                <FieldLabel required>Método de Pago</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodoPago(MetodoPago.EFECTIVO)}
                    className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                      metodoPago === MetodoPago.EFECTIVO
                        ? 'bg-[#08557f] text-white border-[#08557f]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    EFECTIVO
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPago(MetodoPago.TRANSFERENCIA)}
                    className={`py-3 rounded-xl border text-sm font-bold transition-colors ${
                      metodoPago === MetodoPago.TRANSFERENCIA
                        ? 'bg-[#08557f] text-white border-[#08557f]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    TRANSFERENCIA
                  </button>
                </div>
              </div>

              <div>
                <FieldLabel required>Monto Recibido</FieldLabel>
                {tipo === 'ABONO' && (
                  <p className="mb-2 text-xs font-bold text-slate-500">
                    Mínimo permitido: ${formatMilesCOP(MONTO_MINIMO_ABONO_COP)}
                  </p>
                )}
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={montoPagoInput}
                    onChange={tipo === 'ABONO' ? (e) => {
                      setMontoPagoInput(formatCOPInputValue(e.target.value))
                      setErrorMsg(null)
                    } : undefined}
                    readOnly={tipo === 'PAGO'}
                    className={`w-full pl-10 pr-4 py-4 border-2 rounded-xl focus:ring-0 font-bold text-2xl text-slate-900 placeholder:text-slate-300 ${tipo === 'PAGO' ? 'bg-slate-50 border-slate-100 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-[#08557f]'}`}
                    placeholder="0"
                    autoFocus={tipo === 'ABONO'}
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  {errorMsg}
                </div>
              )}
              {metodoPago === MetodoPago.TRANSFERENCIA && (
                <div className="space-y-4 pt-2">
                  <div>
                    <FieldLabel required>Referencia bancaria</FieldLabel>
                    <input
                      type="text"
                      value={numeroReferencia}
                      onChange={(event) => {
                        setNumeroReferencia(event.target.value)
                        setErrorMsg(null)
                      }}
                      maxLength={100}
                      autoComplete="off"
                      className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-[#08557f]"
                      placeholder="Ej: 84729103"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <FieldLabel>Nota para revisión</FieldLabel>
                      <AyudaContextual texto="Agrega información que ayude a verificar la transferencia, por ejemplo quién la realizó o una aclaración del comprobante." />
                    </div>
                    <textarea
                      value={notasTransferencia}
                      onChange={(event) => setNotasTransferencia(event.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full resize-none rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-[#08557f]"
                      placeholder="Ej: Transferencia realizada por un familiar del cliente"
                    />
                    <p className="mt-1 text-right text-[10px] font-bold text-slate-400">
                      {notasTransferencia.length}/500
                    </p>
                  </div>
                  <div>
                  <FieldLabel required>Comprobante</FieldLabel>
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
                        <p className="text-xs text-slate-500">Solo imágenes (JPG, PNG, WEBP). La foto debe ser clara.</p>
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
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full max-w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-black file:text-[#08557f] hover:file:bg-blue-100 transition-all cursor-pointer sm:file:mr-4 sm:file:px-4"
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
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={
                isSubmitting ||
                parseCOPInputToNumber(montoPagoInput) <= 0 ||
                (tipo === 'ABONO' && parseCOPInputToNumber(montoPagoInput) < MONTO_MINIMO_ABONO_COP) ||
                (metodoPago === MetodoPago.TRANSFERENCIA &&
                  (!comprobanteTransferencia || !numeroReferencia.trim()))
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#08557f] py-3.5 font-bold text-white shadow-lg shadow-[#08557f]/20 transition-all hover:bg-[#063a58] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 sm:py-4"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              {isSubmitting ? 'Procesando...' : (tipo === 'ABONO' ? 'Confirmar Abono' : 'Confirmar Pago')}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
