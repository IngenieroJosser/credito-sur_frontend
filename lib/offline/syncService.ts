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
    file?: Blob,
    // Id temporal que la UI generó para esta creación (para remapear luego al
    // id real del servidor en operaciones dependientes).
    tempId?: string
  ) {
    const idempotentTypes = new Set([
      'pago',
      'gasto_registrar',
      'transaccion_crear',
      'cliente_create',
      'cliente_crear',
      'cliente_update',
      'cliente_actualizar',
      'prestamo_create',
      'prestamo_crear',
      'venta_contado',
      'abono_deuda_cobrador',
    ]);
    const data =
      idempotentTypes.has(type) && payload && typeof payload === 'object' && !(payload instanceof FormData)
        ? {
            ...(payload as Record<string, unknown>),
            idempotencyKey:
              (payload as Record<string, unknown>).idempotencyKey ||
              `offline-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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
      tempId,
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

