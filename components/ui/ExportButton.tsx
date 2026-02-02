'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExportButtonProps {
  onExportExcel?: () => void
  onExportPDF?: () => void
  label?: string
  className?: string
}

export const ExportButton = ({ 
  onExportExcel, 
  onExportPDF, 
  label = 'Exportar',
  className
}: ExportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const handleResize = () => {
      if (isOpen) setIsOpen(false)
    }
    
    const handleScroll = () => {
       if (isOpen) setIsOpen(false)
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          const target = event.target as HTMLElement;
          if(!target.closest('.export-dropdown-portal')) {
             setIsOpen(false)
          }
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, { capture: true })
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, { capture: true })
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Update coords when opening
  useEffect(() => {
      if(isOpen && dropdownRef.current) {
          const rect = dropdownRef.current.getBoundingClientRect();
          // Use fixed positioning relative to viewport, so NO scroll addition needed
          setCoords({
              top: rect.bottom + 8, 
              left: rect.left
          });
      }
  }, [isOpen])

  const handleOptionClick = (action?: () => void) => {
    if (action) {
      action()
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm border border-slate-200 hover:border-[#08557f]/30 transition-all font-medium group",
          isOpen && "border-[#08557f]/30 bg-slate-50",
          className
        )}
      >
        <Download className="h-4 w-4 text-slate-400 group-hover:text-[#08557f] transition-colors" />
        <span>{label}</span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
           className="export-dropdown-portal fixed z-[9999] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 w-48"
           style={{
             top: coords.top,
             left: coords.left,
           }}
           onClick={(e) => e.stopPropagation()}
        >
          <div className="p-1">
            <button
              onClick={() => handleOptionClick(onExportExcel)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-left"
            >
              <div className="p-1.5 bg-emerald-100/50 rounded-md text-emerald-600">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <span className="font-medium">Excel</span>
            </button>
            
            <button
              onClick={() => handleOptionClick(onExportPDF)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-left"
            >
              <div className="p-1.5 bg-rose-100/50 rounded-md text-rose-600">
                <FileText className="h-4 w-4" />
              </div>
              <span className="font-medium">PDF</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
