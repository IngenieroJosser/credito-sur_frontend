import { offlineQueue } from './offlineQueue';
import { syncManager } from './syncManager';

/**
 * Servicio unificado de sincronización.
 * Actúa como fachada para el sistema offline existente (IndexedDB + SyncManager).
 */
export const syncService = {
  /**
   * Procesa la cola de operaciones pendientes.
   */
  async processQueue() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('❌ [SyncService] No hay conexión. Abortando.');
      return;
    }
    console.log('🔄 [SyncService] Sincronizando operaciones pendientes...');
    return await syncManager.processQueue();
  },

  /**
   * Encola una operación genérica y trata de sincronizar si es posible.
   * Adapta la llamada a la estructura de offlineQueue.enqueue
   */
  async enqueueOperation(
    type: 'pago' | 'cliente_update' | 'prestamo_update' | 'cliente_create' | 'prestamo_create' | 'cliente_delete',
    endpoint: string,
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    payload: any,
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

    console.log(`📥 [SyncService] Operación encolada: ${description}`);

    // Intentar sincronizar inmediatamente si hay red (Fire & Forget)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.processQueue();
    }

    return item;
  }
};
