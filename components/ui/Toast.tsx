'use client'

import React, { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title?: string
  message: string
  duration?: number
}

interface ToastProps extends Notification {
  onClose: (id: string) => void
}

const variants = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50/90',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    iconColor: 'text-emerald-600',
    progress: 'bg-emerald-500'
  },
  error: {
    icon: XCircle,
    bg: 'bg-rose-50/90',
    border: 'border-rose-200',
    text: 'text-rose-900',
    iconColor: 'text-rose-600',
    progress: 'bg-rose-500'
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50/90',
    border: 'border-amber-200',
    text: 'text-amber-900',
    iconColor: 'text-amber-600',
    progress: 'bg-amber-500'
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50/90',
    border: 'border-blue-200',
    text: 'text-blue-900',
    iconColor: 'text-blue-600',
    progress: 'bg-blue-500'
  }
}

export const Toast = ({ id, type, title, message, duration = 4000, onClose }: ToastProps) => {
  const [isExiting, setIsExiting] = useState(false)
  const variant = variants[type]
  const Icon = variant.icon

  useEffect(() => {
    if (!duration) return

    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onClose(id), 300) // Wait for exit animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, id, onClose])

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full max-w-sm overflow-hidden rounded-xl border shadow-lg ring-1 ring-black/5 backdrop-blur-md transition-all duration-300",
        variant.bg,
        variant.border,
        isExiting ? "animate-out fade-out slide-out-to-top-2" : "animate-in slide-in-from-top-full fade-in zoom-in-95"
      )}
      role="alert"
    >
      <div className="p-4 flex items-start gap-4">
        <Icon className={cn("h-6 w-6 mt-0.5 shrink-0", variant.iconColor)} />
        <div className="flex-1">
          {title && <h3 className={cn("text-sm font-bold", variant.text)}>{title}</h3>}
          <p className={cn("text-sm opacity-90 leading-relaxed", variant.text)}>
            {message}
          </p>
        </div>
        <button
          onClick={() => {
            setIsExiting(true)
            setTimeout(() => onClose(id), 300)
          }}
          className={cn(
            "rounded-lg p-1 transition-colors hover:bg-black/5",
            variant.text
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Progress Bar */}
      {duration > 0 && (
         <div className="absolute bottom-0 left-0 h-1 w-full bg-black/5">
             <div 
                className={cn("h-full w-full origin-left", variant.progress)}
                style={{
                    animation: `progress ${duration}ms linear forwards`
                }}
             />
         </div>
      )}
      <style jsx>{`
        @keyframes progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}
