 'use client'
 
 import { useState } from 'react'
 import { X } from 'lucide-react'
 import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
 
 interface ConfirmApproveModalProps {
   isOpen: boolean
   onClose: () => void
   onConfirm: () => void | Promise<void>
   title?: string
   message?: string
 }
 
 export default function ConfirmApproveModal({
   isOpen,
   onClose,
   onConfirm,
   title = 'Confirmar Aprobación',
   message = 'Esta acción es definitiva y quedará registrada.'
 }: ConfirmApproveModalProps) {
   const [loading, setLoading] = useState(false)
   if (!isOpen) return null
 
   const handleClose = () => {
     if (loading) return
     onClose()
   }
 
   const handleConfirm = async () => {
     if (loading) return
     setLoading(true)
     try {
       await onConfirm()
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
 
           <div className="p-6">
             <p className="text-sm text-slate-600">{message}</p>
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
               disabled={loading}
               className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-sm disabled:opacity-50"
             >
               {loading ? 'Procesando...' : 'Confirmar'}
             </button>
           </div>
         </div>
       </div>
     </Portal>
   )
 }
