'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X } from 'lucide-react'

export interface FabAction {
  label: string
  icon: ReactNode
  onClick: () => void
  color?: 'primary' | 'orange' | 'emerald' | 'rose' | 'blue'
}

interface FloatingActionMenuProps {
  actions: FabAction[]
}

const colorMap = {
  primary: {
    badge:
      'bg-[#08557f]/90 text-white shadow-[0_8px_22px_rgba(8,85,127,0.28)]',
    icon:
      'bg-white/[0.20] text-[#08557f] border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_rgba(8,85,127,0.16)] hover:bg-white/[0.30]',
  },
  orange: {
    badge:
      'bg-orange-600/90 text-white shadow-[0_8px_22px_rgba(234,88,12,0.28)]',
    icon:
      'bg-white/[0.20] text-orange-600 border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_rgba(234,88,12,0.16)] hover:bg-white/[0.30]',
  },
  emerald: {
    badge:
      'bg-emerald-600/90 text-white shadow-[0_8px_22px_rgba(5,150,105,0.28)]',
    icon:
      'bg-white/[0.20] text-emerald-600 border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_rgba(5,150,105,0.16)] hover:bg-white/[0.30]',
  },
  rose: {
    badge:
      'bg-rose-600/90 text-white shadow-[0_8px_22px_rgba(225,29,72,0.28)]',
    icon:
      'bg-white/[0.20] text-rose-600 border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_rgba(225,29,72,0.16)] hover:bg-white/[0.30]',
  },
  blue: {
    badge:
      'bg-blue-600/90 text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)]',
    icon:
      'bg-white/[0.20] text-blue-600 border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_rgba(37,99,235,0.16)] hover:bg-white/[0.30]',
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
          className="fixed inset-0 z-[2147483645] bg-slate-950/[0.08] backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        ref={menuRef}
        className="fixed right-4 z-[2147483646] flex flex-col items-end gap-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-6"
      >
        <div
          className={`relative flex max-h-[calc(100dvh-8.5rem)] min-w-64 flex-col gap-3 overflow-y-auto rounded-[2.25rem] border border-white/20 bg-white/[0.075] p-3 shadow-[0_24px_80px_rgba(15,23,42,0.24)] ring-1 ring-white/[0.10] backdrop-blur-[28px] backdrop-saturate-[1.8] transition-all duration-300 ease-out [scrollbar-width:thin] ${
            isOpen
              ? 'translate-y-0 scale-100 opacity-100 pointer-events-auto'
              : 'translate-y-4 scale-95 opacity-0 pointer-events-none'
          }`}
        >
          {/* Brillo líquido superior */}
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />

          {/* Capa de vidrio */}
          <div className="pointer-events-none absolute inset-0 rounded-[2.25rem] bg-gradient-to-br from-white/[0.24] via-white/[0.08] to-white/[0.02]" />

          {/* Reflejo diagonal */}
          <div className="pointer-events-none absolute -top-20 right-4 h-40 w-40 rounded-full bg-white/[0.18] blur-3xl" />

          {/* Borde interno */}
          <div className="pointer-events-none absolute inset-[1px] rounded-[calc(2.25rem-1px)] border border-white/[0.12]" />

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
                  className="group/action flex w-60 items-center justify-between gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.075] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.16] hover:shadow-[0_12px_30px_rgba(15,23,42,0.16)] active:translate-y-0 active:scale-[0.99]"
                >
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold backdrop-blur-xl transition-transform duration-200 group-hover/action:scale-[1.03] ${colors.badge}`}
                  >
                    {action.label}
                  </span>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border backdrop-blur-xl transition-all duration-200 group-hover/action:scale-105 ${colors.icon}`}
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
          className={`relative overflow-hidden rounded-full border border-white/20 p-4 text-white shadow-[0_18px_45px_rgba(8,85,127,0.38)] backdrop-blur-2xl transition-all duration-300 active:scale-95 ${
            isOpen
              ? 'rotate-45 bg-[#063a58]/90'
              : 'bg-[#08557f]/90 hover:scale-105 hover:bg-[#063a58]/95'
          }`}
          aria-label={isOpen ? 'Cerrar acciones' : 'Abrir acciones'}
        >
          <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />

          <span className="relative z-10 block">
            {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </span>
        </button>
      </div>
    </>,
    document.body,
  )
}
