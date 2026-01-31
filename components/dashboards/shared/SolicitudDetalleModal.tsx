'use client'

import { useState } from 'react'
import { X, CheckCircle2, FileText, Clock, AlertCircle } from 'lucide-react'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import { formatCurrency } from '@/lib/utils'

export interface SolicitudData {
  id: string
  tipo: string
  titulo: string
  solicitante: string
  fecha: string
  monto?: number
  descripcion: string
  estado?: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  metadata?: Record<string, string | number | boolean | null>
}

interface SolicitudDetalleModalProps {
  isOpen: boolean
  onClose: () => void
  solicitud: SolicitudData | null
  onResolve: (action: 'APROBAR' | 'RECHAZAR', comentario: string) => void
  readOnly?: boolean
}

export default function SolicitudDetalleModal({ isOpen, onClose, solicitud, onResolve, readOnly = false }: SolicitudDetalleModalProps) {
  const [comentario, setComentario] = useState('')
  const [actionType, setActionType] = useState<'APROBAR' | 'RECHAZAR' | null>(null)
  if (!isOpen || !solicitud) return null

  const handleClose = () => {
    setComentario('')
    setActionType(null)
    onClose()
  }

  const handleFinalConfirm = () => {
    if (actionType) {
      onResolve(actionType, comentario)
      handleClose()
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header simple estilo coordinador */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <div>
               <h3 className="font-bold text-slate-900 text-lg">Detalle de Notificación</h3>
               <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">{solicitud.titulo}</p>
             </div>
             <button 
               onClick={handleClose}
               className="p-2 hover:bg-slate-100 rounded-full transition-colors"
             >
               <X className="h-5 w-5 text-slate-400" />
             </button>
          </div>

          <div className="p-6 space-y-6 bg-white">
              {/* Información Principal Card */}
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Origen / Solicitante</p>
                        <p className="font-bold text-slate-900 text-base">{solicitud.solicitante}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{solicitud.tipo}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha</p>
                         <div className="flex items-center gap-1 justify-end text-slate-600">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs font-bold">{solicitud.fecha}</span>
                         </div>
                     </div>
                  </div>
                  
                  {solicitud.monto !== undefined && (
                    <div className="pt-4 border-t border-slate-200/60 flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600">Monto Involucrado</span>
                        <span className="text-xl font-black text-blue-600">{formatCurrency(solicitud.monto)}</span>
                    </div>
                  )}
              </div>

              {/* Detalle / Mensaje */}
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    Contenido
                 </p>
                 <div className="text-sm text-slate-700 bg-white border border-slate-200 p-5 rounded-xl leading-relaxed shadow-sm">
                    {solicitud.descripcion}
                 </div>
              </div>
          </div>

          {/* Action Area - Solo si NO es readOnly */}
          {!readOnly && (
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
               <button 
                 onClick={() => setActionType('RECHAZAR')}
                 className="px-5 py-2.5 bg-white border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-all shadow-sm text-sm"
               >
                 Rechazar
               </button>
               <button 
                 onClick={() => setActionType('APROBAR')}
                 className="px-5 py-2.5 bg-blue-600 border border-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 text-sm"
               >
                 Aprobar
               </button>
            </div>
          )}

          {/* Confirmation Overlay In-Modal */}
          {actionType && (
            <div className="absolute inset-0 bg-white z-20 p-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
               <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  actionType === 'APROBAR' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
               }`}>
                  {actionType === 'APROBAR' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">
                 {actionType === 'APROBAR' ? '¿Aprobar Solicitud?' : '¿Rechazar Solicitud?'}
               </h3>
               <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
                 {actionType === 'APROBAR' 
                   ? 'Esta acción es definitiva y quedará registrada.' 
                   : 'Por favor confirma que deseas rechazar este elemento.'}
               </p>
               
               {actionType === 'RECHAZAR' && (
                 <textarea
                   className="w-full max-w-xs p-3 rounded-xl border border-slate-200 mb-4 text-sm focus:ring-2 focus:ring-rose-500/20 outline-none"
                   placeholder="Motivo del rechazo..."
                   value={comentario}
                   onChange={(e) => setComentario(e.target.value)}
                   rows={2}
                 />
               )}

               <div className="flex gap-3 w-full max-w-xs">
                 <button
                   onClick={() => setActionType(null)}
                   className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                 >
                   Cancelar
                 </button>
                 <button
                   onClick={handleFinalConfirm}
                   disabled={actionType === 'RECHAZAR' && !comentario.trim()}
                   className={`flex-1 py-2.5 rounded-xl font-bold text-white shadow-lg ${
                      actionType === 'APROBAR' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                   }`}
                 >
                   Confirmar
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}
