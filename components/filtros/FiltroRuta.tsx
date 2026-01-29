'use client'

import { useState, useEffect } from 'react'
import { Route, ChevronDown } from 'lucide-react'
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
    <div className={cn('relative flex-1 md:w-64', className)}>
      {!hideLabel && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10">
          <Route className="h-4 w-4 text-slate-400" />
        </div>
      )}
      
      <select
        value={selectedRutaId || ''}
        onChange={(e) => onRutaChange(e.target.value || null)}
        disabled={loading}
        className={cn(
          "w-full pl-11 pr-10 py-2.5 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        {showAllOption && <option value="">Todas las Rutas</option>}
        
        {loading ? (
          <option disabled>Cargando...</option>
        ) : (
          rutas.map((ruta) => (
            <option key={ruta.id} value={ruta.id}>
               {ruta.nombre}
            </option>
          ))
        )}
      </select>
      
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </div>
    </div>
  )
}
