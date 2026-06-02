import { logger } from '@/lib/logger'
import { apiRequest } from "@/lib/api/api";
import { syncService } from '@/lib/offline/syncService';
import { NivelRiesgo, EstadoAprobacion } from '@/types/enums';
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'

const generarIdempotencyKey = (prefix: string) => {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}-${Date.now()}-${random}`;
};

export type { NivelRiesgo, EstadoAprobacion };

export interface Cliente {
  id: string;
  codigo: string;
  dni: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  telefono: string;
  direccion: string | null;
  referencia: string | null;
  referencia1Nombre: string | null;
  referencia1Telefono: string | null;
  referencia2Nombre: string | null;
  referencia2Telefono: string | null;
  nivelRiesgo: NivelRiesgo;
  puntaje: number;
  enListaNegra: boolean;
  estadoAprobacion: EstadoAprobacion;
  razonListaNegra?: string | null;
  fechaListaNegra?: string | null;
  creadoEn: string;
  actualizadoEn: string;
  eliminadoEn?: string | null;
  // Campos calculados que vienen del backend
  prestamosActivos?: number;
  montoTotal?: number;
  montoMora?: number;
  diasMora?: number;
  ultimoPago?: string;
  rutaId?: string;
  categoriaId?: string;
}

export interface CrearClienteDto {
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  direccion?: string;
  correo?: string;
  referencia?: string;
  referencia1Nombre?: string;
  referencia1Telefono?: string;
  referencia2Nombre?: string;
  referencia2Telefono?: string;
  nivelRiesgo?: NivelRiesgo;
  puntaje?: number;
  enListaNegra?: boolean;
  creadoPorId?: string;
  rutaId?: string;
  observaciones?: string;
  categoriaId?: string;
  archivos?: {
    tipoContenido: string;
    tipoArchivo: string;
    nombreOriginal: string;
    nombreAlmacenamiento: string;
    ruta: string;
    tamanoBytes: number;
  }[];
}

export interface ActualizarClienteDto {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  referencia?: string;
  referencia1Nombre?: string;
  referencia1Telefono?: string;
  referencia2Nombre?: string;
  referencia2Telefono?: string;
  nivelRiesgo?: NivelRiesgo;
  puntaje?: number;
  dni?: string; // Permitir dni si es editable
  enListaNegra?: boolean;
  rutaId?: string;
  categoriaId?: string;
  observaciones?: string;
}

export interface AgregarListaNegraDto {
  razon: string;
  agregadoPorId: string;
}

export interface AsignarRutaDto {
  rutaId: string;
  cobradorId: string;
  diaSemana?: number;
}

export interface FiltrosClientes {
  nivelRiesgo?: string;
  ruta?: string;
  search?: string;
  /**
   * Cuando es `true`, el backend retorna todos los clientes no bloqueados
   * sin restringir por ruta del cobrador. Úsese solo en selectores de
   * creación de crédito.
   */
  forCredit?: boolean;
}

export const clientesService = {
  /**
   * Obtener todos los clientes
   */
  async obtenerTodos(filtros?: FiltrosClientes): Promise<Cliente[]> {
    const params = new URLSearchParams();

    if (filtros?.nivelRiesgo) params.append('nivelRiesgo', filtros.nivelRiesgo);
    if (filtros?.ruta) params.append('ruta', filtros.ruta);
    if (filtros?.search) params.append('search', filtros.search);
    if (filtros?.forCredit) params.append('forCredit', 'true');

    const query = params.toString();
    const endpoint = query ? `/clients?${query}` : '/clients';

    // El backend puede devolver un array directo o un objeto { clientes: [] }
    const response = await apiRequest<Cliente[] | { clientes: Cliente[] }>('GET', endpoint, undefined, { cacheTTL: 0 });
    return Array.isArray(response) ? response : (response.clientes || []);
  },

  /**
   * Obtener un cliente por ID
   */
  async obtenerPorId(id: string): Promise<Cliente> {
    return apiRequest<Cliente>('GET', `/clients/${id}`, undefined, { cacheTTL: 0 });
  },

  /**
   * Crear un nuevo cliente (con soporte Offline)
   */
  async crear(data: CrearClienteDto): Promise<Cliente> {
    const payload = {
      ...data,
      idempotencyKey: (data as any).idempotencyKey || generarIdempotencyKey('cliente'),
    };

    try {
      const result = await apiRequest<Cliente>('POST', '/clients', payload);

      // Feedback visual inmediato en la cola de sync
      const { logSyncActivity } = await import('@/lib/offline/offlineQueue');
      logSyncActivity(`Crear cliente: ${payload.nombres} ${payload.apellidos}`);

      return result;
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 ||
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando creacion de cliente en cola...');
        // Usar un ID temporal
        const tempId = `temp-${Date.now()}`;

        await syncService.enqueueOperation(
          'cliente_create',
          '/clients',
          'POST',
          payload,
          `Crear cliente: ${payload.nombres} ${payload.apellidos}`
        );

        // Retornar objeto temporal para UI optimista
        return {
          id: tempId,
          codigo: 'OFFLINE',
          dni: payload.dni,
          nombres: payload.nombres,
          apellidos: payload.apellidos,
          telefono: payload.telefono,
          direccion: payload.direccion || null,
          referencia: payload.referencia || null,
          correo: payload.correo || null,
          nivelRiesgo: payload.nivelRiesgo || NivelRiesgo.VERDE,
          puntaje: payload.puntaje || 0,
          enListaNegra: false,
          estadoAprobacion: EstadoAprobacion.PENDIENTE,
          creadoEn: toBogotaDateTimeOffsetIso(new Date()),
          actualizadoEn: toBogotaDateTimeOffsetIso(new Date()),
        } as any;
      }
      throw error;
    }
  },

  /**
   * Actualizar un cliente existente (con soporte Offline)
   */
  async actualizar(id: string, data: ActualizarClienteDto): Promise<Cliente> {
    try {
      return await apiRequest<Cliente>('PUT', `/clients/${id}`, data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 ||
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando actualizacion de cliente en cola...');
        await syncService.enqueueOperation(
          'cliente_update',
          `/clients/${id}`,
          'PUT',
          data,
          `Actualizar cliente: ${id}`
        );
        return { id, ...data } as any;
      }
      throw error;
    }
  },

  /**
   * Eliminar un cliente (con soporte Offline)
   */
  async eliminar(id: string): Promise<void> {
    try {
      return await apiRequest<void>('DELETE', `/clients/${id}`);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 ||
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando eliminacion de cliente en cola...');
        await syncService.enqueueOperation(
          'cliente_delete',
          `/clients/${id}`,
          'DELETE',
          {},
          `Eliminar cliente: ${id}`
        );
        return;
      }
      throw error;
    }
  },

  /**
   * Restaurar un cliente eliminado
   */
  async restaurar(id: string): Promise<Cliente> {
    return apiRequest<Cliente>('PATCH', `/clients/${id}/restore`, {});
  },

  /**
   * Aprobar un cliente
   */
  async aprobar(id: string, aprobadoPorId: string, datosAprobados?: unknown): Promise<Cliente> {
    try {
      return await apiRequest<Cliente>('POST', `/clients/approve/${id}`, {
        aprobadoPorId,
        datosAprobados
      });
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 ||
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando aprobacion de cliente en cola...');
        return await syncService.enqueueOperation(
          'cliente_aprobar',
          `/clients/approve/${id}`,
          'POST',
          { aprobadoPorId, datosAprobados },
          `Aprobar cliente: ${id}`
        ) as any;
      }
      throw error;
    }
  },

  /**
   * Agregar cliente a lista negra
   */
  async agregarListaNegra(id: string, data: AgregarListaNegraDto): Promise<Cliente> {
    try {
      return await apiRequest<Cliente>('POST', `/clients/${id}/blacklist`, data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 ||
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando agregar a lista negra en cola...');
        return await syncService.enqueueOperation(
          'cliente_blacklist_add',
          `/clients/${id}/blacklist`,
          'POST',
          data,
          `Agregar a lista negra cliente: ${id}`
        ) as any;
      }
      throw error;
    }
  },

  /**
   * Remover cliente de lista negra
   */
  async removerListaNegra(id: string): Promise<Cliente> {
    try {
      return await apiRequest<Cliente>('DELETE', `/clients/${id}/blacklist`);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 ||
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando remover de lista negra en cola...');
        return await syncService.enqueueOperation(
          'cliente_blacklist_remove',
          `/clients/${id}/blacklist`,
          'DELETE',
          null,
          `Remover de lista negra cliente: ${id}`
        ) as any;
      }
      throw error;
    }
  },

  /**
   * Asignar cliente a una ruta
   */
  async asignarRuta(clienteId: string, data: AsignarRutaDto): Promise<void> {
    try {
      return await apiRequest<void>('POST', `/clients/${clienteId}/assign-route`, data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 ||
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        logger.log('[Offline Mode] Guardando asignacion de ruta en cola...');
        await syncService.enqueueOperation(
          'cliente_assign_route',
          `/clients/${clienteId}/assign-route`,
          'POST',
          data,
          `Asignar ruta a cliente: ${clienteId}`
        );
        return;
      }
      throw error;
    }
  },

  // Alias para compatibilidad
  obtenerClientes: function(filtros?: FiltrosClientes): Promise<Cliente[]> {
    return this.obtenerTodos(filtros);
  },

  eliminarCliente: function(id: string): Promise<void> {
    return this.eliminar(id);
  },

  actualizarCliente: function(id: string, data: ActualizarClienteDto): Promise<Cliente> {
    return this.actualizar(id, data);
  }
};

// MOCK_CLIENTES eliminado - usar clientesService.obtenerTodos() para obtener datos reales
