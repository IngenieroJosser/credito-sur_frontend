'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { cn } from '@/lib/utils'
import { routesService } from '@/services/routes-service'
import { offlineStore, type OfflineRuta } from '@/lib/offline/offlineDb'

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
  /**
   * Añade un botón «Sin ruta» que busca los créditos huérfanos.
   *
   * Ningún crédito puede quedar sin ruta —no entra en la jornada de nadie:
   * existe, genera mora y nadie va a cobrarlo—. Ya no se pueden crear así,
   * pero los que quedaron de antes eran invisibles: ninguna pantalla los
   * listaba. Medido al añadir esto en la base de desarrollo: 26 créditos sin
   * ruta, 24 de ellos EN MORA.
   *
   * Va como opción y no siempre, porque en las pantallas donde la ruta es el
   * contexto de trabajo —la jornada— no tiene sentido.
   */
  mostrarSinRuta?: boolean
  hideLabel?: boolean
  layout?: 'scroll' | 'wrap'
}

export default function FiltroRuta({ 
  onRutaChange, 
  selectedRutaId = null,
  className = '',
  showAllOption = true,
  mostrarSinRuta = false,
  hideLabel = false,
  layout = 'scroll'
}: FiltroRutaProps) {
  const [rutas, setRutas] = useState<RutaOption[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRutas = useCallback(async () => {
    setLoading(true)
    try {
      const response = await routesService.getAll({ limit: 100 })
      const rutasData: RutaOption[] = (response?.data || []).map((r) => ({
        id: r.id,
        nombre: r.nombre,
        codigo: r.codigo,
        // `cobrador` ya viene como nombre armado. La rama de `cobrador_` que habia
        // aqui estaba muerta: ese campo no existe en ninguna respuesta del backend.
        cobrador: r.cobrador || undefined,
      }))
      setRutas(rutasData)
      offlineStore.saveMany('rutas', rutasData.map(r => ({ ...r, zona: '', activa: true, cobradorId: '', supervisorId: null }))).catch(() => {})
    } catch (err) {
      console.error('Error cargando rutas:', err)
      try {
        const offlineRutas = await offlineStore.getAll<OfflineRuta>('rutas')
        setRutas(offlineRutas.map((r) => ({ id: r.id, nombre: r.nombre, codigo: r.codigo })))
      } catch {
        setRutas([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRutas() }, [fetchRutas])

  // Se re-carga el listado de rutas cuando se crean/modifican rutas en tiempo real
  useRealtimeData(['dashboards_actualizados'], fetchRutas)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {!hideLabel && (
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Filtrar por Ruta Operativa</div>
      )}

      <div
        role="group"
        aria-label="Filtrar por ruta operativa"
        className={cn(
          "flex items-center gap-1.5",
          layout === 'scroll' ? "flex-row overflow-x-auto pb-2 scrollbar-hide flex-nowrap min-w-0" : "flex-row flex-wrap"
        )}
      >
        {/*
          * Cuando este filtro va SIN su titulo, el nombre se pone aqui, en
          * linea, en vez de desaparecer.
          *
          * Lo describio el dueno con una captura: en el listado de clientes
          * salia la fila «ESTADO · Todos · Pendientes · ... · Lista Negra ·
          * Todas», con DOS pastillas marcadas. La ultima es de este filtro y
          * no de Estado, pero como `hideLabel` le quitaba el nombre, se leia
          * como una novena opcion de estado.
          *
          * Es exactamente el problema que `GrupoDeFiltros` ya resolvio —«dos
          * botones Todos identicos y nada que diga cual quita que»—, solo que
          * este componente se quedo fuera de aquel arreglo. Ahora lleva el
          * mismo nombre en linea, con el mismo aspecto.
          */}
        {hideLabel && (
          <span className="mr-0.5 shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Ruta
          </span>
        )}
        {showAllOption && (
          <button
            onClick={() => onRutaChange(null)}
            disabled={loading}
            aria-pressed={selectedRutaId === null}
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

        {mostrarSinRuta && (
          <button
            onClick={() => onRutaChange('sin-ruta')}
            disabled={loading}
            aria-pressed={selectedRutaId === 'sin-ruta'}
            title="Créditos que no están en ninguna ruta: nadie va a cobrarlos"
            className={cn(
              'px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap',
              layout === 'scroll' && 'shrink-0',
              selectedRutaId === 'sin-ruta'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200',
            )}
          >
            Sin ruta
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
              aria-pressed={selectedRutaId === ruta.id}
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
