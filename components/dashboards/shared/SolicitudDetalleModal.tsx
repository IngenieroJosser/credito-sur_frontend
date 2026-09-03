'use client'

import { useState } from 'react'
import { X, CheckCircle2, FileText, Clock, AlertCircle } from 'lucide-react'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import { formatCurrency } from '@/lib/utils'
import ConfirmRejectModal from '@/components/ui/ConfirmRejectModal'
import ConfirmApproveModal from '@/components/ui/ConfirmApproveModal'

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
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
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
             <div className="min-w-0">
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
                     <div className="min-w-0">
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

          {/* Action Area mejorada */}
          {!readOnly && (
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 z-10">
              <button 
                onClick={() => setShowRejectModal(true)}
                className="px-5 py-2.5 bg-white border border-rose-200 text-rose-600 font-bold rounded-2xl hover:bg-rose-50 transition-all shadow-sm text-sm"
                title="Rechazar solicitud"
              >
                Rechazar
              </button>
              <button 
                onClick={() => setShowApproveModal(true)}
                className="px-5 py-2.5 bg-emerald-600 border border-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 text-sm"
                title="Aprobar solicitud"
              >
                Aprobar
              </button>
            </div>
          )}

          <ConfirmRejectModal
            isOpen={showRejectModal}
            onClose={() => setShowRejectModal(false)}
            onConfirm={(motivo) => {
              onResolve('RECHAZAR', motivo)
              setShowRejectModal(false)
            }}
          />
          <ConfirmApproveModal
            isOpen={showApproveModal}
            onClose={() => setShowApproveModal(false)}
            onConfirm={() => {
              onResolve('APROBAR', '')
              setShowApproveModal(false)
            }}
          />
        </div>
      </div>
    </Portal>
  )
}
