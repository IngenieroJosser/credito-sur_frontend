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
      console.log('[SyncService] Sin conexión real. Abortando sync.');
      return;
    }
    console.log('[SyncService] Sincronizando operaciones pendientes...');
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
    // Encolar en IndexedDB
    const item = await offlineQueue.enqueue({
      type,
      endpoint,
      method,
      data: payload,
      file,
      fileName: file ? `upload_${Date.now()}` : undefined,
      description,
      priority: 'normal',
    });

    console.log(`[SyncService] Operacion encolada: ${description}`);

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
