import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core';

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
  // Aqui NO va `[key: string]: unknown`. Lo habia, y era la puerta por la que tres
  // pantallas leian campos que esta copia NO guarda: `offCliente.referencia`,
  // `offPrestamo.totalPagado` y `offPrestamo.montoCuota`, los tres `undefined` siempre.
  // Quitarla cuesta tres sitios y evita que vuelva a pasar.
}

/**
 * La copia local de un prestamo.
 *
 * Dos sitios escriben en este almacen: `mapearPrestamoDescargado` (syncManager, tras
 * cada login) y `ListadoPrestamos`, que guarda las filas del listado tal cual. Los
 * campos de abajo son los que las pantallas offline leen de verdad, y los dos
 * escritores los rellenan.
 *
 * Hay pares que son el mismo dato con dos nombres (`monto`/`montoPrestado`,
 * `saldoPendiente`/`montoPendiente`, `cantidadCuotas`/`cuotasTotales`): el primero es
 * el nombre historico de este almacen y el segundo el que usa `GET /loans`. Se
 * guardan los dos porque hay pantallas leyendo cada uno.
 */
export interface OfflinePrestamo {
  id: string;
  numeroPrestamo: string;
  clienteId: string;
  clienteNombre?: string;
  /** El nombre ya compuesto, igual que `clienteNombre`; asi lo llama `GET /loans`. */
  cliente?: string;
  clienteDni?: string;
  clienteTelefono?: string;
  clienteDireccion?: string;

  monto: number;
  montoPrestado?: number;
  montoTotal: number;
  saldoPendiente: number;
  montoPendiente?: number;
  montoPagado?: number;
  interesTotal?: number;
  moraAcumulada?: number;
  cuotaInicial?: number;
  valorCuota?: number;

  tasaInteres: number;
  /** `GET /loans` no lo manda: queda en 0 y nadie lo lee de la copia local. */
  plazoMeses: number;
  frecuenciaPago: string;
  estado: string;

  cantidadCuotas: number;
  cuotasTotales?: number;
  cuotasPagadas?: number;
  cuotasVencidas?: number;
  progreso?: number;

  producto?: string;
  tipoProducto?: string;
  tipoPrestamo?: string;
  riesgo?: string;
  ruta?: string;
  rutaNombre?: string;

  fechaInicio: string;
  fechaFin: string;
  creadoEn?: string;
  // Aqui NO va `[key: string]: unknown`. Lo habia, y era la puerta por la que tres
  // pantallas leian campos que esta copia NO guarda: `offCliente.referencia`,
  // `offPrestamo.totalPagado` y `offPrestamo.montoCuota`, los tres `undefined` siempre.
  // Quitarla cuesta tres sitios y evita que vuelva a pasar.
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
  /**
   * De ella depende el distintivo de prorroga que calcula
   * `enrich-ruta-historial-riesgo` sobre las visitas, y ese calculo tambien corre sin
   * conexion. Es columna de `model Cuota`.
   */
  fechaVencimientoProrroga?: string | null;
}

export interface OfflineRuta {
  id: string;
  codigo: string;
  nombre: string;
  zona: string;
  activa: boolean;
  cobradorId: string;
  supervisorId: string | null;
  // Aqui NO va `[key: string]: unknown`. Lo habia, y era la puerta por la que tres
  // pantallas leian campos que esta copia NO guarda: `offCliente.referencia`,
  // `offPrestamo.totalPagado` y `offPrestamo.montoCuota`, los tres `undefined` siempre.
  // Quitarla cuesta tres sitios y evita que vuelva a pasar.
}

export interface OfflineQueueItem {
  id: string;
  type: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: unknown;
  file?: Blob;
  fileName?: string;
  description: string;
  amount?: number;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  retries: number;
  lastError?: string;
  priority: 'high' | 'normal' | 'low';
  userId: string;
  /**
   * Id temporal (`temp-...`) que esta operación de creación genera para la UI.
   * Al sincronizarse con éxito, se mapea al id real del servidor para reescribir
   * las referencias en operaciones dependientes (p. ej. crédito → cliente).
   */
  tempId?: string;
}

export interface SyncMeta {
  key: string;
  lastSyncAt: string;
  recordCount: number;
}

// ─── Schema de IndexedDB ─────────────────────────────────────────
/**
 * Las tres copias locales que faltaban por declarar.
 *
 * Los campos son EXACTAMENTE los que `syncManager` guarda en cada almacen
 * (lineas 768-776, 794-801 y 836-842): se sacaron de ahi, no de los modelos del backend,
 * porque la copia local guarda menos. Antes eran `any`, asi que una pantalla offline podia
 * leer un campo que no esta guardado y recibir `undefined` sin que nadie avisara, que es
 * exactamente lo que ya paso con el cliente.
 */
export interface OfflineProducto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  stock: number;
  costo: number;
  activo: boolean;
}

export interface OfflineCaja {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  responsable: string;
  saldo: number;
  estado: string;
}

