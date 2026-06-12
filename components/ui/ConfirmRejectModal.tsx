'use client'

import { useState, useRef } from 'react'
import { X, AlertTriangle } from 'lucide-react'
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
  const mouseDownTargetRef = useRef<EventTarget | null>(null)

  if (!isOpen) return null

  const canReject = reason.trim().length > 0 && checked && !loading

  const handleClose = () => {
    if (loading) return
    setReason('')
    setChecked(false)
    onClose()
  }

  const handleConfirm = async () => {
    if (!canReject) return
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
        onMouseDown={(e) => { mouseDownTargetRef.current = e.target }}
        onMouseUp={(e) => {
          if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
            handleClose()
          }
          mouseDownTargetRef.current = null
        }}
      >
        <div
          className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-rose-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-rose-100 flex justify-between items-center bg-rose-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
                <p className="text-xs text-slate-600">Esta acción detendrá el proceso y se notificará al solicitante.</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <label className="text-xs font-bold text-rose-700">Razón del rechazo</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full p-3 rounded-xl border border-rose-200 bg-white text-sm font-medium focus:ring-2 focus:ring-rose-500/20 outline-none text-slate-900 placeholder:text-slate-400"
            />
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="rounded border-slate-300"
              />
              Confirmo que deseo rechazar esta solicitud
            </label>
          </div>

          <div className="p-6 bg-rose-50/40 border-t border-rose-100 flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canReject}
              className="px-5 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-rose-600 shadow-lg shadow-rose-600/20"
            >
              {loading ? 'Procesando...' : 'Rechazar solicitud'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
