'use client'

/**
 * ============================================================================
 * PagoDetalleModal
 * ============================================================================
 * Modal dedicado para mostrar el detalle completo de un pago registrado.
 * Se activa desde NotificacionDetalleModal cuando la notificación es de
 * entidad='PAGO' (transferencia o efectivo).
 *
 * Paleta de colores del sistema:
 *  - Fondo principal:  blanco / bg-slate-50
 *  - Bordes:           border-slate-100 / border-slate-200
 *  - Texto principal:  text-slate-900 (negro intenso)
 *  - Etiquetas:        text-[10px] text-slate-400 uppercase font-black
 *  - Acento positivo:  emerald (capital, saldo pagado)
 *  - Acento advertencia: amber (interés)
 *  - Acento mora:      rose
 *  - Acento info:      blue-600 (etiquetas destacadas)
 *  - Header/footer:    bg-white con border-b / border-t border-slate-100
 *  - Botón primario:   bg-slate-900 text-white
 * ============================================================================
 */

import React, { useEffect, useState } from 'react'
import {
  X,
  CheckCircle2,
  FileImage,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Hash,
  Calendar,
  ReceiptText,
  Banknote,
  ArrowRight,
  Info,
  User,
  CreditCard,
  TrendingDown,
  TrendingUp,
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
    archivos?: any[]
  }
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Fila de dato clave-valor con el estilo del sistema */
const DataFila = ({
  label,
  value,
  bold,
}: {
  label: string
  value: React.ReactNode
  bold?: boolean
}) => (
  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide shrink-0 mr-3">
      {label}
    </span>
    <span className={`text-sm text-right ${bold ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
      {value}
    </span>
  </div>
)

/** Pequeño badge de método de pago */
const MetodoBadge = ({ metodo }: { metodo: string }) => {
  const esTransferencia = metodo === 'TRANSFERENCIA'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
        esTransferencia
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }`}
    >
      {esTransferencia ? <Banknote className="h-3 w-3" /> : <ReceiptText className="h-3 w-3" />}
      {esTransferencia ? 'Transferencia' : 'Efectivo'}
    </span>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PagoDetalleModal({
  isOpen,
  onClose,
  metadata,
}: PagoDetalleModalProps) {
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
    pagosService
      .obtenerPagoPorId(id)
      .then(data => setPago(data))
      .catch(err  => setError(err?.message || 'No se pudo cargar el pago'))
      .finally(()  => setLoading(false))
  }, [isOpen, metadata?.pagoId])

  const handleClose = () => {
    setPago(null)
    setError(null)
    setImgExpanded(false)
    onClose()
  }

  if (!isOpen) return null

  // ── Datos combinados: API primero, metadata como fallback ─────────────────
  const monto = pago?.montoTotal ?? metadata.monto ?? 0

  const computedCapital = (pago?.detalles ?? []).reduce((s: number, d: any) => s + Number(d.montoCapital || 0), 0)
  const computedInteres = (pago?.detalles ?? []).reduce((s: number, d: any) => s + Number(d.montoInteres || 0), 0)
  const computedCuotasAfectadas = (pago?.detalles ?? []).length

  const computedSaldoNuevo = pago?.prestamo?.saldoPendiente != null
    ? Number(pago.prestamo.saldoPendiente)
    : null
  const computedSaldoAnterior = computedSaldoNuevo != null
    ? computedSaldoNuevo + Number(monto || 0)
    : null
  const computedQuedoPagado = computedSaldoNuevo != null
    ? computedSaldoNuevo <= 0
    : false

  const capitalRec = metadata.capitalRecuperado != null
    ? metadata.capitalRecuperado
    : computedCapital
  const interesRec = metadata.interesRecuperado != null
    ? metadata.interesRecuperado
    : computedInteres
  const saldoAnterior = metadata.saldoAnterior != null
    ? metadata.saldoAnterior
    : (computedSaldoAnterior ?? 0)
  const saldoNuevo = metadata.saldoNuevo != null
    ? metadata.saldoNuevo
    : (computedSaldoNuevo ?? 0)
  const cuotasAfectadas = metadata.cuotasAfectadas != null
    ? metadata.cuotasAfectadas
    : computedCuotasAfectadas
  const quedoPagado = metadata.prestamoQuedaPagado != null
    ? metadata.prestamoQuedaPagado
    : computedQuedoPagado
  const metodoPago        = pago?.metodoPago ?? metadata.metodoPago ?? 'EFECTIVO'
  const esTransferencia   = metodoPago === 'TRANSFERENCIA'
  const numeroPago        = pago?.numeroPago ?? metadata.numeroPago       ?? '—'
  const numeroPrestamo    = pago?.prestamo?.numeroPrestamo ?? metadata.numeroPrestamo ?? '—'
  const clienteNombre     = pago?.cliente
    ? `${pago.cliente.nombres} ${pago.cliente.apellidos}`
    : (metadata.cliente ?? '—')
  const clienteDni        = pago?.cliente?.dni ?? metadata.clienteDni ?? '—'
  const cobrador          = pago?.cobrador
    ? `${pago.cobrador.nombres} ${pago.cobrador.apellidos}`
    : '—'
  const fechaPago         = pago?.fechaPago
    ? new Date(pago.fechaPago).toLocaleString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

  const comprobantes = (pago?.archivos ?? metadata.archivos ?? []).filter(
    a => a.tipoContenido === 'COMPROBANTE_TRANSFERENCIA'
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Portal>
      {/* Backdrop — mismo estilo que NotificacionDetalleModal */}
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      >
        {/* Panel — mismo estilo border-radius que el resto del sistema */}
        <div
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border shadow-sm ${
                esTransferencia
                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {esTransferencia
                  ? <Banknote className="h-5 w-5" />
                  : <ReceiptText className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">
                  Detalle del Pago
                </h3>
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                  <Hash className="h-3 w-3" />
                  {numeroPago} · {numeroPrestamo}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Contenido scrollable ─────────────────────────────────────────── */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">

            {/* Spinner de carga */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <RefreshCw className="h-7 w-7 text-slate-300 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Cargando detalle del pago...</p>
              </div>
            )}

            {/* Error no fatal (se siguen mostrando datos de la metadata) */}
            {error && !loading && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-amber-700">Datos parciales</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    No se pudo cargar el detalle completo (cuotas, cobrador). Se muestran los datos de la notificación.
                  </p>
                </div>
              </div>
            )}

            {/* ── 1. Monto principal ──────────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
              <div className="flex items-start justify-between mb-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Monto Pagado
                </label>
                <MetodoBadge metodo={metodoPago} />
              </div>
              <p className="text-4xl font-black text-slate-900 tabular-nums mb-3">
                {formatCurrency(monto)}
              </p>

              {quedoPagado && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wide">
                    ¡Préstamo saldado completamente!
                  </p>
                </div>
              )}
            </div>

            {/* ── 2. Descomposición capital / interés / saldo ─────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <TrendingDown className="h-4 w-4 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Descomposición del Pago
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Capital */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Capital</p>
                  <p className="text-xl font-black text-emerald-600">{formatCurrency(capitalRec)}</p>
                </div>
                {/* Interés */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Interés</p>
                  <p className="text-xl font-black text-amber-500">{formatCurrency(interesRec)}</p>
                </div>
              </div>

              {/* Saldo anterior → nuevo */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-2">Saldo del Préstamo</p>
                <div className="flex items-center gap-2 justify-between">
                  <div className="text-center">
                    <p className="text-[9px] text-slate-400 font-bold mb-0.5">Anterior</p>
                    <p className="text-base font-black text-slate-600">{formatCurrency(saldoAnterior)}</p>
                  </div>
                  <ArrowRight className={`h-4 w-4 shrink-0 ${quedoPagado ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <div className="text-center">
                    <p className="text-[9px] text-slate-400 font-bold mb-0.5">Nuevo</p>
                    <p className={`text-base font-black ${quedoPagado ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {formatCurrency(saldoNuevo)}
                    </p>
                  </div>
                </div>
              </div>

              {cuotasAfectadas > 0 && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <p className="text-[11px] text-slate-600 font-medium">
                    Aplicado a <strong>{cuotasAfectadas}</strong> cuota{cuotasAfectadas > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* ── 3. Ganancia / Utilidad ──────────────────────────────────────── */}
            {interesRec > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100 p-5">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-100">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Ganancia / Utilidad
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Interés Recaudado</p>
                    <p className="text-3xl font-black text-emerald-700 tabular-nums">{formatCurrency(interesRec)}</p>
                    <p className="text-[10px] text-emerald-500 font-medium mt-1">
                      {capitalRec > 0 ? `${((interesRec / (capitalRec + interesRec)) * 100).toFixed(1)}% del pago total` : ''}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                    <TrendingUp className="h-7 w-7 text-emerald-600" />
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. Datos del pago ───────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <Hash className="h-4 w-4 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Datos del Pago
                </p>
              </div>
              <DataFila label="N° Pago"     value={numeroPago}     bold />
              <DataFila label="N° Préstamo" value={numeroPrestamo} />
              <DataFila label="Método"      value={<MetodoBadge metodo={metodoPago} />} />
              {esTransferencia && (pago?.numeroReferencia || metadata.numeroReferencia) && (
                <DataFila
                  label="N° Referencia"
                  value={pago?.numeroReferencia || metadata.numeroReferencia || '—'}
                />
              )}
              <DataFila
                label="Fecha"
                value={
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {fechaPago}
                  </span>
                }
              />
              <DataFila label="Cobrador" value={cobrador} />
            </div>

            {/* ── 5. Cliente ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <User className="h-4 w-4 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Cliente
                </p>
              </div>
              <DataFila label="Nombre" value={clienteNombre} bold />
              <DataFila label="CC"     value={clienteDni} />
            </div>

            {/* ── 6. Detalle por cuotas (solo si disponible desde API) ─────────── */}
            {pago?.detalles && pago.detalles.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Cuotas Afectadas ({pago.detalles.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {pago.detalles.map((det, idx) => (
                    <div
                      key={det.id || idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                    >
                      <span className="font-black text-slate-700">Cuota {idx + 1}</span>
                      <div className="flex gap-4">
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400">Capital</p>
                          <p className="font-bold text-emerald-600">{formatCurrency(det.montoCapital)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400">Interés</p>
                          <p className="font-bold text-amber-500">{formatCurrency(det.montoInteres)}</p>
                        </div>
                        {det.montoInteresMora > 0 && (
                          <div className="text-right">
                            <p className="text-[9px] text-slate-400">Mora</p>
                            <p className="font-bold text-rose-500">{formatCurrency(det.montoInteresMora)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 7. Comprobante de transferencia ─────────────────────────────── */}
            {esTransferencia && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-slate-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Comprobante
                    </p>
                  </div>
                  {loading && <RefreshCw className="h-3.5 w-3.5 text-slate-300 animate-spin" />}
                </div>

                {/* Esperando carga */}
                {loading && (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 text-slate-300 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">Cargando...</p>
                  </div>
                )}

                {/* Sin comprobante */}
                {!loading && comprobantes.length === 0 && (
                  <div className="text-center py-6">
                    <FileImage className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">
                      {metadata.tieneComprobante
                        ? 'El comprobante aún se está procesando'
                        : 'No se adjuntó comprobante para este pago'}
                    </p>
                  </div>
                )}

                {/* Comprobante(s) */}
                {comprobantes.length > 0 && (
                  <div className="space-y-3">
                    {comprobantes.map((archivo, idx) => {
                      const url     = archivo.url || archivo.ruta || ''
                      const fullUrl = resolveMediaUrl(url)
                      const mime    = (archivo.tipoArchivo || '').toLowerCase()
                      const ext     = (fullUrl.split('.').pop() || '').toLowerCase()
                      const isImage = mime.startsWith('image/') || /(jpg|jpeg|png|gif|webp)$/i.test(ext)

                      return (
                        <div
                          key={archivo.id || idx}
                          className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50"
                        >
                          {/* Cabecera */}
                          <div className="px-4 py-2.5 flex items-center justify-between bg-white border-b border-slate-100">
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
                              Abrir
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

                          {/* Archivo genérico (si no es imagen, se muestra link) */}
                          {!isImage && (
                            <div className="p-6 flex flex-col items-center gap-3">
                               <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
                                <FileImage className="h-7 w-7 text-slate-400" />
                              </div>
                              <p className="text-xs text-slate-500 font-medium text-center break-all">
                                {archivo.nombreOriginal || 'Archivo adjunto'}
                              </p>
                              <a
                                href={fullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                              >
                                Descargar / Ver
                              </a>
                            </div>
                          )}

                          {/* Metadata del archivo */}
                          <div className="px-4 py-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400">
                            <span>
                              {archivo.tamanoBytes > 0
                                ? `${(archivo.tamanoBytes / 1024).toFixed(0)} KB`
                                : ''}
                            </span>
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

          {/* ── Footer — mismo estilo que NotificacionDetalleModal ───────────── */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 sticky bottom-0 z-10">
            <button
              onClick={handleClose}
              className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all shadow-sm"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      </div>

      {/* ── Lightbox de imagen expandida ──────────────────────────────────────── */}
      {imgExpanded && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setImgExpanded(false)}
        >
          <img
            src={expandedUrl}
            alt="Comprobante ampliado"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
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
