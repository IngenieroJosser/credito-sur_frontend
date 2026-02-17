import { useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { syncService } from '@/lib/offline/syncService';
import { offlineQueue } from '@/lib/offline/offlineQueue';
import { useNotification } from '@/components/providers/NotificationProvider';

/**
 * Hook que gestiona la sincronización automática cuando se recupera la conexión.
 * @param intervalMs Intervalo opcional para polling (por defecto 0 = desactivado)
 */
export function useAutoSync(intervalMs: number = 0) {
  const isOnline = useOnlineStatus();
  const { showNotification } = useNotification();

  // 1. Efecto: Cuando volvemos a estar online
  useEffect(() => {
    if (isOnline) {
      // Verificar si hay pendientes (de db IndexedDB)
      offlineQueue.countPending().then((count) => {
        if (count > 0) {
          showNotification('info', `Sincronizando ${count} operaciones pendientes...`, 'Conexión restaurada');
          
          syncService.processQueue().then(() => {
             // Verificar si terminó todo bien
             offlineQueue.countPending().then(newCount => {
                if (newCount === 0) {
                     showNotification('success', 'Todas las operaciones se han sincronizado correctamente.', 'Sincronización completada');
                }
             });
          });
        }
      });
    }
  }, [isOnline, showNotification]);

  // 2. Efecto: Polling periódico (si se activa)
  useEffect(() => {
    if (intervalMs > 0 && isOnline) {
      const interval = setInterval(() => {
         offlineQueue.countPending().then(count => {
            if (count > 0) syncService.processQueue();
         });
      }, intervalMs);
      return () => clearInterval(interval);
    }
  }, [intervalMs, isOnline]);

  return { isOnline };
}
