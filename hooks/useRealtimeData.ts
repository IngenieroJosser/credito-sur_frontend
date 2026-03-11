import { useEffect, useRef, useCallback } from 'react'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider'

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
  onRefresh: () => void | Promise<void>,
) {
  const { socket } = useNotificaciones()
  // Ref estable para no re-suscribir si onRefresh cambia de referencia
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  const stableHandler = useCallback(() => {
    refreshRef.current()
  }, [])

  useEffect(() => {
    if (!socket) return

    events.forEach((ev) => socket.on(ev, stableHandler))

    return () => {
      events.forEach((ev) => socket.off(ev, stableHandler))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, stableHandler, ...events])
}
