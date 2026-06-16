'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X } from 'lucide-react'

export interface FabAction {
  label: string
  icon: React.ReactNode
  onClick: () => void
  color?: 'primary' | 'orange' | 'emerald' | 'rose' | 'blue'
}

interface FloatingActionMenuProps {
  actions: FabAction[]
}

const colorMap = {
  primary: {
    badge: 'bg-[#08557f]/90 text-white shadow-lg shadow-[#08557f]/20',
    icon: 'bg-white/20 text-[#08557f] border-white/25 shadow-lg shadow-[#08557f]/10 hover:bg-white/30',
  },
  orange: {
    badge: 'bg-orange-600/90 text-white shadow-lg shadow-orange-600/20',
    icon: 'bg-white/20 text-orange-600 border-white/25 shadow-lg shadow-orange-600/10 hover:bg-white/30',
  },
  emerald: {
    badge: 'bg-emerald-600/90 text-white shadow-lg shadow-emerald-600/20',
    icon: 'bg-white/20 text-emerald-600 border-white/25 shadow-lg shadow-emerald-600/10 hover:bg-white/30',
  },
  rose: {
    badge: 'bg-rose-600/90 text-white shadow-lg shadow-rose-600/20',
    icon: 'bg-white/20 text-rose-600 border-white/25 shadow-lg shadow-rose-600/10 hover:bg-white/30',
  },
  blue: {
    badge: 'bg-blue-600/90 text-white shadow-lg shadow-blue-600/20',
    icon: 'bg-white/20 text-blue-600 border-white/25 shadow-lg shadow-blue-600/10 hover:bg-white/30',
  },
}

export default function FloatingActionMenu({ actions }: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (target && menuRef.current?.contains(target)) return
      setIsOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!mounted) return null

  return createPortal(
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[2147483645] bg-slate-900/10 backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        ref={menuRef}
        className="fixed bottom-6 right-4 z-[2147483646] flex flex-col items-end gap-4 sm:right-6"
      >
        <div
          className={`relative flex max-h-[calc(100dvh-8rem)] min-w-64 flex-col gap-3 overflow-y-auto rounded-[2rem] border border-white/20 bg-white/10 p-3 shadow-[0_12px_40px_rgba(15,23,42,0.18)] ring-1 ring-white/10 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-200 ${
            isOpen
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
              : 'scale-95 opacity-0 translate-y-3 pointer-events-none'
          }`}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/18 via-white/8 to-transparent" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[calc(2rem-1px)] border border-white/10" />

          <div className="relative z-10 flex flex-col gap-3">
            {actions.map((action, index) => {
              const colors = colorMap[action.color || 'primary']

              return (
                <button
                  type="button"
                  key={`${action.label}-${index}`}
                  data-fab-action={action.label}
                  onClick={() => {
                    setIsOpen(false)
                    action.onClick()
                  }}
                  className="flex w-60 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/8 px-2 py-1.5 transition-all duration-200 hover:bg-white/16 hover:shadow-lg"
                >
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold backdrop-blur-md ${colors.badge}`}
                  >
                    {action.label}
                  </span>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-all ${colors.icon}`}
                  >
                    {action.icon}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`rounded-full border border-white/20 p-4 shadow-[0_10px_30px_rgba(8,85,127,0.35)] backdrop-blur-xl transition-all duration-300 ${
            isOpen
              ? 'rotate-45 bg-[#063a58]/90 text-white'
              : 'bg-[#08557f]/90 text-white hover:scale-105 hover:bg-[#063a58]/95'
          }`}
          aria-label={isOpen ? 'Cerrar acciones' : 'Abrir acciones'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </>,
    document.body,
  )
}
