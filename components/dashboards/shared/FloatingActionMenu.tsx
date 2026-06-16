'use client'

import { useEffect, useRef, useState } from 'react'
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
    badge: 'bg-[#08557f] text-white shadow-lg shadow-[#08557f]/20',
    icon: 'bg-white text-[#08557f] border-[#08557f]/20 shadow-lg shadow-[#08557f]/10 hover:bg-[#f1f6fb]',
  },
  orange: {
    badge: 'bg-orange-600 text-white shadow-lg shadow-orange-600/20',
    icon: 'bg-white text-orange-600 border-orange-200 shadow-lg shadow-orange-600/10 hover:bg-orange-50',
  },
  emerald: {
    badge: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20',
    icon: 'bg-white text-emerald-600 border-emerald-200 shadow-lg shadow-emerald-600/10 hover:bg-emerald-50',
  },
  rose: {
    badge: 'bg-rose-600 text-white shadow-lg shadow-rose-600/20',
    icon: 'bg-white text-rose-600 border-rose-200 shadow-lg shadow-rose-600/10 hover:bg-rose-50',
  },
  blue: {
    badge: 'bg-blue-600 text-white shadow-lg shadow-blue-600/20',
    icon: 'bg-white text-blue-600 border-blue-200 shadow-lg shadow-blue-600/10 hover:bg-blue-50',
  },
}

export default function FloatingActionMenu({ actions }: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    console.log('[FloatingActionMenu] actions:', actions.map((a) => a.label))
  }, [actions])

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

  return (
    <>
      {isOpen && (
        <div
          className="fixed top-0 left-0 w-screen h-screen z-40 bg-slate-900/10 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
      <div ref={menuRef} className="fixed right-4 sm:right-6 z-50 flex flex-col items-end gap-3 bottom-24 md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div
          className={`flex max-h-[calc(100vh-9rem)] flex-col gap-3 overflow-y-auto pr-1 transition-all duration-200 origin-bottom-right ${
            isOpen
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
              : 'scale-95 opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {actions.map((action, index) => {
            const colors = colorMap[action.color || 'primary']
            return (
              <button
                type="button"
                key={`${action.label}-${index}`}
                onClick={() => {
                  setIsOpen(false)
                  action.onClick()
                }}
                className="flex items-center justify-between w-56 gap-3"
              >
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors.badge}`}>
                  {action.label}
                </span>
                <div className={`h-11 w-11 flex items-center justify-center rounded-full border transition-all ${colors.icon}`}>
                  {action.icon}
                </div>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`p-4 rounded-full shadow-xl transition-all duration-300 ${
            isOpen
              ? 'bg-[#063a58] text-white rotate-45'
              : 'bg-[#08557f] text-white hover:bg-[#063a58] hover:scale-105'
          }`}
          aria-label={isOpen ? 'Cerrar acciones' : 'Abrir acciones'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </>
  )
}
