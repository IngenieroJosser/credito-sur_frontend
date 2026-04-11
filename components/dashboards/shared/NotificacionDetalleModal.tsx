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
import { formatCOPInputValue, formatCurrency, formatMilesCOP, parseCOPInputToNumber, resolveMediaUrl } from '@/lib/utils'
import { getBogotaDateKey, normalizeDateKey } from '@/lib/rutas-core'
import { notificacionesService } from '@/services/notificaciones-service'
import { prestamosService } from '@/services/prestamos-service'
import { aprobacionesService } from '@/services/aprobaciones-service'
import { articulosService } from '@/services/articulos-service'
import ConfirmApproveModal from '@/components/ui/ConfirmApproveModal'
import ConfirmRejectModal from '@/components/ui/ConfirmRejectModal'
import PagoDetalleModal from '@/components/dashboards/shared/PagoDetalleModal'
import CierreRutaNotifModal from '@/components/dashboards/shared/CierreRutaNotifModal'

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

  React.useEffect(() => {
    if (notificacion) {
      const meta = typeof notificacion.metadata === 'string'
        ? JSON.parse(notificacion.metadata)
        : (notificacion.metadata || {})
      const metaDetalles = (meta && typeof meta === 'object') ? (meta.detalles || {}) : {}
        
      const dets = typeof notificacion.detalles === 'string' 
        ? JSON.parse(notificacion.detalles) 
        : (notificacion.detalles || {})
        
      // Combined: los datos de detalles (datosSolicitud del backend) tienen prioridad máxima
      const combined = { ...meta, ...metaDetalles, ...dets }

      // ── Valores financieros: tomar DIRECTAMENTE del backend, sin derivaciones ──
      const cuotaInicialDirecta = Number(combined.cuotaInicial ?? 0);
      const valorArticuloDirecto = Number(combined.valorArticulo ?? 0);
      const montoDirecto = Number(combined.monto ?? 0);

      // Solo inferir si realmente faltan (registros muy antiguos)
      const cuotaInicialFinal =
        cuotaInicialDirecta > 0
          ? cuotaInicialDirecta
          : valorArticuloDirecto > 0 && montoDirecto > 0 && valorArticuloDirecto > montoDirecto
          ? valorArticuloDirecto - montoDirecto
          : 0;

      const valorArticuloFinal =
        valorArticuloDirecto > 0
          ? valorArticuloDirecto
          : montoDirecto > 0 && cuotaInicialFinal > 0
          ? montoDirecto + cuotaInicialFinal
          : montoDirecto;

      // Extraer cédula del mensaje si no está en metadata (solo para cliente info)
      const msg = notificacion.mensaje || ''
      const cedulaFromMsg = msg.match(/(\d{7,10})/)?.[1]

      // Extraer artículo del mensaje
      let articuloFromMsg = ''
      if (msg.toLowerCase().includes('artículo') || msg.toLowerCase().includes('articulo')) {
        const artMatch = msg.match(/(?:artículo|articulo)\s+(?:["']?([^"']+)["']?|(\w+))/i)
        if (artMatch) {
           const rawArt = (artMatch[1] || artMatch[2] || '').trim()
           articuloFromMsg = rawArt.split(/\s+para\s+/i)[0].split(/\s+por\s+valor/i)[0].trim()
           if (articuloFromMsg.toLowerCase() === 'para' || articuloFromMsg.length < 2) articuloFromMsg = ''
        }
      }

      const initialVal = {
        ...combined,
        // Financiero: siempre del backend
        monto: montoDirecto,
        valorArticulo: valorArticuloFinal,
        cuotaInicial: cuotaInicialFinal,
        // Plazo y cuotas: del backend, sin recalcular
        plazoMeses: Number(combined.plazoMeses || combined.plajeMeses || 1),
        cuotas: (() => {
           const val = Number(combined.cantidadCuotas || combined.cuotas || combined.numCuotas || 0);
           if (val > 0) return val;
           // Solo calcular si no hay ningún valor explícito del backend
           const meses = Number(combined.plazoMeses || combined.plajeMeses || 0);
           if (meses === 0) return 0;
           const freq = combined.frecuenciaPago || combined.frecuencia || 'DIARIO';
           if (freq === 'DIARIO') return Math.ceil(meses * 30);
           if (freq === 'SEMANAL') return Math.ceil(meses * 4);
           if (freq === 'QUINCENAL') return Math.ceil(meses * 2);
           if (freq === 'MENSUAL') return Math.ceil(meses);
           return Math.ceil(meses * 4);
        })(),
        // Frecuencia: del backend directamente
        frecuenciaPago: combined.frecuenciaPago || combined.frecuencia || 'DIARIO',
        // Fecha: del backend directamente
        fechaInicio: combined.fechaInicio || combined.fecha || getBogotaDateKey(new Date()),
        tipoAmortizacion: combined.tipoAmortizacion || 'INTERES_SIMPLE',
        articulo: combined.articulo || combined.articuloNombre || articuloFromMsg || (
          (notificacion.titulo + notificacion.mensaje).toLowerCase().includes('artículo') ||
          (notificacion.titulo + notificacion.mensaje).toLowerCase().includes('articulo')
            ? 'Artículo por definir' : 'N/A'
        ),
        cedula: String(combined.cedula || combined.dni || cedulaFromMsg || ''),
        telefono: String(combined.telefono || combined.phone || ''),
        notas: (() => {
          const rawNotas = String(combined.notas ?? combined.observaciones ?? combined.comentarios ?? combined.nota ?? '');
          // Filtrar prefijos automáticos generados por el sistema
          const prefijos = ['Crédito de artículo:', 'Venta de contado:', 'Venta de artículo de contado'];
          for (const prefijo of prefijos) {
            if (rawNotas.toLowerCase().startsWith(prefijo.toLowerCase())) {
              const idx = rawNotas.indexOf('. ');
              return idx !== -1 ? rawNotas.slice(idx + 2).trim() : '';
            }
          }
          return rawNotas;
        })(),
        garantia: String(combined.garantia ?? ''),
      }
      
      const isPrestamoEff = (notificacion?.tipo === 'PRESTAMO' || (notificacion as any)?.approvalType === 'NUEVO_PRESTAMO')
      const tituloEff = (notificacion?.titulo || '').toLowerCase()
      const mensajeEff = (notificacion?.mensaje || '').toLowerCase()
      const isArticleEff = isPrestamoEff && (
        combined.tipo === 'ARTICULO' ||
        combined.tipoPrestamo === 'ARTICULO' ||
        tituloEff.includes('artículo') ||
        tituloEff.includes('articulo') ||
        mensajeEff.includes('artículo') ||
        mensajeEff.includes('articulo')
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
      meta?.tipo === 'ARTICULO' ||
      tituloEff.includes('artículo') ||
      tituloEff.includes('articulo') ||
      mensajeEff.includes('artículo') ||
      mensajeEff.includes('articulo')
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
      meta?.tipo === 'ARTICULO' ||
      tituloEff.includes('artículo') ||
      tituloEff.includes('articulo') ||
      mensajeEff.includes('artículo') ||
      mensajeEff.includes('articulo')
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
      meta?.tipo === 'ARTICULO' ||
      tituloEff.includes('artículo') ||
      tituloEff.includes('articulo') ||
      mensajeEff.includes('artículo') ||
      mensajeEff.includes('articulo')
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

  const { tipo, titulo, mensaje, fecha, solicitante, estado, approvalType } = notificacion
  
  // Versión segura de metadata para el renderizado
  const safeMeta = typeof notificacion.metadata === 'string'
    ? JSON.parse(notificacion.metadata)
    : (notificacion.metadata || {})
  const safeMetaDetalles = (safeMeta && typeof safeMeta === 'object') ? (safeMeta.detalles || {}) : {}

  const isPrestamo = tipo === 'PRESTAMO' || approvalType === 'NUEVO_PRESTAMO'
  const isGasto = tipo === 'GASTO' || approvalType === 'GASTO'
  const isSolicitudBase = tipo === 'SOLICITUD_DINERO' || approvalType === 'SOLICITUD_BASE_EFECTIVO'
  const isArticle = isPrestamo && (editedDetails?.tipo === 'ARTICULO' || safeMeta?.tipo === 'ARTICULO' || titulo.toLowerCase().includes('artículo') || titulo.toLowerCase().includes('articulo') || mensaje.toLowerCase().includes('artículo') || mensaje.toLowerCase().includes('articulo'))
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
    return val.toLocaleString('es-CO')
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
            {(editedDetails?.articulo || safeMeta?.articulo) && (
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
                    <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Plazo Total (Meses)</label>
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
                      <p className="text-base font-black text-slate-900">{editedDetails?.plazoMeses || 1} MESES</p>
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
                            const va = Number(editedDetails?.valorArticulo ?? safeMeta?.valorArticulo ?? 0)
                            const m = Number(editedDetails?.monto ?? safeMeta?.monto ?? 0)
                            const ci = Number(editedDetails?.cuotaInicial ?? safeMeta?.cuotaInicial ?? 0)
                            if (isArticle) return va > 0 ? va : (m + ci)

                            const mt = Number(editedDetails?.montoTotal || safeMeta?.montoTotal || 0)
                            if (mt > 0) return mt
                            const it = Number(editedDetails?.interesTotal || safeMeta?.interesTotal || 0)
                            if (it > 0) return m + it
                            const tasa = Number(editedDetails?.tasaInteres || safeMeta?.tasaInteres || Number(editedDetails?.porcentaje || safeMeta?.porcentaje || 0))
                            const meses = Number(editedDetails?.plazoMeses || safeMeta?.plazoMeses || 1)
                            const mesesInteres = Math.max(1, meses)
                            return m + ((m * tasa * mesesInteres) / 100)
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
                    ) : (
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
                    )}
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
                            // ISO completo: 2026-04-01T05:00:00.000Z
                            if (typeof dateStr === 'string' && dateStr.includes('T')) {
                              const key = normalizeDateKey(dateStr)
                              if (key) return new Date(`${key}T12:00:00-05:00`).toLocaleDateString('es-CO')
                            }
                            // Formato YYYY-MM-DD
                            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                              return new Date(dateStr + 'T12:00:00-05:00').toLocaleDateString('es-CO');
                            }
                            // Cualquier otro formato
                            const d = new Date(dateStr);
                            if (!isNaN(d.getTime())) return d.toLocaleDateString('es-CO');
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
                            const m = Number(editedDetails?.monto || safeMeta?.monto || 0);
                            const cBase = Number(editedDetails?.cuotas || safeMeta?.cuotas || editedDetails?.numCuotas || safeMeta?.numCuotas || 1);
                            const c = Math.max(1, isArticle && esContado ? 1 : cBase);
                            const mt = Number(editedDetails?.montoTotal || safeMeta?.montoTotal || 0);
                            const it = Number(editedDetails?.interesTotal || safeMeta?.interesTotal || 0);
                            const tasa = Number(editedDetails?.tasaInteres || safeMeta?.tasaInteres || Number(editedDetails?.porcentaje || safeMeta?.porcentaje || 0));
                            const meses = Number(editedDetails?.plazoMeses || safeMeta?.plazoMeses || 1);
                            const mesesInteres = Math.max(1, meses);
                            const total = isArticle ? m : (mt > 0 ? mt : (it > 0 ? m + it : m + ((m * tasa * mesesInteres) / 100)));
                            const val = Math.ceil(total / c);
                            return formatCurrency(isNaN(val) ? 0 : val);
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="text-[9px] text-emerald-500 uppercase font-black block mb-0.5">Total a Cobrar</label>
                        <p className="text-lg font-black text-emerald-900">
                          {(() => {
                            const m = Number(editedDetails?.monto || safeMeta?.monto || 0);
                            const mt = Number(editedDetails?.montoTotal || safeMeta?.montoTotal || 0);
                            const it = Number(editedDetails?.interesTotal || safeMeta?.interesTotal || 0);
                            const tasa = Number(editedDetails?.tasaInteres || safeMeta?.tasaInteres || Number(editedDetails?.porcentaje || safeMeta?.porcentaje || 0));
                            const meses = Number(editedDetails?.plazoMeses || safeMeta?.plazoMeses || 1);
                            const mesesInteres = Math.max(1, meses);
                            const va = Number(editedDetails?.valorArticulo ?? safeMeta?.valorArticulo ?? 0);
                            const ci = Number(editedDetails?.cuotaInicial ?? safeMeta?.cuotaInicial ?? 0);
                            const totalArticulo = va > 0 ? va : (m + ci);
                            const val = isArticle ? totalArticulo : (mt > 0 ? mt : (it > 0 ? m + it : m + ((m * tasa * mesesInteres) / 100)));
                            return formatCurrency(isNaN(val) ? 0 : val);
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
          className="bg-white shadow-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[2.5rem] sm:max-w-lg"
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
                  {fecha}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">Nombre:</span>
                      <span className="font-bold text-slate-900">{editedDetails?.nombres} {editedDetails?.apellidos}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">CC:</span>
                      <span className="font-bold text-slate-900">{editedDetails?.dni || editedDetails?.cedula || safeMeta?.dni || safeMeta?.cedula}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">Teléfono:</span>
                      <span className="font-bold text-slate-900">{editedDetails?.telefono}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">Dirección:</span>
                      <span className="font-bold text-slate-900">{editedDetails?.direccion}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">Referencia:</span>
                      <span className="font-bold text-slate-900">{editedDetails?.referencia}</span>
                    </div>
                    <div className="flex justify-between text-sm gap-2">
                      <span className="text-slate-600 font-medium whitespace-nowrap">Correo:</span>
                      <span className="font-bold text-slate-900 break-all text-right">
                        {editedDetails?.correo || 'No registrado'}
                      </span>
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
                      {editedDetails?.motivo || mensaje}
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
                  onClick={() => setShowApproveModal(true)}
                  className="flex-1 py-4 bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all border border-emerald-500"
                >
                  Aprobar Ahora
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
          <ConfirmApproveModal
            isOpen={showApproveModal}
            onClose={() => setShowApproveModal(false)}
            onConfirm={() => approveNow()}
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
