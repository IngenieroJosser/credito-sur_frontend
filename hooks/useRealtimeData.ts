import { useEffect, useRef, useCallback } from 'react'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider'
import type { EventoDeJornada } from '@/types/obligacion-jornada'

/**
 * Hook que suscribe el componente a eventos de WebSocket del backend.
 * Cuando el backend emite cualquiera de los `events` listados, llama a `onRefresh`.
 *
 * Uso:
 *   useRealtimeData(['clientes_actualizados'], fetchClientes)
 *   useRealtimeData(['prestamos_actualizados', 'pagos_actualizados'], reload)
 */
export function useRealtimeData(
  events: string[],
  /**
   * Que hacer cuando llega el evento.
   *
   * El parametro es la carga del socket. Los cinco sitios que la leen esperan un
   * `EventoDeJornada` -el contrato de types/obligacion-jornada, que ya describe los
   * campos que los emisores mandan- y el resto declara un callback sin parametros, que
   * sigue encajando. NADIE valida esa carga en tiempo de ejecucion: el tipo dice lo que
   * el backend emite, no lo comprueba.
   */
  onRefresh: (payload?: EventoDeJornada) => void | Promise<void>,
) {
  const { socket } = useNotificaciones()
  // Ref estable para no re-suscribir si onRefresh cambia de referencia
  const refreshRef = useRef(onRefresh)

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  const stableHandler = useCallback((payload?: EventoDeJornada) => {
    void refreshRef.current(payload)
  }, [])

  useEffect(() => {
    if (!socket) return

    events.forEach((ev) => socket.on(ev, stableHandler))

    return () => {
      events.forEach((ev) => socket.off(ev, stableHandler))
    }
  }, [socket, stableHandler, ...events])
}
