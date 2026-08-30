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

/** ¿El error indica falta de conectividad (no una respuesta HTTP del servidor)? */
export function esErrorDeRed(error: any): boolean {
  // Mismo criterio probado que ya usaban los servicios: NO tratar un error HTTP
  // (403, 409, 500…) como falta de red, para no encolar algo que el servidor
  // rechazó de verdad.
  return (
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    error?.statusCode === 0 ||
    (typeof error?.message === 'string' && error.message.includes('network')) ||
    error?.code === 'ERR_NETWORK'
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
  } catch (error: any) {
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
