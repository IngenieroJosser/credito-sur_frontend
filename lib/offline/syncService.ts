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
      'cliente_update',
      'prestamo_create',
      'prestamo_crear',
      'venta_contado',
      'abono_deuda_cobrador',
      /*
       * La reprogramacion de una cuota crea una APROBACION, asi que un reintento
       * de la cola la duplica: dos solicitudes pendientes para la misma cuota, y
       * si el aprobador las aprueba las dos, la fecha se mueve dos veces.
       *
       * El backend ya la deduplica por clave —`solicitarReprogramacion` busca
       * `aprobacion.findFirst({ where: { idempotencyKey } })` antes de crear— y
       * las pantallas solo mandaban clave en el caso de cierre pendiente. Para el
       * caso normal no habia ninguna, ni en el admin, ni en el cobrador, ni en el
       * supervisor, ni en el coordinador.
       *
       * La clave se estampa AQUI, al encolar, y no en cada reintento: eso es lo
       * que hace que el segundo intento sea el mismo que el primero. Es el motivo
       * de que esta lista exista.
       */
      'prestamo_reprogramar',
      /*
       * Son DOS funciones distintas y las dos crean una aprobacion:
       * `reprogramarPrestamo` encola `prestamo_reprogramar`, y
       * `solicitarReprogramacionCuota` —la que llaman las cuatro pantallas de
       * ruta— encola `reprogramacion_cuota_solicitar`. Anadir solo la primera
       * dejaba sin proteger justo la que se usa.
       */
      'reprogramacion_cuota_solicitar',
      /*
       * `cliente_actualizar` y `cliente_crear` estaban en esta lista y NADIE los
       * encola: los tipos de verdad son `cliente_update` y `cliente_create`, que
       * tambien estan. Se quedan los dos fantasmas fuera.
       */
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

