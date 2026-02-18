import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ─── Tipos para los stores offline ───────────────────────────────
export interface OfflineCliente {
  id: string;
  codigo: string;
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  direccion: string | null;
  correo: string | null;
  nivelRiesgo: string;
  rutaId?: string;
  prestamosActivos?: number;
  montoTotal?: number;
  montoMora?: number;
  [key: string]: unknown;
}

export interface OfflinePrestamo {
  id: string;
  numeroPrestamo: string;
  clienteId: string;
  clienteNombre?: string;
  monto: number;
  montoTotal: number;
  saldoPendiente: number;
  tasaInteres: number;
  plazoMeses: number;
  frecuenciaPago: string;
  estado: string;
  cantidadCuotas: number;
  fechaInicio: string;
  fechaFin: string;
  [key: string]: unknown;
}

export interface OfflineCuota {
  id: string;
  prestamoId: string;
  numeroCuota: number;
  fechaVencimiento: string;
  monto: number;
  montoCapital: number;
  montoInteres: number;
  montoInteresMora: number;
  estado: string;
  montoPagado: number;
  fechaPago: string | null;
}

export interface OfflineRuta {
  id: string;
  codigo: string;
  nombre: string;
  zona: string;
  activa: boolean;
  cobradorId: string;
  supervisorId: string | null;
  [key: string]: unknown;
}

export interface OfflineQueueItem {
  id: string;
  type: 'pago' | 'cliente_update' | 'prestamo_update' | 'cliente_create' | 'prestamo_create' | 'cliente_delete';
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: unknown;
  file?: Blob;
  fileName?: string;
  description: string;
  amount?: number;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  retries: number;
  lastError?: string;
  priority: 'high' | 'normal' | 'low';
}

export interface SyncMeta {
  key: string;
  lastSyncAt: string;
  recordCount: number;
}

// ─── Schema de IndexedDB ─────────────────────────────────────────
interface OfflineDB extends DBSchema {
  clientes: {
    key: string;
    value: OfflineCliente;
    indexes: { 'by-rutaId': string; 'by-dni': string };
  };
  prestamos: {
    key: string;
    value: OfflinePrestamo;
    indexes: { 'by-clienteId': string; 'by-estado': string };
  };
  cuotas: {
    key: string;
    value: OfflineCuota;
    indexes: { 'by-prestamoId': string; 'by-estado': string };
  };
  rutas: {
    key: string;
    value: OfflineRuta;
    indexes: { 'by-cobradorId': string };
  };
  'offline-queue': {
    key: string;
    value: OfflineQueueItem;
    indexes: { 'by-status': string; 'by-createdAt': string };
  };
  'sync-meta': {
    key: string;
    value: SyncMeta;
  };
}

const DB_NAME = 'creditsur-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

export const getOfflineDb = async (): Promise<IDBPDatabase<OfflineDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Clientes
        if (!db.objectStoreNames.contains('clientes')) {
          const clientesStore = db.createObjectStore('clientes', { keyPath: 'id' });
          clientesStore.createIndex('by-rutaId', 'rutaId');
          clientesStore.createIndex('by-dni', 'dni');
        }

        // Préstamos
        if (!db.objectStoreNames.contains('prestamos')) {
          const prestamosStore = db.createObjectStore('prestamos', { keyPath: 'id' });
          prestamosStore.createIndex('by-clienteId', 'clienteId');
          prestamosStore.createIndex('by-estado', 'estado');
        }

        // Cuotas
        if (!db.objectStoreNames.contains('cuotas')) {
          const cuotasStore = db.createObjectStore('cuotas', { keyPath: 'id' });
          cuotasStore.createIndex('by-prestamoId', 'prestamoId');
          cuotasStore.createIndex('by-estado', 'estado');
        }

        // Rutas
        if (!db.objectStoreNames.contains('rutas')) {
          const rutasStore = db.createObjectStore('rutas', { keyPath: 'id' });
          rutasStore.createIndex('by-cobradorId', 'cobradorId');
        }

        // Cola de operaciones offline
        if (!db.objectStoreNames.contains('offline-queue')) {
          const queueStore = db.createObjectStore('offline-queue', { keyPath: 'id' });
          queueStore.createIndex('by-status', 'status');
          queueStore.createIndex('by-createdAt', 'createdAt');
        }

        // Metadata de sincronización
        if (!db.objectStoreNames.contains('sync-meta')) {
          db.createObjectStore('sync-meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

// ─── Operaciones genéricas ───────────────────────────────────────

type StoreName = 'clientes' | 'prestamos' | 'cuotas' | 'rutas';

export const offlineStore = {
  // Guardar múltiples registros (bulk upsert)
  async saveMany<T extends { id: string }>(store: StoreName, items: T[]): Promise<void> {
    const db = await getOfflineDb();
    const tx = db.transaction(store, 'readwrite');
    for (const item of items) {
      await tx.store.put(item as any);
    }
    await tx.done;

    // Actualizar metadata de sync
    const metaDb = await getOfflineDb();
    const count = await metaDb.count(store);
    await metaDb.put('sync-meta', {
      key: store,
      lastSyncAt: new Date().toISOString(),
      recordCount: count,
    });
  },

  // Obtener todos los registros de un store
  async getAll<T>(store: StoreName): Promise<T[]> {
    const db = await getOfflineDb();
    return db.getAll(store) as Promise<T[]>;
  },

  // Obtener un registro por ID
  async getById<T>(store: StoreName, id: string): Promise<T | undefined> {
    const db = await getOfflineDb();
    return db.get(store, id) as Promise<T | undefined>;
  },

  // Obtener registros por índice
  async getByIndex<T>(store: StoreName, indexName: string, value: string): Promise<T[]> {
    const db = await getOfflineDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db as any).getAllFromIndex(store, indexName, value) as Promise<T[]>;
  },

  // Obtener metadata de sincronización
  async getSyncMeta(store: StoreName): Promise<SyncMeta | undefined> {
    const db = await getOfflineDb();
    return db.get('sync-meta', store);
  },

  // Limpiar un store completo
  async clear(store: StoreName): Promise<void> {
    const db = await getOfflineDb();
    await db.clear(store);
  },

  // Contar registros
  async count(store: StoreName): Promise<number> {
    const db = await getOfflineDb();
    return db.count(store);
  },
};
