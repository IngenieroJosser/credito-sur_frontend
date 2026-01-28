'use client'

import { useState, useEffect } from 'react'
import { Route } from 'lucide-react'
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
}

export default function FiltroRuta({ 
  onRutaChange, 
  selectedRutaId = null,
  className = '',
  showAllOption = true,
  hideLabel = false
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
    <div className={cn('flex flex-col gap-2', className)}>
      {!hideLabel && (
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <Route className="h-3.5 w-3.5" />
          Filtrar por Ruta
        </label>
      )}
      
      <select
        value={selectedRutaId || ''}
        onChange={(e) => onRutaChange(e.target.value || null)}
        disabled={loading}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50',
          'focus:bg-white focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900',
          'transition-all text-sm font-medium text-slate-900',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {showAllOption && <option value="">Todas las rutas</option>}
        
        {loading ? (
          <option disabled>Cargando rutas...</option>
        ) : (
          rutas.map((ruta) => (
            <option key={ruta.id} value={ruta.id}>
              {ruta.codigo} - {ruta.nombre} {ruta.cobrador && `(${ruta.cobrador})`}
            </option>
          ))
        )}
      </select>

      {selectedRutaId && (
        <button
          onClick={() => onRutaChange(null)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium text-left transition-colors"
        >
          Limpiar filtro
        </button>
      )}
    </div>
  )
}
