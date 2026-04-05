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
  onRefresh: (...args: any[]) => void | Promise<void>,
) {
  const { socket } = useNotificaciones()
  // Ref estable para no re-suscribir si onRefresh cambia de referencia
  const refreshRef = useRef(onRefresh)

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  const stableHandler = useCallback((...args: any[]) => {
    refreshRef.current(...args)
  }, [])

  useEffect(() => {
    if (!socket) return

    events.forEach((ev) => socket.on(ev, stableHandler))

    return () => {
      events.forEach((ev) => socket.off(ev, stableHandler))
    }
  }, [socket, stableHandler, ...events])
}
