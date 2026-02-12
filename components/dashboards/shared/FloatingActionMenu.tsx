'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

export interface FabAction {
  label: string
  icon: React.ReactNode
  onClick: () => void
  color?: 'primary' | 'orange' | 'emerald' | 'rose'
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
}

export default function FloatingActionMenu({ actions }: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {isOpen && (
        <div
          className="fixed top-0 left-0 w-screen h-screen z-40 bg-slate-900/10 backdrop-blur-[1px] cursor-default"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div className="fixed right-6 z-50 flex flex-col items-end gap-3 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-none">
        <div
          className={`flex flex-col gap-3 transition-all duration-200 origin-bottom-right ${
            isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {actions.map((action, index) => {
            const colors = colorMap[action.color || 'primary']
            return (
              <button
                key={index}
                onClick={() => {
                  setIsOpen(false)
                  action.onClick()
                }}
                className={`flex items-center justify-between w-56 gap-3 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
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
          onClick={() => setIsOpen(!isOpen)}
          className={`pointer-events-auto p-4 rounded-full shadow-xl transition-all duration-300 ${
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
