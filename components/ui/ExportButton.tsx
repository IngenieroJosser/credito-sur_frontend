'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import Tooltip from '@/components/ui/Tooltip'

/**
 * Generar un Excel o un PDF tarda: el servidor arma el archivo y luego el
 * navegador lo descarga. Antes esto recibia `() => void`, asi que no habia
 * forma de saber cuando terminaba: se pulsaba, el menu se cerraba y no pasaba
 * nada visible durante segundos. La gente volvia a pulsar.
 *
 * Aceptando `Promise<void>` el boton puede esperar. Los catorce sitios que lo
 * usan ya pasaban manejadores `async`, asi que el aviso aparece en todos sin
 * tocar ninguno.
 */
interface ExportButtonProps {
  onExportExcel?: () => void | Promise<void>
  onExportPDF?: () => void | Promise<void>
  label?: string
  className?: string
  /** Texto de la ayuda. Si se pasa `null`, no se muestra ninguna. */
  ayuda?: string | null
}

export const ExportButton = ({ 
  onExportExcel, 
  onExportPDF, 
  label = 'Exportar',
  className,
  ayuda = 'Descargar en Excel o PDF',
}: ExportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const hasExportAction = Boolean(onExportExcel || onExportPDF)
  /** Que formato se esta generando, o null. Tambien sirve de candado. */
  const [generando, setGenerando] = useState<'excel' | 'pdf' | null>(null)
  const montadoRef = useRef(true)

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])

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

  /**
   * Calcula dónde va el menú y recién entonces lo abre.
   *
   * Antes la posición se calculaba en un efecto, DESPUÉS de montar el menú, que
   * arrancaba en (0,0). La animación de entrada corría mientras saltaba de la
   * esquina a su sitio: se veía "venir desde arriba a la izquierda". Fijando la
   * posición antes de abrir, el menú aparece ya en su lugar.
   */
  const toggle = () => {
    if (!hasExportAction) return
    if (isOpen) { setIsOpen(false); return }

    const rect = dropdownRef.current?.getBoundingClientRect()
    if (rect) {
      const dropdownWidth = 192 // w-48 = 12rem
      let left = rect.left
      if (left + dropdownWidth > window.innerWidth) left = window.innerWidth - dropdownWidth - 16
      if (left < 16) left = 16
      setCoords({ top: rect.bottom + 8, left })
    }
    setIsOpen(true)
  }

  const handleOptionClick = useCallback(
    async (formato: 'excel' | 'pdf', action?: () => void | Promise<void>) => {
      if (!action || generando) return
      // El menu se cierra ya: el aviso pasa al boton principal, que es donde
      // se esta mirando.
      setIsOpen(false)
      setGenerando(formato)
      try {
        await action()
      } catch (error) {
        // Quien pasa la accion es el dueño del aviso al usuario, y los catorce
        // sitios que usan este boton ya muestran su propio toast. Aqui solo se
        // evita que el rechazo quede sin manejar: React descarta la promesa que
        // devuelve un onClick, asi que sin este catch acabaria como
        // "unhandled rejection" en la consola y sin rastro util.
        logger.warn('Fallo la exportacion', error)
      } finally {
        // Si la pantalla se cerro mientras se generaba, no se toca el estado.
        if (montadoRef.current) setGenerando(null)
      }
    },
    [generando],
  )

  return (
    <div className="relative" ref={dropdownRef}>
      <Tooltip texto={generando ? null : ayuda}>
      <button 
        type="button"
        disabled={!hasExportAction || generando !== null}
        aria-busy={generando !== null}
        onClick={toggle}
        className={cn(
          "flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-2.5 sm:py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm border border-slate-200 hover:border-[#08557f]/30 transition-all font-medium group",
          isOpen && "border-[#08557f]/30 bg-slate-50",
          !hasExportAction && "opacity-50 cursor-not-allowed hover:bg-white hover:border-slate-200",
          className
        )}
      >
        {generando ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#08557f]" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4 text-slate-400 group-hover:text-[#08557f] transition-colors" />
        )}
        <span className="hidden sm:inline">
          {generando ? `Generando ${generando === 'excel' ? 'Excel' : 'PDF'}…` : label}
        </span>
        {generando ? null : (
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
            isOpen && "transform rotate-180"
          )} />
        )}
      </button>
      </Tooltip>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
           className="export-dropdown-portal fixed z-[60] w-48 origin-top overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-200 ease-out motion-reduce:animate-none"
           style={{
             top: coords.top,
             left: coords.left,
           }}
           onClick={(e) => e.stopPropagation()}
        >
          <div className="p-1">
            {onExportExcel && (
              <button
                type="button"
                onClick={() => handleOptionClick('excel', onExportExcel)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-left"
              >
                <div className="shrink-0 p-1.5 bg-emerald-100/50 rounded-md text-emerald-600">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <span className="font-medium">Excel</span>
              </button>
            )}

            {onExportPDF && (
              <button
                type="button"
                onClick={() => handleOptionClick('pdf', onExportPDF)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-left"
              >
                <div className="shrink-0 p-1.5 bg-rose-100/50 rounded-md text-rose-600">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="font-medium">PDF</span>
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
