'use client'

import { ReactNode, useRef } from 'react'
import { AlertTriangle, Info, XCircle, CheckCircle2 } from 'lucide-react'
import Portal, { ALERT_Z_INDEX } from '@/components/ui/Portal'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
  cancelText?: string | null
  variant?: 'danger' | 'warning' | 'info' | 'success'
  icon?: ReactNode
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'info',
  icon
}: ConfirmModalProps) {
  if (!isOpen) return null

  const variants = {
    danger: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      iconColor: 'text-rose-600',
      buttonBg: 'bg-rose-600 hover:bg-rose-700',
      defaultIcon: <XCircle className="h-6 w-6" />
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconColor: 'text-amber-600',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
      defaultIcon: <AlertTriangle className="h-6 w-6" />
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconColor: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      defaultIcon: <Info className="h-6 w-6" />
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
      defaultIcon: <CheckCircle2 className="h-6 w-6" />
    }
  }

  const currentVariant = variants[variant]
  const mouseDownTargetRef = useRef<EventTarget | null>(null)

  return (
    <Portal>
      <div 
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: ALERT_Z_INDEX }}
        onMouseDown={(e) => { mouseDownTargetRef.current = e.target }}
        onMouseUp={(e) => {
          if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
            onClose()
          }
          mouseDownTargetRef.current = null
        }}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con icono */}
          <div className={`p-6 ${currentVariant.bg} ${currentVariant.border} border-b flex items-start gap-4`}>
            <div className={`p-2 rounded-xl bg-white shadow-sm ${currentVariant.iconColor}`}>
              {icon || currentVariant.defaultIcon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600 mt-1">{message}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 bg-slate-50/50 flex justify-end gap-3">
            {cancelText && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={async () => {
                await onConfirm()
              }}
              className={`px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-lg ${currentVariant.buttonBg}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
