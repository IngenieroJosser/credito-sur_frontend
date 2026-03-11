'use client'

/**
 * ============================================================================
 * PagoDetalleModal
 * ============================================================================
 * Modal dedicado para mostrar el detalle completo de un pago registrado.
 * Se activa desde NotificacionDetalleModal cuando la notificación es de tipo
 * entidad='PAGO' (transferencia o efectivo).
 *
 * Muestra:
 *  - Resumen financiero (monto, capital, interés, saldo anterior/nuevo)
 *  - Datos del cliente y del préstamo
 *  - Método de pago con número de referencia si aplica
 *  - Cuotas afectadas y si el préstamo quedó saldado
 *  - Comprobante de transferencia con vista previa (imagen / PDF)
 * ============================================================================
 */

import React, { useEffect, useState } from 'react'
import {
  X,
  Banknote,
  CreditCard,
  User,
  TrendingDown,
  CheckCircle2,
  FileImage,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Hash,
  Calendar,
  ReceiptText,
  ArrowDownRight,
  ArrowUpRight,
  Info,
} from 'lucide-react'
import { Portal } from '@/components/dashboards/shared/CobradorElements'
import { formatCurrency, resolveMediaUrl } from '@/lib/utils'
import { pagosService, Pago } from '@/services/pagos-service'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PagoDetalleModalProps {
  isOpen: boolean
  onClose: () => void
  /** metadata de la notificación de pago */
  metadata: {
    pagoId?: string
    numeroPago?: string
    numeroPrestamo?: string
    prestamoId?: string
    metodoPago?: string
    numeroReferencia?: string | null
    tieneComprobante?: boolean
    cliente?: string
    clienteId?: string
    clienteDni?: string | null
    monto?: number
    capitalRecuperado?: number
    interesRecuperado?: number
    saldoNuevo?: number
    saldoAnterior?: number
    prestamoQuedaPagado?: boolean
    cuotasAfectadas?: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Badge = ({ label, color }: { label: string; color: 'blue' | 'green' | 'amber' | 'rose' }) => {
  const cls = {
    blue:  'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    rose:  'bg-rose-100 text-rose-700 border-rose-200',
  }[color]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${cls}`}>
      {label}
    </span>
  )
}

const DataFila = ({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) => (
  <div className={`flex justify-between items-center py-2 border-b border-slate-100 last:border-0 ${accent ? 'font-black text-slate-900' : ''}`}>
    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wide">{label}</span>
    <span className={`text-sm ${accent ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>{value}</span>
  </div>
)

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PagoDetalleModal({ isOpen, onClose, metadata }: PagoDetalleModalProps) {
  const [pago, setPago]               = useState<Pago | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [imgExpanded, setImgExpanded] = useState(false)
  const [expandedUrl, setExpandedUrl] = useState('')

  // ── Cargar detalle completo del pago ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const id = metadata?.pagoId
    if (!id) return

    setLoading(true)
    setError(null)
    pagosService.obtenerPagoPorId(id)
      .then(data => setPago(data))
      .catch(err  => setError(err?.message || 'No se pudo cargar el pago'))
      .finally(()  => setLoading(false))
  }, [isOpen, metadata?.pagoId])

  // ── Limpiar al cerrar ─────────────────────────────────────────────────────
  const handleClose = () => {
    setPago(null)
    setError(null)
    setImgExpanded(false)
    onClose()
  }

  if (!isOpen) return null

  // ── Datos combinados: primero el detail real, luego el metadata como fallback
  const monto            = pago?.montoTotal            ?? metadata.monto            ?? 0
  const capitalRec       = metadata.capitalRecuperado  ?? 0
  const interesRec       = metadata.interesRecuperado  ?? 0
  const saldoAnterior    = metadata.saldoAnterior      ?? 0
  const saldoNuevo       = metadata.saldoNuevo         ?? 0
  const cuotasAfectadas  = metadata.cuotasAfectadas    ?? 0
  const quedoPagado      = metadata.prestamoQuedaPagado ?? false
  const metodoPago       = pago?.metodoPago            ?? metadata.metodoPago ?? 'EFECTIVO'
  const esTransferencia  = metodoPago === 'TRANSFERENCIA'
  const numeroPago       = pago?.numeroPago            ?? metadata.numeroPago       ?? '—'
  const numeroPrestamo   = pago?.prestamo?.numeroPrestamo ?? metadata.numeroPrestamo ?? '—'
  const clienteNombre    = pago?.cliente
    ? `${pago.cliente.nombres} ${pago.cliente.apellidos}`
    : (metadata.cliente ?? '—')
  const clienteDni       = pago?.cliente?.dni ?? metadata.clienteDni ?? '—'
  const cobrador         = pago?.cobrador
    ? `${pago.cobrador.nombres} ${pago.cobrador.apellidos}`
    : '—'
  const fechaPago        = pago?.fechaPago
    ? new Date(pago.fechaPago).toLocaleString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

  const comprobantes = (pago?.archivos ?? []).filter(
    a => a.tipoContenido === 'COMPROBANTE_TRANSFERENCIA'
  )

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      >
        {/* Panel */}
        <div
          className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${esTransferencia ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                {esTransferencia
                  ? <Banknote className="h-5 w-5 text-blue-600" />
                  : <ReceiptText className="h-5 w-5 text-emerald-600" />}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Detalle del Pago
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  {numeroPago} · {numeroPrestamo}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <RefreshCw className="h-7 w-7 text-blue-400 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Cargando detalle del pago...</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-amber-700">No se pudo cargar el detalle completo</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">{error}</p>
                  <p className="text-[11px] text-amber-600 mt-1">Se muestran los datos disponibles de la notificación.</p>
                </div>
              </div>
            )}

            {/* ── 1. Monto principal ─────────────────────────────────────── */}
            <div className={`rounded-2xl p-5 border ${esTransferencia ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-[10px] font-black uppercase tracking-widest ${esTransferencia ? 'text-blue-600' : 'text-emerald-600'}`}>
                  Monto Pagado
                </p>
                <Badge
                  label={esTransferencia ? 'Transferencia' : 'Efectivo'}
                  color={esTransferencia ? 'blue' : 'green'}
                />
              </div>
              <p className="text-4xl font-black text-slate-900 tabular-nums">
                {formatCurrency(monto)}
              </p>

              {quedoPagado && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-emerald-100 rounded-xl">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wide">
                    ¡Préstamo saldado completamente con este pago!
                  </p>
                </div>
              )}
            </div>

            {/* ── 2. Descomposición del pago ─────────────────────────────── */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                <TrendingDown className="h-4 w-4 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Descomposición del Pago</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Capital Recuperado</p>
                  <p className="text-lg font-black text-emerald-700">{formatCurrency(capitalRec)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Interés Recuperado</p>
                  <p className="text-lg font-black text-amber-600">{formatCurrency(interesRec)}</p>
                </div>
                <div className="col-span-2 bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-black uppercase mb-2">Saldo del Préstamo</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                      <span className="text-xs text-slate-500 font-bold">Anterior</span>
                      <span className="text-sm font-black text-slate-700">{formatCurrency(saldoAnterior)}</span>
                    </div>
                    <div className="h-px flex-1 mx-3 bg-slate-200" />
                    <div className="flex items-center gap-1.5">
                      <ArrowDownRight className={`h-4 w-4 ${quedoPagado ? 'text-emerald-500' : 'text-blue-500'}`} />
                      <span className="text-xs font-bold text-slate-500">Nuevo</span>
                      <span className={`text-sm font-black ${quedoPagado ? 'text-emerald-700' : 'text-blue-700'}`}>
                        {formatCurrency(saldoNuevo)}
                      </span>
                    </div>
                  </div>
                </div>
                {cuotasAfectadas > 0 && (
                  <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100">
                    <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <p className="text-[11px] text-slate-600 font-medium">
                      Pago aplicado a <strong>{cuotasAfectadas}</strong> cuota{cuotasAfectadas > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── 3. Datos del pago ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                <Hash className="h-4 w-4 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Datos del Pago</p>
              </div>
              <DataFila label="N° Pago"      value={numeroPago} accent />
              <DataFila label="N° Préstamo"  value={numeroPrestamo} />
              <DataFila label="Método"       value={
                <Badge label={esTransferencia ? 'Transferencia' : 'Efectivo'} color={esTransferencia ? 'blue' : 'green'} />
              } />
              {esTransferencia && (pago?.numeroReferencia || metadata.numeroReferencia) && (
                <DataFila
                  label="N° Referencia"
                  value={pago?.numeroReferencia || metadata.numeroReferencia || '—'}
                />
              )}
              <DataFila label="Fecha"  value={
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {fechaPago}
                </span>
              } />
              <DataFila label="Cobrador" value={cobrador} />
            </div>

            {/* ── 4. Datos del cliente ───────────────────────────────────── */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                <User className="h-4 w-4 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cliente</p>
              </div>
              <DataFila label="Nombre"  value={clienteNombre} accent />
              <DataFila label="CC"      value={clienteDni} />
            </div>

            {/* ── 5. Cuotas afectadas (detalle si disponible) ────────────── */}
            {pago?.detalles && pago.detalles.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Cuotas Afectadas ({pago.detalles.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {pago.detalles.map((det, idx) => (
                    <div key={det.id || idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                      <span className="font-black text-slate-700">Cuota {idx + 1}</span>
                      <div className="flex gap-4 text-right">
                        <div>
                          <span className="text-[9px] text-slate-400 block">Capital</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(det.montoCapital)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">Interés</span>
                          <span className="font-bold text-amber-600">{formatCurrency(det.montoInteres)}</span>
                        </div>
                        {det.montoInteresMora > 0 && (
                          <div>
                            <span className="text-[9px] text-slate-400 block">Mora</span>
                            <span className="font-bold text-rose-600">{formatCurrency(det.montoInteresMora)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 6. Comprobante de transferencia ───────────────────────── */}
            {esTransferencia && (
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-slate-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Comprobante de Transferencia
                    </p>
                  </div>
                  {loading && <RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin" />}
                </div>

                {/* Sin comprobante */}
                {!loading && comprobantes.length === 0 && (
                  <div className="text-center py-6">
                    <FileImage className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">
                      {metadata.tieneComprobante
                        ? 'El comprobante aún se está procesando en el servidor'
                        : 'No se adjuntó comprobante para este pago'}
                    </p>
                  </div>
                )}

                {/* Con comprobante(s) */}
                {comprobantes.length > 0 && (
                  <div className="space-y-3">
                    {comprobantes.map((archivo, idx) => {
                      const url     = archivo.url || archivo.ruta || ''
                      const fullUrl = resolveMediaUrl(url)
                      const mime    = (archivo.tipoArchivo || '').toLowerCase()
                      const ext     = (fullUrl.split('.').pop() || '').toLowerCase()
                      const isImage = mime.startsWith('image/') || /(jpg|jpeg|png|gif|webp)$/i.test(ext)
                      const isPdf   = mime === 'application/pdf' || ext === 'pdf'

                      return (
                        <div key={archivo.id || idx} className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                          {/* Cabecera archivo */}
                          <div className="px-4 py-2.5 flex items-center justify-between bg-slate-50 border-b border-slate-100">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">
                              {archivo.nombreOriginal || 'Comprobante'}
                            </span>
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Abrir original
                            </a>
                          </div>

                          {/* Vista previa imagen */}
                          {isImage && (
                            <button
                              onClick={() => { setExpandedUrl(fullUrl); setImgExpanded(true) }}
                              className="w-full"
                            >
                              <img
                                src={fullUrl}
                                alt={archivo.nombreOriginal || 'Comprobante'}
                                className="w-full max-h-72 object-contain bg-slate-100 hover:opacity-90 transition-opacity cursor-zoom-in"
                              />
                            </button>
                          )}

                          {/* Vista previa PDF */}
                          {isPdf && (
                            <div className="flex flex-col items-center gap-3 p-6">
                              <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100">
                                <FileImage className="h-8 w-8 text-rose-400" />
                              </div>
                              <p className="text-xs text-slate-500 font-medium text-center">
                                {archivo.nombreOriginal || 'comprobante.pdf'}
                              </p>
                              <a
                                href={fullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
                              >
                                Ver PDF
                              </a>
                            </div>
                          )}

                          {!isImage && !isPdf && (
                            <div className="p-4 text-xs text-slate-500 break-all">{url}</div>
                          )}

                          {/* Footer con metadata */}
                          <div className="px-4 py-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400">
                            <span>{archivo.tamanoBytes > 0 ? `${(archivo.tamanoBytes / 1024).toFixed(0)} KB` : ''}</span>
                            <span>
                              {new Date(archivo.creadoEn).toLocaleString('es-CO', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              onClick={handleClose}
              className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all shadow-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* ── Lightbox imagen expandida ──────────────────────────────────────── */}
      {imgExpanded && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setImgExpanded(false)}
        >
          <img
            src={expandedUrl}
            alt="Comprobante ampliado"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setImgExpanded(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
      )}
    </Portal>
  )
}
