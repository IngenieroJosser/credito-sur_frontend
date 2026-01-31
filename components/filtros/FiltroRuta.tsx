'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

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
    // Simular carga de rutas desde API
    const fetchRutas = async () => {
      setLoading(true)
      // TODO: Reemplazar con llamada real a la API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockRutas: RutaOption[] = [
        { id: 'RT-001', nombre: 'Ruta Centro', codigo: 'CENTRO-01', cobrador: 'Carlos Pérez' },
        { id: 'RT-002', nombre: 'Ruta Norte', codigo: 'NORTE-01', cobrador: 'María Rodríguez' },
        { id: 'RT-003', nombre: 'Ruta Este', codigo: 'ESTE-01', cobrador: 'Pedro Gómez' },
        { id: 'RT-004', nombre: 'Ruta Sur - Expansión', codigo: 'SUR-EXP-01', cobrador: 'Juanito Alimaña' },
      ]
      
      setRutas(mockRutas)
      setLoading(false)
    }

    fetchRutas()
  }, [])

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {!hideLabel && (
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Filtrar por Ruta Operativa</div>
      )}
      
      <div className={cn(
        "flex items-center gap-2",
        layout === 'scroll' ? "flex-row overflow-x-auto pb-2 scrollbar-hide flex-nowrap min-w-0" : "flex-row flex-wrap"
      )}>
        {showAllOption && (
          <button
            onClick={() => onRutaChange(null)}
            disabled={loading}
            className={cn(
              "whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-black transition-all border shadow-sm active:scale-95 uppercase tracking-tighter",
              layout === 'scroll' && "shrink-0",
              selectedRutaId === null 
                ? "bg-blue-600 text-white border-blue-600 shadow-blue-200 shadow-lg" 
                : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
            )}
          >
            Todas las Rutas
          </button>
        )}
        
        {loading ? (
          <div className="flex gap-2 shrink-0">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 w-32 bg-slate-100 rounded-2xl animate-pulse border border-slate-50" />
            ))}
          </div>
        ) : (
          rutas.map((ruta) => (
            <button
              key={ruta.id}
              onClick={() => onRutaChange(ruta.id)}
              className={cn(
                "whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-black transition-all border shadow-sm active:scale-95 uppercase tracking-tighter",
                layout === 'scroll' && "shrink-0",
                selectedRutaId === ruta.id 
                  ? "bg-blue-600 text-white border-blue-600 shadow-blue-200 shadow-lg" 
                  : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
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
