import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

interface MyDB extends DBSchema {
  'api-cache': {
    key: string;
    value: CacheEntry;
    indexes: { 'by-expiresAt': number };
  };
}

const DB_NAME = 'creditsur-api-cache';
const STORE_NAME = 'api-cache';
const DEFAULT_TTL = 30_000; // 30 segundos (igual que antes)

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

const getDb = async () => {
  if (!dbPromise) {
    dbPromise = openDB<MyDB>(DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME);
        store.createIndex('by-expiresAt', 'expiresAt');
      },
    });
  }
  return dbPromise;
};

export const getCacheKey = (method: string, url: string, params?: Record<string, unknown>) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sessionNamespace = token ? hashSessionToken(token) : 'anonymous';
  const base = `${sessionNamespace}:${method.toUpperCase()}:${url}`;
  if (!params || Object.keys(params).length === 0) return base;
  // Serializar params ordenados para que el mismo conjunto de filtros genere la misma clave
  const sorted = Object.keys(params).sort().reduce<Record<string, unknown>>((acc, k) => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') acc[k] = params[k];
    return acc;
  }, {});
  if (Object.keys(sorted).length === 0) return base;
  return `${base}?${JSON.stringify(sorted)}`;
};

const hashSessionToken = (token: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};


export const getCached = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await getDb();
    const entry = await db.get(STORE_NAME, key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      // Eliminar entrada expirada
      await db.delete(STORE_NAME, key);
      return null;
    }

    return entry.data as T;
  } catch (error) {
    console.error('Error reading from IndexedDB:', error);
    return null;
  }
};

export const setCache = async <T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
) => {
  try {
    const db = await getDb();
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttl,
    };
    await db.put(STORE_NAME, entry, key);
  } catch (error) {
    console.error('Error writing to IndexedDB:', error);
  }
};

// Invalida toda la caché (útil después de mutaciones)
export const invalidateCache = async () => {
  try {
    const db = await getDb();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

export const clearCache = invalidateCache;

// Opcional: limpiar entradas expiradas manualmente (puedes llamarla periódicamente)
export const cleanExpired = async () => {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.store.index('by-expiresAt');
    let cursor = await index.openCursor();
    const now = Date.now();
    while (cursor) {
      if (cursor.value.expiresAt <= now) {
        cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (error) {
    console.error('Error cleaning expired cache:', error);
  }
};