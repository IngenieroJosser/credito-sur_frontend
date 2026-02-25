 'use client'
 
 import { useState } from 'react'
 import { X } from 'lucide-react'
 import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
 
 interface ConfirmRejectModalProps {
   isOpen: boolean
   onClose: () => void
   onConfirm: (reason: string) => void | Promise<void>
   title?: string
   placeholder?: string
 }
 
 export default function ConfirmRejectModal({
   isOpen,
   onClose,
   onConfirm,
   title = 'Confirmar Rechazo',
   placeholder = 'Escriba el motivo (ej: este gasto no es de la empresa)...'
 }: ConfirmRejectModalProps) {
   const [reason, setReason] = useState('')
   const [checked, setChecked] = useState(false)
   const [loading, setLoading] = useState(false)
 
   if (!isOpen) return null
 
   const handleClose = () => {
     if (loading) return
     setReason('')
     setChecked(false)
     onClose()
   }
 
   const handleConfirm = async () => {
     if (!reason.trim() || !checked || loading) return
     setLoading(true)
     try {
       await onConfirm(reason.trim())
       handleClose()
     } finally {
       setLoading(false)
     }
   }
 
   return (
     <Portal>
       <div
         className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
         style={{ zIndex: MODAL_Z_INDEX }}
         onClick={handleClose}
       >
         <div
           className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
           onClick={(e) => e.stopPropagation()}
         >
           <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
             <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full">
               <X className="h-5 w-5 text-slate-400" />
             </button>
           </div>
 
           <div className="p-6 space-y-4">
             <label className="text-xs font-bold text-slate-700">Razón del rechazo</label>
             <textarea
               value={reason}
               onChange={(e) => setReason(e.target.value)}
               placeholder={placeholder}
               rows={3}
               className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-rose-500/20 outline-none"
             />
             <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
               <input
                 type="checkbox"
                 checked={checked}
                 onChange={(e) => setChecked(e.target.checked)}
                 className="rounded border-slate-300"
               />
               Confirmo que deseo rechazar esta solicitud
             </label>
           </div>
 
           <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
             <button
               onClick={handleClose}
               className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-sm"
             >
               Cancelar
             </button>
             <button
               onClick={handleConfirm}
               disabled={!reason.trim() || !checked || loading}
               className="px-5 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 text-sm disabled:opacity-50"
             >
               {loading ? 'Procesando...' : 'Confirmar'}
             </button>
           </div>
         </div>
       </div>
     </Portal>
   )
 }
