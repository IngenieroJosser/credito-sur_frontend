'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { routesService } from '@/services/routes-service'

interface RutaOption {
  id: string
  nombre: string
  codigo: string
  cobrador?: string
}

interface FiltroRutaProps {
  onRutaChange: (rutaId: string | null) => void
  selectedRutaId?: string | null
  className?: string
  showAllOption?: boolean
  hideLabel?: boolean
  layout?: 'scroll' | 'wrap'
}

export default function FiltroRuta({ 
  onRutaChange, 
  selectedRutaId = null,
  className = '',
  showAllOption = true,
  hideLabel = false,
  layout = 'scroll'
}: FiltroRutaProps) {
  const [rutas, setRutas] = useState<RutaOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRutas = async () => {
      setLoading(true)
      try {
        const response = await routesService.getAll({ limit: 100 })
        const rutasData: RutaOption[] = (response?.data || []).map((r) => ({
          id: r.id,
          nombre: r.nombre,
          codigo: r.codigo,
          cobrador: r.cobrador || (r.cobrador_ ? `${r.cobrador_.nombres} ${r.cobrador_.apellidos}` : undefined),
        }))
        setRutas(rutasData)
      } catch (err) {
        console.error('Error cargando rutas:', err)
        setRutas([])
      } finally {
        setLoading(false)
      }
    }

    fetchRutas()
  }, [])

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {!hideLabel && (
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Filtrar por Ruta Operativa</div>
      )}
      
      <div className={cn(
        "flex items-center gap-1.5",
        layout === 'scroll' ? "flex-row overflow-x-auto pb-2 scrollbar-hide flex-nowrap min-w-0" : "flex-row flex-wrap"
      )}>
        {showAllOption && (
          <button
            onClick={() => onRutaChange(null)}
            disabled={loading}
            className={cn(
              "px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap",
              layout === 'scroll' && "shrink-0",
              selectedRutaId === null 
                ? "bg-primary text-white shadow-md shadow-primary/20" 
                : "bg-slate-100/50 text-slate-600 hover:bg-slate-200/70 border border-slate-200"
            )}
          >
            Todas
          </button>
        )}
        
        {loading ? (
          <div className="flex gap-2 shrink-0">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-7 w-24 bg-slate-100 rounded-xl animate-pulse border border-slate-50" />
            ))}
          </div>
        ) : (
          rutas.map((ruta) => (
            <button
              key={ruta.id}
              onClick={() => onRutaChange(ruta.id)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap",
                layout === 'scroll' && "shrink-0",
                selectedRutaId === ruta.id 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "bg-slate-100/50 text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              )}
            >
              {ruta.nombre}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
