'use client'

import React, { useState, useRef } from 'react'
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Info, 
  AlertTriangle, 
  User, 
  Phone, 
  CreditCard, 
  Receipt, 
  DollarSign,
  Briefcase,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react'
import { Portal } from '@/components/dashboards/shared/CobradorElements'
import { formatCOPInputValue, formatCurrency, formatLoanTerm, formatMilesCOP, parseCOPInputToNumber, resolveMediaUrl } from '@/lib/utils'
import { getBogotaDateKey, normalizeDateKey } from '@/lib/rutas-core'
import { notificacionesService } from '@/services/notificaciones-service'
import { prestamosService } from '@/services/prestamos-service'
import { aprobacionesService } from '@/services/aprobaciones-service'
import { articulosService } from '@/services/articulos-service'
import ConfirmApproveModal from '@/components/ui/ConfirmApproveModal'
import ConfirmRejectModal from '@/components/ui/ConfirmRejectModal'
import PagoDetalleModal from '@/components/dashboards/shared/PagoDetalleModal'
import CierreRutaNotifModal from '@/components/dashboards/shared/CierreRutaNotifModal'
import PagoRegularizadoNotifModal from '@/components/dashboards/shared/PagoRegularizadoNotifModal'

export interface NotificacionDetalleModalProps {
  isOpen: boolean
  onClose: () => void
  notificacion: any
  onApprove: (id: string, type: string, editedDetails: any) => Promise<void>
  onReject: (id: string, type: string, reason: string) => Promise<void>
  canApprove?: boolean
}

