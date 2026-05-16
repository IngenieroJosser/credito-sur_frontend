import { logger } from '@/lib/logger'
import { offlineQueue } from './offlineQueue';
import { syncManager } from './syncManager';
import { checkRealConnectivity } from './connectivity';

/**
 * Servicio unificado de sincronización.
 * Actúa como fachada para el sistema offline existente (IndexedDB + SyncManager).
 */
export const syncService = {
  /**
   * Procesa la cola de operaciones pendientes.
   */
  async processQueue() {
    const isOnline = await checkRealConnectivity();
    if (!isOnline) {
      logger.log('[SyncService] Sin conexión real. Abortando sync.');
      return;
    }
    logger.log('[SyncService] Sincronizando operaciones pendientes...');
    const result = await syncManager.processQueue();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
    }

    return result;
  },

  /**
   * Encola una operación genérica y trata de sincronizar si es posible.
   * Adapta la llamada a la estructura de offlineQueue.enqueue.
   */
  async enqueueOperation(
    type: string,
    endpoint: string,
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    payload: unknown,
    description: string,
    file?: Blob
  ) {
    const data =
      type === 'pago' && payload && typeof payload === 'object' && !(payload instanceof FormData)
        ? {
            ...(payload as Record<string, unknown>),
            idempotencyKey:
              (payload as Record<string, unknown>).idempotencyKey ||
              `offline-payment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          }
        : payload;

    // Encolar en IndexedDB
    const item = await offlineQueue.enqueue({
      type,
      endpoint,
      method,
      data,
      file,
      fileName: file ? `upload_${Date.now()}` : undefined,
      description,
      priority: 'normal',
    });

    logger.log(`[SyncService] Operacion encolada: ${description}`);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
    }

    // Intentar sincronizar inmediatamente si hay conexión real (Fire & Forget)
    checkRealConnectivity().then((isOnline) => {
      if (isOnline) this.processQueue();
    });

    return item;
  },
};