export interface OfflineUsuario {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: string;
  estado: string;
}

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
  productos: {
    key: string;
    value: OfflineProducto;
    indexes: { 'by-categoria': string };
  };
  cajas: {
    key: string;
    value: OfflineCaja;
    indexes: { 'by-tipo': string };
  };
  usuarios: {
    key: string;
    value: OfflineUsuario;
    indexes: { 'by-rol': string };
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

/**
 * Versión del esquema de IndexedDB. Subirla dispara `upgrade` en cada
 * dispositivo la próxima vez que abre la app.
 *
 * OJO al cambiar el esquema: `upgrade` de abajo solo CREA los stores que no
 * existen. Agregar un índice a un store que ya existe, o cambiar su keyPath,
 * no se aplica solo con subir la versión: hay que migrarlo explícitamente
 * usando `oldVersion`, o los celulares que ya tenían la base se quedan con el
 * esquema viejo y las consultas por ese índice fallan.
 */
const DB_VERSION = 2;

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
        
        // Productos
        if (!db.objectStoreNames.contains('productos')) {
          const productosStore = db.createObjectStore('productos', { keyPath: 'id' });
          productosStore.createIndex('by-categoria', 'categoria');
        }

        // Cajas
        if (!db.objectStoreNames.contains('cajas')) {
          const cajasStore = db.createObjectStore('cajas', { keyPath: 'id' });
          cajasStore.createIndex('by-tipo', 'tipo');
        }

        // Usuarios
        if (!db.objectStoreNames.contains('usuarios')) {
          const usuariosStore = db.createObjectStore('usuarios', { keyPath: 'id' });
          usuariosStore.createIndex('by-rol', 'rol');
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

type StoreName = 'clientes' | 'prestamos' | 'cuotas' | 'rutas' | 'productos' | 'cajas' | 'usuarios';

export const offlineStore = {
  // Guardar múltiples registros (bulk upsert o overwrite completo)
  /**
   * El generico va ATADO al almacen: `OfflineDB[K]['value']`.
   *
   * Antes era `<T extends { id: string }>`, o sea que cualquier objeto con id entraba en
   * cualquier almacen: guardar clientes en el almacen de prestamos compilaba. Se pudo
   * cerrar al declarar los tres almacenes que seguian en `any` (productos, cajas y
   * usuarios): mientras uno fuera `any`, la union aceptaba todo.
   */
  async saveMany<K extends StoreName>(
    store: K,
    items: OfflineDB[K]['value'][],
    overwrite = false,
  ): Promise<void> {
    const db = await getOfflineDb();
    
    if (overwrite) {
      await db.clear(store);
      // Si se reemplazan los préstamos también se borran las cuotas: son hijas
      // de los préstamos, y sin esto quedarían cuotas de créditos que ya no
      // están en la copia local.
      if (store === 'prestamos') {
        await db.clear('cuotas');
      }
    }

    const tx = db.transaction(store, 'readwrite');
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;

    // Actualizar metadata de sync
    const metaDb = await getOfflineDb();
    const count = await metaDb.count(store);
    await metaDb.put('sync-meta', {
      key: store,
      lastSyncAt: toBogotaDateTimeOffsetIso(new Date()),
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
  /**
   * El cast del nombre del indice es de la firma de idb, no del dato.
   *
   * idb tipa `getAllFromIndex` contra UN almacen concreto; con `store: StoreName` (la
   * union entera) los indices validos son la interseccion de todos, o sea `never`. Se
   * probo hacer la funcion generica sobre el almacen para que idb resolviera los
   * indices de cada uno, y no sirve: los tres llamadores pasan el tipo del resultado
   * explicitamente (`getByIndex<T>(...)`), y cuando se dan algunos argumentos de tipo
   * a mano TypeScript deja de inferir el resto y usa su valor por omision, que vuelve
   * a ser la union entera.
   *
   * Antes el cast era `(db)`, que apagaba la comprobacion de TODA la llamada.
   * Ahora se usa la vista SIN esquema de idb (`IDBPDatabase` a secas), que acepta
   * nombres de almacen e indice como texto: se sigue comprobando que el metodo exista y
   * que los argumentos sean los que pide, en vez de no comprobar nada.
   */
  async getByIndex<T>(store: StoreName, indexName: string, value: string): Promise<T[]> {
    const db = (await getOfflineDb()) as IDBPDatabase;
    return db.getAllFromIndex(store, indexName, value) as Promise<T[]>;
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

  /**
   * Borra la copia local de los datos del servidor (clientes, préstamos,
   * cuotas, rutas, productos, cajas, usuarios) y su metadata de sincronización.
   *
   * NO borra la cola offline (`offline-queue`): ahí están las operaciones que
   * todavía no llegaron al servidor (pagos, créditos, visitas hechas sin red).
   * Antes sí la borraba y esas operaciones se perdían sin aviso, aunque los dos
   * llamadores esperan lo contrario: la purga tras cerrar sesión promete
   * conservarla, y "Limpiar caché local" promete una resincronización, que no
   * existe si se tiran operaciones sin enviar.
   *
   * Conservarla al cambiar de cuenta es seguro: cada operación está sellada con
   * su usuario y `syncManager` solo envía las del usuario con sesión. Para
   * vaciar la cola a propósito existe `offlineQueue.clearAll()`.
   */
  async clearAll(): Promise<void> {
    const db = await getOfflineDb();
    await Promise.all([
      db.clear('clientes'),
      db.clear('prestamos'),
      db.clear('cuotas'),
      db.clear('rutas'),
      db.clear('productos'),
      db.clear('cajas'),
      db.clear('usuarios'),
      db.clear('sync-meta'),
    ]);
  },

  // Contar registros
  async count(store: StoreName): Promise<number> {
    const db = await getOfflineDb();
    return db.count(store);
  },
};