export default function NotificacionDetalleModal({ 
  isOpen, 
  onClose, 
  notificacion, 
  onApprove, 
  onReject,
  canApprove = true 
}: NotificacionDetalleModalProps) {
  // Helpers para normalizar datos de la notificación
  const safeJsonParse = (value: any) => {
    if (!value) return {}
    if (typeof value === 'object') return value
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }

  const pickNumber = (...values: any[]) => {
    for (const value of values) {
      const n = Number(value)
      if (Number.isFinite(n) && n > 0) return n
    }
    return 0
  }

  const pickString = (...values: any[]) => {
    for (const value of values) {
      const str = String(value ?? '').trim()
      if (str && str !== 'N/A' && str !== 'undefined' && str !== 'null') return str
    }
    return ''
  }

  const scalarText = (value: any, fallback = 'No disponible') => {
    if (Array.isArray(value)) return String(value.length)
    if (value && typeof value === 'object') return fallback
    const str = String(value ?? '').trim()
    return str && str !== 'undefined' && str !== 'null' ? str : fallback
  }

  const countValue = (value: any) => {
    if (Array.isArray(value)) return value.length
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }

  const listItemText = (value: any) => {
    if (typeof value === 'string') return value
    if (!value || typeof value !== 'object') return String(value ?? '')
    return (
      value.mensaje ||
      value.descripcion ||
      value.nombreCliente ||
      value.nombre ||
      'Registro sin detalle'
    )
  }

  const cierrePendienteLabel = (tipoCierre: any) => {
    const tipo = scalarText(tipoCierre, '')
    const labels: Record<string, string> = {
      ADMINISTRATIVO_CON_OBSERVACION: 'Cierre administrativo con observación',
      REGULARIZACION_LIMPIA: 'Regularización limpia',
    }
    return labels[tipo] || tipo || 'No disponible'
  }

  const [isEditingMode, setIsEditingMode] = useState(false)
  const [editedDetails, setEditedDetails] = useState<any>(notificacion?.detalles || {})
  const [actionComment, setActionComment] = useState('')
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [articuloData, setArticuloData] = React.useState<any>(null)
  const [planIndex, setPlanIndex] = React.useState<number | null>(null)
  const [autoCuotas, setAutoCuotas] = useState(true)
  const [esContado, setEsContado] = useState(false)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)
  // Estado del modal de detalle de pago (componente separado)
  const [showPagoDetalle, setShowPagoDetalle] = useState(false)

  const formatFechaHora = (raw: any, fallback = '—') => {
    if (!raw || raw === 'N/A' || raw === '—') return fallback
    try {
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return String(raw)
      return d.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return fallback
    }
  }

  React.useEffect(() => {
    if (notificacion) {
      const meta = safeJsonParse(notificacion.metadata)
      const dets = safeJsonParse(notificacion.detalles)

      const datosSolicitud = safeJsonParse(
        notificacion.datosSolicitud ||
        meta.datosSolicitud ||
        dets.datosSolicitud ||
        notificacion.aprobacion?.datosSolicitud
      )

      const metaDetalles = safeJsonParse(meta.detalles)
      const detsDetalles = safeJsonParse(dets.detalles)

      const combined = {
        ...meta,
        ...metaDetalles,
        ...dets,
        ...detsDetalles,
        ...datosSolicitud,
      }

      const tipoPrestamo = String(
        combined.tipoPrestamo ||
        combined.tipo ||
        ''
      ).toUpperCase()

      const isArticuloSolicitud = tipoPrestamo === 'ARTICULO'

      const montoBase = pickNumber(
        combined.monto,
        combined.montoSolicitud,
        !isArticuloSolicitud ? combined.valorArticulo : 0,
        combined.capitalSolicitado,
      )

      const valorArticuloBase = pickNumber(
        combined.valorArticulo,
        combined.precioArticuloTotal,
        combined.montoSolicitud,
        combined.monto,
      )

      const cuotaInicialBase = pickNumber(combined.cuotaInicial)

      const montoFinanciado = isArticuloSolicitud
        ? Math.max(0, valorArticuloBase - cuotaInicialBase)
        : montoBase

      const tasaBase = Number(
        combined.tasaInteres ??
        combined.porcentaje ??
        0
      )

      const cuotasBase = pickNumber(
        combined.cantidadCuotas,
        combined.cuotas,
        combined.numCuotas,
        combined.totalCuotas,
      )

      const plazoBase = Number(
        combined.plazoMeses ??
        combined.plazo ??
        1
      )

      const interesTotalBase = pickNumber(combined.interesTotal)

      const montoTotalBase = pickNumber(
        combined.montoTotal,
        combined.totalPagar,
        combined.totalAPagar,
        isArticuloSolicitud
          ? valorArticuloBase
          : montoFinanciado + (interesTotalBase > 0
              ? interesTotalBase
              : (montoFinanciado * tasaBase * Math.max(1, plazoBase)) / 100
            ),
      )

      const initialVal = {
        ...combined,

        cliente: pickString(
          combined.cliente,
          combined.nombreCliente,
          combined.clienteNombre,
          combined.nombreCompleto,
        ),

        cedula: pickString(
          combined.cedula,
          combined.dni,
          combined.documento,
          combined.clienteDni,
        ),

        telefono: pickString(
          combined.telefono,
          combined.phone,
          combined.celular,
          combined.clienteTelefono,
        ),

        tipoPrestamo,
        monto: montoFinanciado,
        valorArticulo: valorArticuloBase || montoFinanciado,
        cuotaInicial: cuotaInicialBase,
        montoTotal: montoTotalBase,
        interesTotal: interesTotalBase,
        tasaInteres: tasaBase,
        porcentaje: tasaBase,
        plazoMeses: plazoBase,
        cuotas: cuotasBase,
        cantidadCuotas: cuotasBase,
        numCuotas: cuotasBase,
        frecuenciaPago: combined.frecuenciaPago || combined.frecuencia || 'DIARIO',
        fechaInicio: combined.fechaInicio || combined.fecha || '',
        tipoAmortizacion: combined.tipoAmortizacion || 'INTERES_SIMPLE',
        articulo: combined.articulo || combined.articuloNombre || '',
        notas: combined.notas || combined.observaciones || combined.comentarios || '',
        garantia: String(combined.garantia ?? ''),
      }
      
      const isPrestamoEff = (notificacion?.tipo === 'PRESTAMO' || (notificacion as any)?.approvalType === 'NUEVO_PRESTAMO')
      const isArticleEff = isPrestamoEff && (
        combined.tipo === 'ARTICULO' ||
        combined.tipoPrestamo === 'ARTICULO'
      )

      let initialEsContado = false
      if (isArticleEff) {
        // PRIORIDAD 1: Flag explícito del backend (incluso false debe respetarse)
        const ventaFlag = (combined as any).esContado ?? (combined as any).ventaContado
        
        if (ventaFlag !== undefined && ventaFlag !== null) {
          initialEsContado = !!ventaFlag
        } else {
          // PRIORIDAD 2: Deducción por valores (solo si no hay flag explícito)
          const cuotasRaw = Number(combined.cantidadCuotas || combined.cuotas || combined.numCuotas || 0)
          const mesesRaw = Number(combined.plazoMeses || combined.plajeMeses || 0)
          const porcentajeRaw = Number(combined.porcentaje ?? 0)
          
          // Si hay más de 1 cuota, definitivamente NO es de contado
          if (cuotasRaw > 1) {
            initialEsContado = false
          } else {
            const notasRaw = String((combined.notas || combined.garantia || '') ?? '').toLowerCase()
            if (notasRaw.includes('venta de contado') || notasRaw.includes('venta de artículo de contado') || notasRaw.includes('venta de articulo de contado')) {
              initialEsContado = true
            } else if (!isNaN(cuotasRaw) && !isNaN(mesesRaw) && cuotasRaw <= 1 && mesesRaw <= 1 && porcentajeRaw === 0) {
              initialEsContado = true
            }
          }
        }
      }

      setEditedDetails({
        ...initialVal,
        esContado: initialEsContado ? true : undefined,
      })
      setEsContado(initialEsContado)
    }
  }, [notificacion])


  React.useEffect(() => {
    if (isOpen && notificacion?.entidadId) {
      const fetchHistory = async () => {
        setIsLoadingHistory(true)
        try {
          // Determinar tabla de referencia
          let tabla = 'Aprobacion'
          if (notificacion.tipo === 'PRESTAMO') tabla = 'Prestamo'
          else if (notificacion.tipo === 'GASTO') tabla = 'Gasto'
          else if (notificacion.tipo === 'SOLICITUD_DINERO') tabla = 'Caja'
          
          const data = await aprobacionesService.getHistorial(notificacion.entidadId, tabla)
          setHistory(data)
        } catch (error) {
          console.error('Error fetching history:', error)
        } finally {
          setIsLoadingHistory(false)
        }
      }
      fetchHistory()
    }
  }, [isOpen, notificacion?.entidadId, notificacion?.tipo])

  React.useEffect(() => {
    if (!isOpen) return
    const meta = typeof notificacion?.metadata === 'string'
      ? JSON.parse(notificacion!.metadata as any)
      : (notificacion?.metadata || {})
    const dets = typeof notificacion?.detalles === 'string'
      ? JSON.parse(notificacion!.detalles as any)
      : (notificacion?.detalles || {})
    const isPrestamoEff = (notificacion?.tipo === 'PRESTAMO' || (notificacion as any)?.approvalType === 'NUEVO_PRESTAMO')
    const tituloEff = (notificacion?.titulo || '').toLowerCase()
    const mensajeEff = (notificacion?.mensaje || '').toLowerCase()
    const isArticleEff = isPrestamoEff && (
      dets?.tipo === 'ARTICULO' ||
      meta?.tipo === 'ARTICULO'
    )
    if (!isArticleEff) return
    const nombre = dets?.articulo || meta?.articulo || ''
    if (!nombre) return
    ;(async () => {
      try {
        const lista = await articulosService.obtenerArticulos()
        const match = lista.find((a: any) => (a?.nombre || '').toLowerCase() === nombre.toLowerCase())
        setArticuloData(match || null)
        if (match) {
          const idx = match.opcionesCuotas.findIndex(
            (op: any) => Number(op?.numeroCuotas) === Number(dets?.plazoMeses || meta?.plazoMeses || 0),
          )
          setPlanIndex(idx >= 0 ? idx : null)
        }
      } catch {}
    })()
  }, [isOpen, notificacion, editedDetails?.plazoMeses])

  React.useEffect(() => {
    // Solo recalcular valorArticulo/monto si el usuario está editando activamente.
    // Al abrir el modal, NO sobreescribir los valores que ya vienen del backend.
    if (!isEditingMode) return
    const meta = typeof notificacion?.metadata === 'string'
      ? JSON.parse(notificacion!.metadata as any)
      : (notificacion?.metadata || {})
    const dets = typeof notificacion?.detalles === 'string'
      ? JSON.parse(notificacion!.detalles as any)
      : (notificacion?.detalles || {})
    const isPrestamoEff = (notificacion?.tipo === 'PRESTAMO' || (notificacion as any)?.approvalType === 'NUEVO_PRESTAMO')
    const tituloEff = (notificacion?.titulo || '').toLowerCase()
    const mensajeEff = (notificacion?.mensaje || '').toLowerCase()
    const isArticleEff = isPrestamoEff && (
      dets?.tipo === 'ARTICULO' ||
      meta?.tipo === 'ARTICULO'
    )
    if (!isArticleEff) return
    if (!articuloData) return
    if (esContado) return
    const meses = Number(editedDetails?.plazoMeses || dets?.plazoMeses || meta?.plazoMeses || 0)
    const matchIdx = articuloData.opcionesCuotas?.findIndex((op: any) => Number(op.numeroCuotas) === meses) ?? -1
    const idx = planIndex ?? (matchIdx >= 0 ? matchIdx : null)
    if (idx === null || idx < 0) return
    const op = articuloData.opcionesCuotas[idx]
    const precioTotal = Number(op?.precioTotal || 0)
    const inicial = Number(editedDetails?.cuotaInicial || dets?.cuotaInicial || meta?.cuotaInicial || 0)
    const aFinanciar = Math.max(0, precioTotal - inicial)
    if (precioTotal > 0) {
      setEditedDetails((prev: any) => ({
        ...prev,
        valorArticulo: precioTotal,
        monto: aFinanciar
      }))
    }
  }, [articuloData, planIndex, esContado, isEditingMode])

  React.useEffect(() => {
    // Este efecto solo recalcula cuotas cuando el usuario está editando activamente.
    // Si el modal acaba de abrirse y el usuario no ha editado nada, no sobreescribimos.
    if (!isEditingMode || !autoCuotas) return
    const meta = typeof notificacion?.metadata === 'string'
      ? JSON.parse(notificacion!.metadata as any)
      : (notificacion?.metadata || {})
    const dets = typeof notificacion?.detalles === 'string'
      ? JSON.parse(notificacion!.detalles as any)
      : (notificacion?.detalles || {})
    const isPrestamoEff = (notificacion?.tipo === 'PRESTAMO' || (notificacion as any)?.approvalType === 'NUEVO_PRESTAMO')
    const tituloEff = (notificacion?.titulo || '').toLowerCase()
    const mensajeEff = (notificacion?.mensaje || '').toLowerCase()
    const isArticleEff = isPrestamoEff && (
      dets?.tipo === 'ARTICULO' ||
      meta?.tipo === 'ARTICULO'
    )
    if (!isArticleEff) return
    const meses = Number(editedDetails?.plazoMeses || 0)
    const freq = editedDetails?.frecuenciaPago || 'DIARIO'
    let c = 0
    if (meses > 0) {
      if (freq === 'DIARIO') c = Math.ceil(meses * 30)
      else if (freq === 'SEMANAL') c = Math.ceil(meses * 4)
      else if (freq === 'QUINCENAL') c = Math.ceil(meses * 2)
      else if (freq === 'MENSUAL') c = Math.ceil(meses)
      else c = Math.ceil(meses * 4)
    }
    if (c > 0) {
      setEditedDetails((prev: any) => ({ ...prev, cuotas: c }))
    }
  }, [editedDetails?.plazoMeses, editedDetails?.frecuenciaPago, isEditingMode])

  if (!isOpen || !notificacion) return null

  const meta = safeJsonParse(notificacion.metadata)

  // ── Detección de notificaciones de Cierre de Ruta (modal especializado) ──
  const esCierreRuta = (
    (notificacion.titulo || '').toLowerCase().includes('cierre de ruta') ||
    (notificacion.titulo || '').toLowerCase().includes('ruta completo') ||
    (notificacion.titulo || '').toLowerCase().includes('ruta completada')
  )
  if (esCierreRuta) {
    return (
      <CierreRutaNotifModal
        isOpen={isOpen}
        onClose={onClose}
        notificacion={notificacion}
      />
    )
  }

  // ── Detección de Pago Regularizado (modal especializado) ──
  const esPagoRegularizado =
    meta.tipoEvento === 'PAGO_REGULARIZADO' ||
    String(notificacion.titulo || '').toLowerCase().includes('pago regularizado')
  if (esPagoRegularizado) {
    return (
      <PagoRegularizadoNotifModal
        isOpen={isOpen}
        onClose={onClose}
        notificacion={notificacion}
      />
    )
  }

  // ── Detección de notificaciones de Jornada Pendiente Cerrada (modal especializado) ──
  const esJornadaPendienteCerrada =
    meta.tipoEvento === 'JORNADA_PENDIENTE_CERRADA' ||
    (notificacion.titulo || '').toLowerCase().includes('jornada cerrada') ||
    (notificacion.titulo || '').toLowerCase().includes('jornada pendiente regularizada')
  if (esJornadaPendienteCerrada) {
    if (!isOpen || !notificacion) return null
    // Componentes auxiliares
    const Metric = ({ label, value }: { label: string; value: any }) => (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
        <p className="mt-1 text-lg font-black text-slate-900">{countValue(value)}</p>
      </div>
    )

    const MetricMoney = ({ label, value }: { label: string; value: any }) => (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
        <p className="mt-1 text-lg font-black text-slate-900">{formatCurrency(Number(value || 0))}</p>
      </div>
    )

    return (
      <Portal>
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
          style={{ zIndex: 9999 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <div className="flex flex-col bg-white rounded-2xl max-h-[90vh] w-[95vw] max-w-3xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {notificacion.titulo}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {formatFechaHora(notificacion.creadoEn, '')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <p className="mb-6 text-sm font-semibold text-slate-700 whitespace-pre-wrap">
                {notificacion.mensaje}
              </p>

              <div className="space-y-4">
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-black text-slate-900">
                    Detalle de la jornada
                  </h4>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Ruta</span>
                      <p className="font-semibold text-slate-900">
                        {scalarText(meta.rutaNombre)}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500">Fecha operativa</span>
                      <p className="font-semibold text-slate-900">
                        {scalarText(meta.fechaOperativa)}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500">Tipo de cierre</span>
                      <p className="font-semibold text-slate-900">
                        {cierrePendienteLabel(meta.tipoCierre)}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500">Cerrada por</span>
                      <p className="font-semibold text-slate-900">
                        {scalarText(meta.cerradaPorNombre)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-black text-slate-900">
                    Resumen operativo
                  </h4>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Metric label="Clientes" value={meta.totalClientes} />
                    <Metric label="Pagaron" value={meta.clientesPagaron} />
                    <Metric label="Ausentes" value={meta.clientesAusentes} />
                    <Metric label="Sin gestión" value={meta.clientesPendientes} />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-black text-slate-900">
                    Resumen financiero
                  </h4>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <MetricMoney label="Meta" value={meta.meta} />
                    <MetricMoney label="Recaudo operativo" value={meta.recaudoOperativo} />
                    <MetricMoney label="Registrado ese día" value={meta.recaudoContable} />
                    <MetricMoney label="Regularizado después" value={meta.recaudoRegularizado} />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-black text-slate-900">
                    Caja y conciliación
                  </h4>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <MetricMoney label="Efectivo ruta" value={meta.recaudoEfectivo} />
                    <MetricMoney label="Transferencias banco" value={meta.recaudoTransferencia} />
                    <MetricMoney label="Gastos ruta" value={meta.gastosRuta ?? meta.gastos} />
                    <MetricMoney label="Neto efectivo ruta" value={meta.netoEfectivoRuta} />
                  </div>
                </section>

                {meta.observaciones && (
                  <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h4 className="text-sm font-black text-amber-900">
                      Observación administrativa
                    </h4>
                    <p className="mt-2 text-sm text-amber-900 whitespace-pre-wrap">
                      {scalarText(meta.observaciones, '')}
                    </p>
                  </section>
                )}

                {Array.isArray(meta.advertencias) && meta.advertencias.length > 0 && (
                  <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <h4 className="text-sm font-black text-rose-900">
                      Advertencias
                    </h4>
                    <ul className="mt-2 list-disc pl-5 text-sm text-rose-900">
                      {meta.advertencias.map((item: any, idx: number) => (
                        <li key={idx}>{listItemText(item)}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </Portal>
    )
  }

  const { tipo, titulo, mensaje, fecha, solicitante, estado, approvalType } = notificacion
  
  // Versión segura de metadata para el renderizado
  const safeMeta = typeof notificacion.metadata === 'string'
    ? JSON.parse(notificacion.metadata)
    : (notificacion.metadata || {})
  const safeMetaDetalles = (safeMeta && typeof safeMeta === 'object') ? (safeMeta.detalles || {}) : {}

  const isPrestamo = tipo === 'PRESTAMO' || approvalType === 'NUEVO_PRESTAMO'
  const isGasto = tipo === 'GASTO' || approvalType === 'GASTO'
  const isSolicitudBase = tipo === 'SOLICITUD_DINERO' || approvalType === 'SOLICITUD_BASE_EFECTIVO'
  const isArticle = isPrestamo && (editedDetails?.tipo === 'ARTICULO' || editedDetails?.tipoPrestamo === 'ARTICULO' || safeMeta?.tipo === 'ARTICULO' || safeMeta?.tipoPrestamo === 'ARTICULO')
  const isApprovalNotification = Boolean(approvalType)
  const isNuevoCliente = approvalType === 'NUEVO_CLIENTE'
  const mediaArchivos = (() => {
    const meta = typeof notificacion.metadata === 'string' ? JSON.parse(notificacion.metadata) : (notificacion.metadata || {})
    const dets = typeof notificacion.detalles === 'string' ? JSON.parse(notificacion.detalles) : (notificacion.detalles || {})
    const arr = (dets.archivos || meta.archivos || []) as any[]
    return Array.isArray(arr) ? arr : []
  })()
  const tipoLabels: Record<string, string> = {
    FOTO_PERFIL: 'Foto de Perfil',
    DOCUMENTO_IDENTIDAD_FRENTE: 'Documento Identidad (Frente)',
    DOCUMENTO_IDENTIDAD_REVERSO: 'Documento Identidad (Reverso)',
    COMPROBANTE_DOMICILIO: 'Comprobante de Domicilio',
    COMPROBANTE_TRANSFERENCIA: 'Comprobante de Transferencia',
    RECIBO_PAGO: 'Recibo de Pago',
  }
  const mensajeFmt = (mensaje || '').replace(/\bDNI\b/gi, 'CC')
  const clientRequestDetails = {
    nombreCompleto: pickString(
      `${editedDetails?.nombres || ''} ${editedDetails?.apellidos || ''}`,
      editedDetails?.nombreCompleto,
      safeMeta?.nombreCompleto,
    ),
    dni: pickString(editedDetails?.dni, editedDetails?.cedula, safeMeta?.dni, safeMeta?.cedula),
    telefono: pickString(editedDetails?.telefono, safeMeta?.telefono),
    direccion: pickString(editedDetails?.direccion, safeMeta?.direccion),
    correo: pickString(editedDetails?.correo, safeMeta?.correo) || 'No registrado',
    referencia: pickString(editedDetails?.referencia, safeMeta?.referencia),
    referencia1Nombre: pickString(editedDetails?.referencia1Nombre, safeMeta?.referencia1Nombre),
    referencia1Telefono: pickString(editedDetails?.referencia1Telefono, safeMeta?.referencia1Telefono),
    referencia2Nombre: pickString(editedDetails?.referencia2Nombre, safeMeta?.referencia2Nombre),
    referencia2Telefono: pickString(editedDetails?.referencia2Telefono, safeMeta?.referencia2Telefono),
  }

  const ClientInfoField = ({
    label,
    value,
    className = '',
  }: {
    label: string
    value?: string
    className?: string
  }) => (
    <div className={`min-w-0 rounded-xl border border-slate-200 bg-white p-3 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black leading-snug text-slate-900">
        {value || 'No registrado'}
      </p>
    </div>
  )

  const handleClose = () => {
    setIsEditingMode(false)
    setActionComment('')
    onClose()
  }

  const approveNow = async () => {
    if (!notificacion.entidadId || !approvalType) return
    setIsProcessing(true)
    try {
      let finalDetails = editedDetails
      if (isPrestamo && isArticle && esContado) {
        const precioContado = (() => {
          if (articuloData) {
            return Number(articuloData.precioContado || articuloData.precioBase || editedDetails?.valorArticulo || editedDetails?.monto || 0)
          }
          return Number(editedDetails?.valorArticulo || editedDetails?.monto || 0)
        })()
        const inicial = Number(editedDetails?.cuotaInicial || 0)
        const montoFinanciar = Math.max(0, precioContado - inicial)
        finalDetails = {
          ...editedDetails,
          monto: montoFinanciar,
          valorArticulo: precioContado,
          porcentaje: 0,
          cuotas: 1,
          numCuotas: 1,
          cantidadCuotas: 1,
          plazoMeses: 1,
          frecuenciaPago: 'MENSUAL',
          ventaContado: true,
        }
      }
      finalDetails = { ...finalDetails }
      await onApprove(notificacion.entidadId, approvalType, finalDetails)
      handleClose()
    } catch (error) {
      console.error('Error processing notification action:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const rejectNow = async (motivo: string) => {
    if (!notificacion.entidadId || !approvalType) return
    setIsProcessing(true)
    try {
      await onReject(notificacion.entidadId, approvalType, motivo)
      handleClose()
    } catch (error) {
      console.error('Error processing notification action:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCOPInput = (val: number | undefined) => {
    if (val === undefined || val === 0) return ''
    return formatMilesCOP(val)
  }

  const parseCOPInput = (val: string) => {
    return Number(val.replace(/\D/g, ''))
  }

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'PAGO': return <DollarSign className="h-5 w-5" />
      case 'CLIENTE': return <User className="h-5 w-5" />
      case 'PRESTAMO': return <CreditCard className="h-5 w-5" />
      case 'GASTO': return <Receipt className="h-5 w-5" />
      case 'SOLICITUD_DINERO': return <Layers className="h-5 w-5" />
      default: return <Info className="h-5 w-5" />
    }
  }

  const getColorClass = (tipo: string) => {
    switch (tipo) {
      case 'PAGO': return 'bg-blue-50 text-blue-600 border-blue-100'
      case 'CLIENTE': return 'bg-purple-50 text-purple-600 border-purple-100'
      case 'PRESTAMO': return 'bg-indigo-50 text-indigo-600 border-indigo-100'
      case 'GASTO': return 'bg-orange-50 text-orange-600 border-orange-100'
      case 'SOLICITUD_DINERO': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
      default: return 'bg-slate-50 text-slate-600 border-slate-100'
    }
  }


  const renderMedia = () => {
    if (!isNuevoCliente) return null
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Archivos</div>
          <div className="text-[10px] font-bold text-slate-400">
            {mediaArchivos.length > 0 ? `${mediaArchivos.length} adjunto(s)` : 'Sin archivos adjuntos'}
          </div>
        </div>
        {mediaArchivos.length === 0 ? (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
            Esta solicitud no incluye fotos ni videos. Puedes aprobar o rechazar con base en los datos capturados.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mediaArchivos.map((file, idx) => {
              const url = file.url || file.path || file.ruta
              const fullUrl = resolveMediaUrl(url)
              const tipo = String(file.tipoArchivo || '').toLowerCase()
              const ext = (String(fullUrl).split('.').pop() || '').toLowerCase()
              const isImage = tipo.startsWith('image/') || /(jpg|jpeg|png|gif|webp)$/i.test(ext)
              const isVideo = tipo.startsWith('video/') || /(mp4|webm)$/i.test(ext)
              return (
                <div key={`${idx}-${file.nombreAlmacenamiento || file.nombreOriginal || 'media'}`} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-600 border-b border-slate-200">
                    {tipoLabels[file.tipoContenido] || (file.tipoContenido || 'Archivo')}
                  </div>
                  {isImage && (
                    <img src={fullUrl} alt={file.nombreOriginal || 'archivo'} className="w-full h-32 object-cover" />
                  )}
                  {isVideo && (
                    <video src={fullUrl} controls className="w-full h-32 object-cover" />
                  )}
                  {!isImage && !isVideo && (
                    <div className="p-3 text-xs text-slate-600 break-all">{file.nombreOriginal || file.nombreAlmacenamiento || 'archivo'}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderPrestamo = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Análisis de Cartera</p>
        {canApprove && estado === 'PENDIENTE' && (
          <button 
            onClick={() => setIsEditingMode(!isEditingMode)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              isEditingMode 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700'
            }`}
          >
            {isEditingMode ? 'Bloquear Cambios' : 'Editar Condiciones'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${isEditingMode ? 'bg-white border-orange-200 shadow-xl' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200/50 pb-2">
            <User className="h-4 w-4 text-slate-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Información del Cliente</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Nombre Completo</label>
              <p className="text-base font-black text-slate-900">
                {editedDetails?.cliente || 
                 safeMeta?.cliente || 
                 (mensaje?.includes('para ') ? mensaje.split('para ')[1].split(' por')[0] : 'N/A')}
              </p>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Cédula</label>
              <p className="text-sm font-black text-slate-800">{editedDetails?.cedula || safeMeta?.cedula || editedDetails?.dni || safeMeta?.dni || 'N/A'}</p>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Teléfono</label>
              <p className="text-sm font-black text-slate-800">{editedDetails?.telefono || safeMeta?.telefono || editedDetails?.phone || safeMeta?.phone || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border transition-all duration-300 ${isEditingMode ? 'bg-white border-blue-200 shadow-xl' : 'bg-blue-50/50 border-blue-100'}`}>
          <div className="flex items-center gap-2 mb-4 border-b border-blue-200/50 pb-2">
            <CreditCard className="h-4 w-4 text-blue-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              Condiciones Financieras {isArticle && esContado ? '(Venta de Contado)' : ''}
            </p>
          </div>
          <div className="space-y-4">
            {isArticle && (editedDetails?.articulo || safeMeta?.articulo) && editedDetails?.articulo !== 'N/A' && (
              <div className="bg-white/50 p-3 rounded-xl border border-blue-100">
                <label className="text-[9px] text-blue-600 uppercase font-black block mb-1">Artículo a Financiar</label>
                <p className="text-sm font-black text-blue-900 italic">{editedDetails?.articulo || safeMeta?.articulo}</p>
              </div>
            )}
            
            <div className="space-y-4">
              {isArticle && isEditingMode && (
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">Modo de Venta</span>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEsContado(false)}
                      className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                        !esContado
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEsContado(true)
                        if (articuloData) {
                          const precioContado = Number(articuloData.precioContado || articuloData.precioBase || editedDetails?.valorArticulo || editedDetails?.monto || 0)
                          const inicial = Number(editedDetails?.cuotaInicial || 0)
                          const montoFinanciar = Math.max(0, precioContado - inicial)
                          setEditedDetails({
                            ...editedDetails,
                            monto: montoFinanciar,
                            valorArticulo: precioContado,
                            porcentaje: 0,
                            cuotas: 1,
                            numCuotas: 1,
                            plazoMeses: 1,
                            frecuenciaPago: 'MENSUAL',
                          })
                          setAutoCuotas(true)
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                        esContado
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      Contado
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">{isArticle ? 'Capital' : 'Capital Solicitado'}</label>
                  {isEditingMode ? (
                    <input 
                      type="text"
                      value={formatCOPInputValue(String(editedDetails?.valorArticulo || safeMeta?.valorArticulo || editedDetails?.monto || safeMeta?.monto || ''))}
                      onChange={(e) => {
                        const val = parseCOPInputToNumber(e.target.value)
                        setEditedDetails({
                          ...editedDetails, 
                          [(editedDetails?.articulo || safeMeta?.articulo) ? 'valorArticulo' : 'monto']: val,
                          monto: val
                        })
                      }}
                      className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-base font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  ) : (
                    <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
                      {(() => {
                        const val = Number(editedDetails?.valorArticulo || safeMeta?.valorArticulo || editedDetails?.monto || safeMeta?.monto || 0);
                        return formatCurrency(isNaN(val) ? 0 : val);
                      })()}
                    </p>
                  )}
                </div>

                {!isArticle || !esContado ? (
                  <div>
                    <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">N° de Cuotas</label>
                    {isEditingMode ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editedDetails?.cuotas === undefined || editedDetails?.cuotas === null ? '' : String(editedDetails?.cuotas)}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '')
                          setAutoCuotas(false)
                          const numVal = v === '' ? undefined : Number(v)
                          setEditedDetails({ ...editedDetails, cuotas: numVal, cantidadCuotas: numVal, numCuotas: numVal })
                        }}
                        className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    ) : (
                      <p className="text-base font-black text-slate-900">
                        {editedDetails?.cuotas ?? safeMeta?.cuotas ?? editedDetails?.numCuotas ?? safeMeta?.numCuotas ?? 0} <span className="text-[10px] text-slate-400">CUOTAS</span>
                      </p>
                    )}
                  </div>
                ) : null}

                {!isArticle || !esContado ? (
                  <div>
                    <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Plazo Total</label>
                    {isEditingMode ? (
                      isArticle && articuloData?.opcionesCuotas?.length ? (
                        <select
                          value={planIndex !== null ? planIndex : ''}
                          onChange={(e) => {
                            const idx = e.target.value ? parseInt(e.target.value) : null
                            setPlanIndex(idx)
                            if (idx !== null && articuloData) {
                              const op = articuloData.opcionesCuotas[idx]
                              const meses = Number(op.numeroCuotas)
                              const precioTotal = Number(op.precioTotal)
                              const inicial = Number(editedDetails?.cuotaInicial || 0)
                              const aFinanciar = Math.max(0, precioTotal - inicial)
                              setEditedDetails({
                                ...editedDetails,
                                plazoMeses: meses,
                                valorArticulo: precioTotal,
                                monto: aFinanciar,
                              })
                              setAutoCuotas(true)
                            }
                          }}
                          className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="">Seleccionar plazo...</option>
                          {articuloData.opcionesCuotas.map((op: any, i: number) => {
                            const meses = Number(op.numeroCuotas)
                            if (isNaN(meses)) return null
                            return (
                              <option key={i} value={i}>
                                {meses} {meses === 1 ? 'Mes' : 'Meses'} - Total: {formatCurrency(op.precioTotal)}
                              </option>
                            )
                          })}
                        </select>
                      ) : (
                        <input 
                          type="number"
                          value={editedDetails?.plazoMeses || ''}
                          onChange={(e) => setEditedDetails({...editedDetails, plazoMeses: Number(e.target.value)})}
                          className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      )
                    ) : (
                      <p className="text-base font-black text-slate-900">
                        {formatLoanTerm({
                          plazoMeses: editedDetails?.plazoMeses || safeMeta?.plazoMeses || 1,
                          cantidadCuotas: editedDetails?.cantidadCuotas || editedDetails?.cuotas || editedDetails?.numCuotas || safeMeta?.cantidadCuotas || safeMeta?.cuotas || safeMeta?.numCuotas,
                          frecuenciaPago: editedDetails?.frecuenciaPago || safeMeta?.frecuenciaPago || editedDetails?.frecuencia || safeMeta?.frecuencia || 'DIARIO',
                        })}
                      </p>
                    )}
                  </div>
                ) : null}

                {!isArticle || !esContado ? (
                  <div>
                    <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Frecuencia de Pago</label>
                    {isEditingMode ? (
                      <select 
                        value={editedDetails?.frecuenciaPago || safeMeta?.frecuenciaPago || editedDetails?.frecuencia || safeMeta?.frecuencia || 'DIARIO'}
                        onChange={(e) => { 
                          setEditedDetails({...editedDetails, frecuenciaPago: e.target.value})
                          setAutoCuotas(true)
                        }}
                        className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="DIARIO">DIARIO</option>
                        <option value="SEMANAL">SEMANAL</option>
                        <option value="QUINCENAL">QUINCENAL</option>
                        <option value="MENSUAL">MENSUAL</option>
                      </select>
                    ) : (
                      <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {editedDetails?.frecuenciaPago || safeMeta?.frecuenciaPago || editedDetails?.frecuencia || safeMeta?.frecuencia || 'DIARIO'}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="col-span-2 p-4 bg-white/50 rounded-2xl border border-blue-100 space-y-4">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Detalles de Venta</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-blue-500 uppercase font-black block mb-0.5">Total a Pagar</label>
                      <p className="text-lg font-black text-blue-900">
                        {(() => {
                          const total = (() => {
                            const monto = Number(editedDetails?.monto || 0)
                            const valorArticulo = Number(editedDetails?.valorArticulo || 0)
                            const cuotaInicial = Number(editedDetails?.cuotaInicial || 0)
                            const montoTotal = Number(editedDetails?.montoTotal || 0)
                            const interesTotal = Number(editedDetails?.interesTotal || 0)
                            const tasa = Number(editedDetails?.tasaInteres ?? editedDetails?.porcentaje ?? 0)
                            const meses = Math.max(1, Number(editedDetails?.plazoMeses || 1))

                            if (montoTotal > 0) return montoTotal

                            if (isArticle) {
                              return valorArticulo > 0 ? valorArticulo : monto + cuotaInicial
                            }

                            if (interesTotal > 0) return monto + interesTotal

                            return monto + ((monto * tasa * meses) / 100)
                          })()
                          return formatCurrency(isNaN(total) ? 0 : total)
                        })()}
                      </p>
                    </div>
                    {isArticle && esContado ? (
                      <div className="col-span-2">
                        <label className="text-[9px] text-blue-500 uppercase font-black block mb-0.5">Total de Contado</label>
                        <p className="text-lg font-black text-blue-900">
                          {(() => {
                            const val = Number(editedDetails?.valorArticulo || safeMeta?.valorArticulo || editedDetails?.monto || safeMeta?.monto || 0)
                            return formatCurrency(isNaN(val) ? 0 : val)
                          })()}
                        </p>
                      </div>
                    ) : isArticle ? (
                      <>
                        <div>
                          <label className="text-[9px] text-blue-500 uppercase font-black block mb-0.5">Cuota Inicial</label>
                          {isEditingMode ? (
                            <input 
                              type="text"
                              value={formatCOPInput(Number(editedDetails?.cuotaInicial ?? safeMeta?.cuotaInicial ?? 0))}
                              onChange={(e) => {
                                const val = parseCOPInput(e.target.value)
                                setEditedDetails({
                                  ...editedDetails, 
                                  cuotaInicial: val,
                                })
                              }}
                              className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          ) : (
                            <p className="text-lg font-black text-blue-900">{formatCurrency(Number(editedDetails?.cuotaInicial ?? safeMeta?.cuotaInicial ?? 0))}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-[9px] text-blue-500 uppercase font-black block mb-0.5">Capital a Financiar</label>
                          <p className="text-lg font-black text-blue-900">
                            {(() => {
                              const val = Number(editedDetails?.valorArticulo || safeMeta?.valorArticulo || editedDetails?.monto || safeMeta?.monto || 0)
                              const inicial = Number(editedDetails?.cuotaInicial || safeMeta?.cuotaInicial || 0)
                              return formatCurrency(Math.max(0, val - inicial))
                            })()}
                          </p>
                        </div>
                      </>
                    ) : null}
                    {!isArticle && (
                      <div>
                        <label className="text-[9px] text-blue-500 uppercase font-black block mb-0.5">Interés (%)</label>
                        {isEditingMode ? (
                          <input 
                            type="number"
                            value={editedDetails?.porcentaje || safeMeta?.porcentaje || ''}
                            onChange={(e) => setEditedDetails({...editedDetails, porcentaje: Number(e.target.value)})}
                            className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        ) : (
                          <p className="text-base font-black text-slate-900">{editedDetails?.porcentaje || safeMeta?.porcentaje || 0}%</p>
                        )}
                      </div>
                    )}
                    <div>
                    <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Fecha Inicio</label>
                      <p className="text-base font-black text-slate-900">
                        {(() => {
                          // Priorizar editedDetails, luego safeMeta (ambos incluyen la data del backend)
                          const dateStr =
                            editedDetails?.fechaInicio ||
                            editedDetails?.fecha ||
                            safeMeta?.fechaInicio ||
                            safeMeta?.fecha ||
                            safeMetaDetalles?.fechaInicio;
                          if (!dateStr || dateStr === 'N/A') return 'N/A';
                          try {
                            const key = normalizeDateKey(String(dateStr))
                            if (key) {
                              const base = new Date(`${key}T12:00:00-05:00`)
                              return base.toLocaleDateString('es-CO')
                            }
                          } catch (e) {
                            return String(dateStr);
                          }
                          // Si es un string válido (ej. "01/04/2026") que date no pudo entender, devuélvelo tal cual.
                          if (typeof dateStr === 'string' && dateStr.trim() !== '') return dateStr;
                          return 'N/A';
                        })()}
                      </p>
                    </div>
                    <div className="col-span-2">
                            <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Notas / Observaciones</label>
                      {isEditingMode ? (
                        <textarea 
                          value={editedDetails?.notas ?? safeMeta?.notas ?? ''}
                          onChange={(e) => setEditedDetails({ ...editedDetails, notas: e.target.value })}
                          className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[60px]"
                          placeholder="Notas adicionales..."
                        />
                      ) : (
                        <p className="text-xs text-slate-600 italic">
                          {editedDetails?.notas || safeMeta?.notas || 'Sin notas registradas.'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 border-dashed">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Proyección de Recaudo</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-emerald-500 uppercase font-black block mb-0.5">Valor Cuota (Est.)</label>
                        <p className="text-lg font-black text-emerald-900">
                          {(() => {
                            const total = Number(editedDetails?.montoTotal || 0)
                            const cuotas = Math.max(1, Number(editedDetails?.cuotas || editedDetails?.cantidadCuotas || 1))
                            const valorCuota = Math.ceil(total / cuotas)
                            return formatCurrency(isNaN(valorCuota) ? 0 : valorCuota)
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="text-[9px] text-emerald-500 uppercase font-black block mb-0.5">Total a Cobrar</label>
                        <p className="text-lg font-black text-emerald-900">
                          {(() => {
                            const totalCobrar = Number(editedDetails?.montoTotal || 0)
                            return formatCurrency(isNaN(totalCobrar) ? 0 : totalCobrar)
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Portal>
      <div 
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        onMouseDown={(e) => { mouseDownTargetRef.current = e.target }}
        onMouseUp={(e) => {
          // Solo cerrar si mousedown Y mouseup ocurrieron en el backdrop (no al arrastrar texto)
          if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
            handleClose()
          }
          mouseDownTargetRef.current = null
        }}
      >
        <div 
          className="bg-white shadow-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[2.5rem] sm:max-w-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${getColorClass(tipo)} shadow-sm`}>
                {getIcon(tipo)}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight truncate">
                  {isArticle ? (esContado ? 'Venta de Artículo de Contado' : 'Crédito de un Artículo') : titulo}
                </h3>
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {formatFechaHora(notificacion.creadoEn || fecha, fecha || '—')}
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

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* Mensaje Principal */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block pl-1">Mensaje de la Notificación</label>
              <p className="text-slate-600 text-sm font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed italic">
                &quot;{mensajeFmt}&quot;
              </p>
            </div>

            {solicitante && (
              <div className="flex items-center gap-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Solicitado por</p>
                  <p className="text-sm font-black text-slate-900">{solicitante}</p>
                </div>
              </div>
            )}

            {isNuevoCliente && (
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <ClientInfoField label="Nombre" value={clientRequestDetails.nombreCompleto} className="sm:col-span-2" />
                  <ClientInfoField label="CC" value={clientRequestDetails.dni} />
                  <ClientInfoField label="Teléfono" value={clientRequestDetails.telefono} />
                  <ClientInfoField label="Dirección" value={clientRequestDetails.direccion} className="sm:col-span-2" />
                  <ClientInfoField label="Correo" value={clientRequestDetails.correo} className="sm:col-span-2 lg:col-span-3" />
                  {clientRequestDetails.referencia && (
                    <ClientInfoField label="Referencia general" value={clientRequestDetails.referencia} className="sm:col-span-2 lg:col-span-3" />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Referencias personales
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referencia 1</p>
                      <p className="mt-1 break-words text-sm font-black text-slate-900">
                        {clientRequestDetails.referencia1Nombre || 'No registrada'}
                      </p>
                      <p className="mt-1 break-words text-xs font-bold text-slate-500">
                        {clientRequestDetails.referencia1Telefono || 'Sin teléfono'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referencia 2</p>
                      <p className="mt-1 break-words text-sm font-black text-slate-900">
                        {clientRequestDetails.referencia2Nombre || 'No registrada'}
                      </p>
                      <p className="mt-1 break-words text-xs font-bold text-slate-500">
                        {clientRequestDetails.referencia2Telefono || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>
                </div>
                {renderMedia()}
              </div>
            )}

            {/* Detalles Específicos */}
            <div className="space-y-6">
              {isSolicitudBase && (
                <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5 space-y-4">
                  <div className="text-center pb-4 border-b border-emerald-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Monto de la Base</p>
                    <h4 className="text-3xl font-black text-slate-900 tabular-nums">{formatCurrency(editedDetails?.monto || safeMeta?.monto)}</h4>
                  </div>
                  <div className="pt-1">
                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Motivo de la Solicitud</p>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed italic border-l-4 border-emerald-400 pl-3 py-1">
                      {editedDetails?.motivo || editedDetails?.descripcion || safeMeta?.descripcion || safeMeta?.motivo || mensaje}
                    </p>
                  </div>
                </div>
              )}

              {isGasto && (
                <div className="bg-orange-50/50 rounded-2xl border border-orange-100 p-5 space-y-4">
                  <div className="text-center pb-4 border-b border-orange-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1">Monto del Gasto</p>
                    <h4 className="text-3xl font-black text-slate-900 tabular-nums">{formatCurrency(editedDetails?.monto || safeMeta?.monto)}</h4>
                  </div>
                  <div className="pt-1">
                    <p className="text-[10px] font-black text-orange-600 uppercase mb-2">Descripción del Gasto</p>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed italic border-l-4 border-orange-400 pl-3 py-1">
                      {editedDetails?.descripcion || safeMeta?.descripcion || mensaje}
                    </p>
                  </div>
                </div>
              )}

              {isPrestamo ? renderPrestamo() : null}

              {/* Botón para abrir el modal de detalle del pago (transferencia o efectivo) */}
              {notificacion?.entidad === 'PAGO' && safeMeta?.pagoId && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowPagoDetalle(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 font-black text-[11px] uppercase tracking-widest hover:bg-blue-100 transition-all shadow-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Ver Detalle del Pago
                  </button>
                </div>
              )}
            </div>

            {/* Historial de Aprobación */}
            {(safeMeta?.estadoAprobacion && safeMeta.estadoAprobacion !== 'PENDIENTE') && (
              <div className={`p-5 rounded-2xl border shadow-sm ${safeMeta.estadoAprobacion === 'RECHAZADO' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {safeMeta.estadoAprobacion === 'RECHAZADO' ? <AlertTriangle className="h-4 w-4 text-rose-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  <p className={`text-[10px] font-black uppercase tracking-widest ${safeMeta.estadoAprobacion === 'RECHAZADO' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    Resultado de la Revisión
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Revisado por</p>
                      <p className="text-sm font-black text-slate-900">{safeMeta.revisadoPor || 'Administrador'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Fecha</p>
                      <p className="text-[10px] font-black text-slate-700">
                        {(() => {
                          const raw = safeMeta.fechaRevision || notificacion?.revisadoEn || notificacion?.actualizadoEn || notificacion?.creadoEn
                          if (!raw || raw === 'N/A' || raw === '—') return fecha || '—'
                          try {
                            const d = new Date(raw);
                            if (isNaN(d.getTime())) return fecha || '—';
                            return d.toLocaleString('es-CO', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            });
                          } catch { return fecha || '—' }
                        })()}
                      </p>
                    </div>
                  </div>
                  {safeMeta.motivoRechazo && (
                    <div className="mt-2 pt-2 border-t border-rose-200/50">
                      <p className="text-[9px] text-rose-400 uppercase font-bold mb-1 ml-1">Comentarios/Razón</p>
                      <p className="text-xs text-rose-700 font-medium italic bg-white/50 p-3 rounded-xl border border-rose-100">
                        &quot;{safeMeta.motivoRechazo}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4 sticky bottom-0 z-10">
            {estado === 'PENDIENTE' && canApprove && isApprovalNotification && (
              <>
                <button 
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 py-4 bg-white border border-rose-200 text-rose-600 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-rose-50 transition-all shadow-sm hover:shadow-md"
                >
                  Rechazar
                </button>
                <button 
                  onClick={() => approveNow()}
                  disabled={isProcessing}
                  className="flex-1 py-4 bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all border border-emerald-500 disabled:opacity-50"
                >
                  {isProcessing ? 'Procesando...' : 'Aprobar Ahora'}
                </button>
              </>
            )}
            {(estado !== 'PENDIENTE' || !canApprove || !isApprovalNotification) && (
              <button 
                onClick={handleClose}
                className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
              >
                Cerrar Detalle
              </button>
            )}
          </div>

          <ConfirmRejectModal
            isOpen={showRejectModal}
            onClose={() => setShowRejectModal(false)}
            onConfirm={(motivo) => rejectNow(motivo)}
          />


          {/* Modal de detalle del pago (archivo separado, sin deuda técnica) */}
          <PagoDetalleModal
            isOpen={showPagoDetalle}
            onClose={() => setShowPagoDetalle(false)}
            metadata={{
              pagoId:             safeMeta?.pagoId,
              numeroPago:         safeMeta?.numeroPago,
              numeroPrestamo:     safeMeta?.numeroPrestamo,
              prestamoId:         safeMeta?.prestamoId,
              metodoPago:         safeMeta?.metodoPago,
              numeroReferencia:   safeMeta?.numeroReferencia,
              tieneComprobante:   safeMeta?.tieneComprobante,
              cliente:            safeMeta?.cliente,
              clienteId:          safeMeta?.clienteId,
              clienteDni:         safeMeta?.clienteDni,
              monto:              safeMeta?.monto,
              capitalRecuperado:  safeMeta?.capitalRecuperado,
              interesRecuperado:  safeMeta?.interesRecuperado,
              saldoNuevo:         safeMeta?.saldoNuevo,
              saldoAnterior:      safeMeta?.saldoAnterior,
              prestamoQuedaPagado: safeMeta?.prestamoQuedaPagado,
              cuotasAfectadas:    safeMeta?.cuotasAfectadas,
            }}
          />
        </div>
      </div>
    </Portal>
  )
}
