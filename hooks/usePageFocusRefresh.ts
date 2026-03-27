import { useEffect, useRef, useCallback } from 'react'
import { useNotificaciones } from '@/components/providers/NotificacionesProvider'

/**
 * Hook que refresca datos automáticamente en dos situaciones:
 *  1. Cuando el usuario vuelve a poner el foco en la pestaña (visibilitychange)
 *  2. Cuando el socket WebSocket se reconecta tras una desconexión
 *
 * Esto elimina el banner de "datos desactualizados":
 * en lugar de advertirle al usuario, simplemente recargamos silenciosamente.
 *
 * @param onRefresh  Función que recarga los datos de la página
 * @param minInterval  Tiempo mínimo (ms) entre refrescos por foco (default 30s)
 */
export function usePageFocusRefresh(
  onRefresh: () => void | Promise<void>,
  minInterval = 30_000,
) {
  const { socket } = useNotificaciones()
  const lastRefreshRef = useRef<number>(0)
  const refreshRef = useRef(onRefresh)

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  const maybeRefresh = useCallback(() => {
    const now = Date.now()
    if (now - lastRefreshRef.current < minInterval) return
    lastRefreshRef.current = now
    refreshRef.current()
  }, [minInterval])

  // 1. Refrescar cuando la pestaña vuelve a ser visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        maybeRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [maybeRefresh])

  // 2. Refrescar cuando el socket se reconecta (backend estuvo caído o red cortada)
  useEffect(() => {
    if (!socket) return

    const handleReconnect = () => {
      // En reconexión forzamos refresh inmediato (ignorar minInterval)
      lastRefreshRef.current = 0
      maybeRefresh()
    }

    socket.on('connect', handleReconnect)
    return () => {
      socket.off('connect', handleReconnect)
    }
  }, [socket, maybeRefresh])
}
