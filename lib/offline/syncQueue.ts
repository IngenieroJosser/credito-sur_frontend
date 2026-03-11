import { logger } from '@/lib/logger'
/**
 * Estructura de una operación offline
 */
export interface SyncOperation {
  id: string; // UUID único para evitar duplicidad
  type: string; // 'CREATE_CLIENT', 'CREATE_LOAN', 'CREATE_PAYMENT', etc.
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload: any;
  timestamp: number;
  retryCount: number;
}

const STORAGE_KEY = 'offline_sync_queue';

/**
 * Servicio para manipular la cola de operaciones offline persistida en LocalStorage.
 */
export const syncQueue = {
  /**
   * Obtiene la cola completa ordenada por timestamp.
   */
  getQueue: (): SyncOperation[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error al leer cola offline:', e);
      return [];
    }
  },

  /**
   * Agrega una operación al final de la cola.
   */
  enqueue: (operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>) => {
    const queue = syncQueue.getQueue();
    const newOp: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    queue.push(newOp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    logger.log(`[Offline] Operación encolada: ${newOp.type} (${newOp.id})`);
    return newOp;
  },

  /**
   * Elimina una operación específica de la cola (éxito).
   */
  remove: (id: string) => {
    const queue = syncQueue.getQueue();
    const newQueue = queue.filter(op => op.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newQueue));
  },

  /**
   * Actualiza el contador de reintentos de una operación (fallo recuperable).
   */
  incrementRetry: (id: string) => {
    const queue = syncQueue.getQueue();
    const index = queue.findIndex(op => op.id === id);
    if (index !== -1) {
      queue[index].retryCount += 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  },

  /**
   * Limpia toda la cola.
   */
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
  },
  
  /**
   * Verifica si hay operaciones pendientes.
   */
  hasPending: (): boolean => {
    return syncQueue.getQueue().length > 0;
  }
};

