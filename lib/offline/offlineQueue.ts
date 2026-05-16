import { getOfflineDb, OfflineQueueItem } from './offlineDb';

import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'

// ─── Cola de operaciones offline ─────────────────────────────────

export const offlineQueue = {
  // Agregar operación a la cola
  async enqueue(item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'status' | 'retries'>): Promise<OfflineQueueItem> {
    const db = await getOfflineDb();
    const queueItem: OfflineQueueItem = {
      ...item,
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: toBogotaDateTimeOffsetIso(new Date()),
      status: 'pending',
      retries: 0,
    };
    await db.put('offline-queue', queueItem);
    
    // Notificar cambio
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
    }
    
    return queueItem;
  },

  // Obtener todas las operaciones pendientes (ordenadas por fecha)
  async getPending(): Promise<OfflineQueueItem[]> {
    const db = await getOfflineDb();
    const all = await db.getAllFromIndex('offline-queue', 'by-status', 'pending');
    return all.sort((a, b) => {
      // Prioridad: high > normal > low
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  },

  // Obtener operaciones fallidas
  async getFailed(): Promise<OfflineQueueItem[]> {
    const db = await getOfflineDb();
    return db.getAllFromIndex('offline-queue', 'by-status', 'failed');
  },

  // Obtener todas las operaciones
  async getAll(): Promise<OfflineQueueItem[]> {
    const db = await getOfflineDb();
    const all = await db.getAll('offline-queue');
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Actualizar estado de una operación
  async updateStatus(id: string, status: OfflineQueueItem['status'], lastError?: string, retries?: number): Promise<void> {
    const db = await getOfflineDb();
    const item = await db.get('offline-queue', id);
    if (!item) return;

    item.status = status;
    if (status === 'failed') {
      item.retries = retries != null ? retries : item.retries + 1;
      item.lastError = lastError;
    }
    await db.put('offline-queue', item);

    // Notificar cambio
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
    }
  },

  // Eliminar una operación de la cola
  async remove(id: string): Promise<void> {
    const db = await getOfflineDb();
    await db.delete('offline-queue', id);

    // Notificar cambio
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
    }
  },

  // Limpiar operaciones completadas (synced)
  async clearCompleted(): Promise<void> {
    const db = await getOfflineDb();
    const tx = db.transaction('offline-queue', 'readwrite');
    let cursor = await tx.store.openCursor();
    while (cursor) {
      if (cursor.value.status !== 'pending' && cursor.value.status !== 'syncing') {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  // Contar pendientes
  async countPending(): Promise<number> {
    const db = await getOfflineDb();
    return db.countFromIndex('offline-queue', 'by-status', 'pending');
  },

  // Contar fallidos
  async countFailed(): Promise<number> {
    const db = await getOfflineDb();
    return db.countFromIndex('offline-queue', 'by-status', 'failed');
  },

  // Contar en proceso
  async countSyncing(): Promise<number> {
    const db = await getOfflineDb();
    return db.countFromIndex('offline-queue', 'by-status', 'syncing');
  },

  // Contar completados (historial breve)
  async countCompleted(): Promise<number> {
    const db = await getOfflineDb();
    return db.countFromIndex('offline-queue', 'by-status', 'completed');
  },
};

// ─── Helpers para encolar operaciones específicas ────────────────

export const enqueuePago = async (pagoData: {
  clienteId: string;
  prestamoId: string;
  cobradorId: string;
  montoTotal: number;
  metodoPago?: string;
  notas?: string;
  clienteNombre?: string;
  idempotencyKey?: string;
}) => {
  const idempotencyKey =
    pagoData.idempotencyKey ||
    `offline-payment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return offlineQueue.enqueue({
    type: 'pago',
    endpoint: '/payments',
    method: 'POST',
    data: {
      clienteId: pagoData.clienteId,
      prestamoId: pagoData.prestamoId,
      cobradorId: pagoData.cobradorId,
      montoTotal: pagoData.montoTotal,
      metodoPago: pagoData.metodoPago || 'EFECTIVO',
      notas: pagoData.notas || `[Offline] Pago registrado sin conexión`,
      fechaPago: toBogotaDateTimeOffsetIso(new Date()),
      idempotencyKey,
    },
    description: `Pago $${pagoData.montoTotal.toLocaleString()} - ${pagoData.clienteNombre || 'Cliente'}`,
    amount: pagoData.montoTotal,
    priority: 'high',
  });
};

export const enqueueClienteUpdate = async (
  clienteId: string,
  data: Record<string, unknown>,
  clienteNombre?: string
) => {
  return offlineQueue.enqueue({
    type: 'cliente_update',
    endpoint: `/clients/${clienteId}`,
    method: 'PUT',
    data,
    description: `Actualizar cliente: ${clienteNombre || clienteId}`,
    priority: 'normal',
  });
};

export const enqueueClienteCreate = async (
  data: Record<string, unknown>,
  clienteNombre?: string
) => {
  return offlineQueue.enqueue({
    type: 'cliente_create',
    endpoint: '/clients',
    method: 'POST',
    data,
    description: `Crear cliente: ${clienteNombre || 'Nuevo Cliente'}`,
    priority: 'normal',
  });
};

/**
 * Registra una actividad de sincronización instantánea para ser mostrada en el dashboard.
 * Útil para dar feedback cuando se está online pero se quiere feedback visual de la sync.
 */
export const logSyncActivity = (description: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-activity', { 
      detail: { 
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description,
        timestamp: toBogotaDateTimeOffsetIso(new Date()),
        status: 'completed'
      } 
    }));
  }
};
