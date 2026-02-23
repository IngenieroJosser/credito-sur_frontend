'use client'

import React, { useState } from 'react'
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
  Layers
} from 'lucide-react'
import { Portal } from '@/components/dashboards/shared/CobradorElements'
import { formatCurrency, formatCOPInputValue, parseCOPInputToNumber } from '@/lib/utils'
import { aprobacionesService } from '@/services/aprobaciones-service'

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
  const [rejectionReason, setRejectionReason] = useState('')
  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  React.useEffect(() => {
    if (notificacion) {
      const meta = typeof notificacion.metadata === 'string'
        ? JSON.parse(notificacion.metadata)
        : (notificacion.metadata || {})
        
      const dets = typeof notificacion.detalles === 'string' 
        ? JSON.parse(notificacion.detalles) 
        : (notificacion.detalles || {})
        
      const combined = { ...meta, ...dets }
      
      // Intentar extraer cédula/teléfono/monto del mensaje si no están en metadata
      const msg = notificacion.mensaje || ''
      
      // Extraer cédula del mensaje: 7 a 10 dígitos seguidos
      const cedulaFromMsg = msg.match(/(\d{7,10})/)?.[1]
      
      // Extraer monto del mensaje: "$ 1.550.000,00" -> 1550000
      const montoMatch = msg.match(/(?:\$|COP)\s?([\d\.,]+)/i)
      let montoFromMsg = 0
      if (montoMatch && montoMatch[1]) {
        // Eliminar puntos de miles y manejar decimales con coma
        const cleanMonto = montoMatch[1].split(',')[0].replace(/\./g, '')
        montoFromMsg = Number(cleanMonto) || 0
      }
      
      // Extraer artículo del mensaje de forma más precisa
      let articuloFromMsg = ''
      if (msg.toLowerCase().includes('artículo') || msg.toLowerCase().includes('articulo')) {
        const artMatch = msg.match(/(?:artículo|articulo)\s+(?:["']?([^"']+)["']?|(\w+))/i)
        if (artMatch) {
           const rawArt = (artMatch[1] || artMatch[2] || '').trim()
           articuloFromMsg = rawArt.split(/\s+para\s+/i)[0].split(/\s+por\s+valor/i)[0].trim()
           if (articuloFromMsg.toLowerCase() === 'para' || articuloFromMsg.length < 2) articuloFromMsg = ''
        }
      }

      const baseValorArticulo = Number(combined.valorArticulo || combined.monto) || montoFromMsg || 0;
      const baseMonto = Number(combined.monto || combined.valorArticulo) || montoFromMsg || 0;
      const baseCuotaInicial = Number(combined.cuotaInicial ?? 0);
      const derivedCuotaInicial =
        baseCuotaInicial > 0
          ? baseCuotaInicial
          : baseValorArticulo > 0 && baseMonto > 0 && baseValorArticulo > baseMonto
          ? baseValorArticulo - baseMonto
          : 0;

      const initialVal = {
        ...combined,
        plazoMeses: Number(combined.plazoMeses || combined.plajeMeses || 1),
        tipoAmortizacion: combined.tipoAmortizacion || 'INTERES_SIMPLE',
        fechaInicio: combined.fechaInicio || new Date().toISOString().split('T')[0],
        cuotas: (() => {
           const val = Number(combined.cuotas || combined.numCuotas || combined.cantidadCuotas || 0);
           if (val > 0) return val;
           const meses = Number(combined.plazoMeses || combined.plajeMeses || 1);
           const freq = combined.frecuenciaPago || combined.frecuencia || 'DIARIO';
           if (freq === 'DIARIO') return meses * 30;
           if (freq === 'SEMANAL') return meses * 4;
           if (freq === 'QUINCENAL') return meses * 2;
           if (freq === 'MENSUAL') return meses;
           return meses * 4;
        })(),
        frecuenciaPago: combined.frecuenciaPago || combined.frecuencia || 'DIARIO',
        articulo: combined.articulo || combined.articuloNombre || articuloFromMsg || ((notificacion.titulo + notificacion.mensaje).toLowerCase().includes('artículo') || (notificacion.titulo + notificacion.mensaje).toLowerCase().includes('articulo') ? 'Artículo por definir' : 'N/A'),
        cuotaInicial: derivedCuotaInicial,
        valorArticulo: baseValorArticulo,
        monto: baseMonto,
        cedula: String(combined.cedula || combined.dni || cedulaFromMsg || ''),
        telefono: String(combined.telefono || combined.phone || ''),
      }
      setEditedDetails(initialVal)
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

  if (!isOpen || !notificacion) return null

  const { tipo, titulo, mensaje, fecha, solicitante, estado, approvalType } = notificacion
  
  // Versión segura de metadata para el renderizado
  const safeMeta = typeof notificacion.metadata === 'string'
    ? JSON.parse(notificacion.metadata)
    : (notificacion.metadata || {})

  const isPrestamo = tipo === 'PRESTAMO' || approvalType === 'NUEVO_PRESTAMO'
  const isGasto = tipo === 'GASTO' || approvalType === 'GASTO'
  const isSolicitudBase = tipo === 'SOLICITUD_DINERO' || approvalType === 'SOLICITUD_BASE_EFECTIVO'
  const isArticle = isPrestamo && (editedDetails?.tipo === 'ARTICULO' || safeMeta?.tipo === 'ARTICULO' || titulo.toLowerCase().includes('artículo') || mensaje.toLowerCase().includes('artículo'))

  const handleClose = () => {
    setIsEditingMode(false)
    setConfirmAction(null)
    setRejectionReason('')
    onClose()
  }

  const handleConfirmAction = async () => {
    if (!notificacion.entidadId || !approvalType) return
    setIsProcessing(true)
    try {
      if (confirmAction === 'APPROVE') {
        await onApprove(notificacion.entidadId, approvalType, editedDetails)
      } else if (confirmAction === 'REJECT') {
        await onReject(notificacion.entidadId, approvalType, rejectionReason)
      }
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

  return (
    <Portal>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      >
        <div 
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]"
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
                  {isArticle ? 'Crédito de un Artículo' : titulo}
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
                &quot;{mensaje}&quot;
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

              {isPrestamo && (
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
                    {/* Información Cliente */}
                    <div className={`p-5 rounded-2xl border transition-all duration-300 ${isEditingMode ? 'bg-white border-orange-200 shadow-xl' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-200/50 pb-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Información del Cliente</p>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Nombre Completo</label>
                          {isEditingMode ? (
                            <input 
                              value={editedDetails?.cliente || safeMeta?.cliente || ''}
                              onChange={(e) => setEditedDetails({...editedDetails, cliente: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          ) : (
                            <p className="text-base font-black text-slate-900">
                              {editedDetails?.cliente || 
                               safeMeta?.cliente || 
                               (mensaje?.includes('para ') ? mensaje.split('para ')[1].split(' por')[0] : 'N/A')}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Cédula</label>
                          {isEditingMode ? (
                            <input 
                              value={editedDetails?.cedula || safeMeta?.cedula || ''}
                              onChange={(e) => setEditedDetails({...editedDetails, cedula: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          ) : (
                            <p className="text-sm font-black text-slate-800">{editedDetails?.cedula || safeMeta?.cedula || editedDetails?.dni || safeMeta?.dni || 'N/A'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Teléfono</label>
                          {isEditingMode ? (
                            <input 
                              value={editedDetails?.telefono || safeMeta?.telefono || ''}
                              onChange={(e) => setEditedDetails({...editedDetails, telefono: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          ) : (
                            <p className="text-sm font-black text-slate-800">{editedDetails?.telefono || safeMeta?.telefono || editedDetails?.phone || safeMeta?.phone || 'N/A'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Condiciones Financieras */}
                    <div className={`p-5 rounded-2xl border transition-all duration-300 ${isEditingMode ? 'bg-white border-blue-200 shadow-xl' : 'bg-blue-50/50 border-blue-100'}`}>
                      <div className="flex items-center gap-2 mb-4 border-b border-blue-200/50 pb-2">
                        <CreditCard className="h-4 w-4 text-blue-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Condiciones Financieras</p>
                      </div>
                      <div className="space-y-4">
                        {(editedDetails?.articulo || safeMeta?.articulo) && (
                          <div className="bg-white/50 p-3 rounded-xl border border-blue-100">
                            <label className="text-[9px] text-blue-600 uppercase font-black block mb-1">Artículo a Financiar</label>
                            <p className="text-sm font-black text-blue-900 italic">{editedDetails?.articulo || safeMeta?.articulo}</p>
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
                                    monto: val // Sync both for calculations
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

                          <div>
                             <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">N° de Cuotas</label>
                             {isEditingMode ? (
                               <input 
                                 type="number"
                                 value={editedDetails?.cuotas || safeMeta?.cuotas || editedDetails?.numCuotas || safeMeta?.numCuotas || ''}
                                 onChange={(e) => setEditedDetails({...editedDetails, cuotas: Number(e.target.value)})}
                                 className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                               />
                             ) : (
                               <p className="text-base font-black text-slate-900">
                                 {editedDetails?.cuotas ?? safeMeta?.cuotas ?? editedDetails?.numCuotas ?? safeMeta?.numCuotas ?? 0} <span className="text-[10px] text-slate-400">CUOTAS</span>
                               </p>
                             )}
                          </div>

                          <div>
                             <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Plazo Total (Meses)</label>
                             {isEditingMode ? (
                               <input 
                                 type="number"
                                 value={editedDetails?.plazoMeses || ''}
                                 onChange={(e) => setEditedDetails({...editedDetails, plazoMeses: Number(e.target.value)})}
                                 className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                               />
                             ) : (
                               <p className="text-base font-black text-slate-900">{editedDetails?.plazoMeses || 1} MESES</p>
                             )}
                          </div>

                          <div>
                            <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Sistema Amortización</label>
                            {isEditingMode ? (
                              <select 
                                value={editedDetails?.tipoAmortizacion || 'INTERES_SIMPLE'}
                                onChange={(e) => setEditedDetails({...editedDetails, tipoAmortizacion: e.target.value})}
                                className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                              >
                                <option value="INTERES_SIMPLE">INTERÉS SIMPLE</option>
                                <option value="CUOTAS_FIJAS">CUOTAS FIJAS</option>
                              </select>
                            ) : (
                              <p className="text-base font-black text-slate-900">{editedDetails?.tipoAmortizacion?.replace('_', ' ') || 'INTERÉS SIMPLE'}</p>
                            )}
                          </div>

                          <div>
                             <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Frecuencia de Pago</label>
                             {isEditingMode ? (
                                <select 
                                  value={editedDetails?.frecuenciaPago || safeMeta?.frecuenciaPago || editedDetails?.frecuencia || safeMeta?.frecuencia || 'DIARIO'}
                                  onChange={(e) => setEditedDetails({...editedDetails, frecuenciaPago: e.target.value})}
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

                          <div className="col-span-2 p-4 bg-white/50 rounded-2xl border border-blue-100 space-y-4">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Detalles de Venta</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Cuota Inicial</label>
                                {isEditingMode ? (
                                  <input 
                                    type="text"
                                    value={formatCOPInputValue(String(editedDetails?.cuotaInicial || safeMeta?.cuotaInicial || ''))}
                                    onChange={(e) => {
                                      const val = parseCOPInputToNumber(e.target.value)
                                      setEditedDetails({ ...editedDetails, cuotaInicial: val })
                                    }}
                                    className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                                  />
                                ) : (
                                  <p className="text-xl font-bold text-orange-600 tabular-nums">
                                    {formatCurrency(editedDetails?.cuotaInicial || safeMeta?.cuotaInicial || 0)}
                                  </p>
                                )}
                              </div>
                                <div>
                                  <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Nombre del Artículo</label>
                                  {isEditingMode ? (
                                    <input 
                                      value={editedDetails?.articulo || safeMeta?.articulo || ''}
                                      onChange={(e) => setEditedDetails({...editedDetails, articulo: e.target.value})}
                                      className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                                      placeholder="Nombre del artículo..."
                                    />
                                  ) : (
                                    <p className="text-sm font-black text-blue-900 italic">
                                      {editedDetails?.articulo && editedDetails.articulo !== 'Artículo' ? editedDetails.articulo : (safeMeta?.articulo && safeMeta.articulo !== 'Artículo' ? safeMeta.articulo : 'Sin nombre definido')}
                                    </p>
                                  )}
                                </div>
                            </div>
                          </div>

                          {!isArticle && (
                            <div>
                              <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Interés (%)</label>
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
                             <p className="text-base font-black text-slate-900">{editedDetails?.fechaInicio ? new Date(editedDetails.fechaInicio).toLocaleDateString() : 'N/A'}</p>
                          </div>

                          <div className="col-span-2">
                             <label className="text-[10px] text-blue-600 uppercase font-black block mb-1">Notas / Observaciones</label>
                             {isEditingMode ? (
                               <textarea 
                                 value={editedDetails?.garantia || safeMeta?.garantia || editedDetails?.notas || safeMeta?.notas || ''}
                                 onChange={(e) => setEditedDetails({...editedDetails, garantia: e.target.value})}
                                 className="w-full bg-white border border-blue-200 text-slate-900 rounded-xl px-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[60px]"
                                 placeholder="Notas adicionales..."
                               />
                             ) : (
                               <p className="text-xs text-slate-600 italic">
                                 {editedDetails?.garantia || safeMeta?.garantia || editedDetails?.notas || safeMeta?.notas || 'Sin notas registradas.'}
                               </p>
                             )}
                          </div>
                        </div>

                        {/* Proyección */}
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
                                     const c = Math.max(1, Number(editedDetails?.cuotas || safeMeta?.cuotas || editedDetails?.numCuotas || safeMeta?.numCuotas || 1));
                                     const p = Number(editedDetails?.porcentaje || safeMeta?.porcentaje || 0);
                                     const val = isArticle ? m / c : (m * (1 + p / 100)) / c;
                                     return formatCurrency(isNaN(val) ? 0 : val);
                                   })()}
                                 </p>
                              </div>
                              <div>
                                 <label className="text-[9px] text-emerald-500 uppercase font-black block mb-0.5">Total a Cobrar</label>
                                 <p className="text-lg font-black text-emerald-900">
                                   {(() => {
                                     const m = Number(editedDetails?.monto || safeMeta?.monto || 0);
                                     const p = Number(editedDetails?.porcentaje || safeMeta?.porcentaje || 0);
                                     const val = isArticle ? m : (m * (1 + p / 100));
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
                      <p className="text-[10px] font-bold text-slate-600">{safeMeta.fechaRevision || 'N/A'}</p>
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

            {/* Historial Completo de Aprobaciones */}
            {history.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Historial de Revisiones</p>
                </div>
                <div className="space-y-2">
                  {history.map((item, idx) => (
                    <div key={item.id} className={`p-4 rounded-2xl border ${item.estado === 'RECHAZADO' ? 'bg-rose-50/30 border-rose-100' : item.estado === 'APROBADO' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          item.estado === 'RECHAZADO' ? 'bg-rose-100 text-rose-700' : 
                          item.estado === 'APROBADO' ? 'bg-emerald-100 text-emerald-700' : 
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {item.estado}
                        </div>
                        <p className="text-[9px] font-bold text-slate-400">
                          {new Date(item.creadoEn).toLocaleDateString()} {new Date(item.creadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700">
                        {item.estado === 'PENDIENTE' ? 'Solicitado por' : item.estado === 'RECHAZADO' ? 'Rechazado por' : 'Aprobado por'}: 
                        <span className="text-slate-900 ml-1 uppercase">
                          {item.estado === 'PENDIENTE' 
                            ? `${item.solicitadoPor?.nombres || ''} ${item.solicitadoPor?.apellidos || ''}`
                            : `${item.aprobadoPor?.nombres || ''} ${item.aprobadoPor?.apellidos || ''}` || 'Admin'}
                        </span>
                      </p>
                      {item.comentarios && (
                        <p className="text-[10px] text-slate-500 italic mt-1 leading-relaxed border-l-2 border-slate-200 pl-2">
                          &quot;{item.comentarios}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4 sticky bottom-0 z-10">
            {estado === 'PENDIENTE' && canApprove && (
              <>
                <button 
                  onClick={() => setConfirmAction('REJECT')}
                  className="flex-1 py-4 bg-white border border-rose-200 text-rose-600 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-rose-50 transition-all shadow-sm hover:shadow-md"
                >
                  Rechazar
                </button>
                <button 
                  onClick={() => setConfirmAction('APPROVE')}
                  className="flex-1 py-4 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all border border-slate-700"
                >
                  Aprobar Ahora
                </button>
              </>
            )}
            {(estado !== 'PENDIENTE' || !canApprove) && (
              <button 
                onClick={handleClose}
                className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
              >
                Cerrar Detalle
              </button>
            )}
          </div>

          {/* Confirmation Overlays */}
          {confirmAction && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-[110] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl ${
                confirmAction === 'APPROVE' ? "bg-emerald-100 text-emerald-600 shadow-emerald-500/20" : "bg-rose-100 text-rose-600 shadow-rose-500/20"
              }`}>
                {confirmAction === 'APPROVE' ? <CheckCircle2 className="h-12 w-12" /> : <AlertTriangle className="h-12 w-12" />}
              </div>
              
              <div className="space-y-6 w-full max-w-sm">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {confirmAction === 'APPROVE' ? '¿Confirmar Aprobación?' : '¿Confirmar Rechazo?'}
                  </h3>
                  <p className="text-slate-500 text-sm mt-2 font-medium">
                    {confirmAction === 'APPROVE' 
                      ? 'Se generarán los movimientos correspondientes y se notificará al solicitante.' 
                      : 'Esta acción detendrá el proceso y se informará al solicitante el motivo.'}
                  </p>
                </div>

                {confirmAction === 'REJECT' && (
                  <div className="text-left space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo del Rechazo</label>
                    <textarea 
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Ej: Información insuficiente, monto excedido, etc..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-4 text-sm font-medium text-slate-800 h-32 outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 resize-none transition-all shadow-inner"
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    disabled={isProcessing}
                    onClick={() => {
                      setConfirmAction(null)
                      setRejectionReason('')
                    }}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    Volver
                  </button>
                  <button 
                    disabled={isProcessing || (confirmAction === 'REJECT' && !rejectionReason.trim())}
                    onClick={handleConfirmAction}
                    className={`flex-1 py-4 font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl transition-all text-white disabled:opacity-50 ${
                      confirmAction === 'APPROVE' 
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30" 
                        : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/30"
                    }`}
                  >
                    {isProcessing ? 'Procesando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}
