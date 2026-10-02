/**
 * Envoltura para dar RESPALDO OFFLINE a una operación de escritura: intenta la
 * llamada normal y, si falla por falta de red, la encola para sincronizarla
 * luego y devuelve un valor optimista para que la UI no se rompa.
 *
 * Centraliza el patrón (antes repetido en cada servicio) para no equivocarse en
 * la detección del error de red. La validación de negocio (permisos, cuatro-ojos,
 * estado) NO se salta: se aplica en el servidor cuando la cola se reproduce; si
 * ya no procede, la operación cae al pipeline de conflictos.
 */
import { logger } from '@/lib/logger';
import { syncService } from './syncService';

/**
 * ¿El error indica falta de conectividad, y no una respuesta del servidor?
 *
 * Distinguirlo importa: si el servidor contestó 403 o 409, la operación se
 * rechazó de verdad y encolarla para reintentarla offline solo repetiría el
 * rechazo. Solo se encola cuando la petición no llegó a salir.
 *
 * El criterio que de verdad decide es `statusCode === 0`: `apiRequest`
 * normaliza ahí cualquier fallo de red de axios (lib/api/api.ts, donde mira
 * ERR_NETWORK, ECONNREFUSED y ETIMEDOUT) antes de relanzarlo. Los otros tres
 * se conservan por si el error llega sin pasar por ahí.
 *
 * Nota sobre el tercero: `includes('network')` va en minúscula y el mensaje
 * de axios es "Network Error", así que NO casa. No se quita porque tampoco
 * estorba y sí cubre un mensaje escrito a mano; quien lo lea, que sepa que no
 * es el que atrapa los errores de axios: ese lo atrapa `statusCode === 0`.
 */
export function esErrorDeRed(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;

  if (!error || typeof error !== 'object') return false;
  const e = error as { statusCode?: unknown; message?: unknown; code?: unknown };

  return (
    e.statusCode === 0 ||
    (typeof e.message === 'string' && e.message.includes('network')) ||
    e.code === 'ERR_NETWORK'
  );
}

interface EncolarSpec {
  type: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  description: string;
  /** Id temporal si esta operación crea una entidad (para remapeo temp→real). */
  tempId?: string;
}

export async function conRespaldoOffline<T>(
  ejecutar: () => Promise<T>,
  spec: EncolarSpec,
  optimista: T,
): Promise<T> {
  try {
    return await ejecutar();
  } catch (error) {
    if (esErrorDeRed(error)) {
      logger.log(`[Offline Mode] Encolando: ${spec.description}`);
      await syncService.enqueueOperation(
        spec.type,
        spec.endpoint,
        spec.method,
        spec.data,
        spec.description,
        undefined,
        spec.tempId,
      );
      return optimista;
    }
    throw error;
  }
}
