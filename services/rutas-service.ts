import { logger } from '@/lib/logger'

import { apiRequest } from '@/lib/api/api';

import { syncService } from '@/lib/offline/syncService';



export interface AsignacionCliente {

  id: string;

  clienteId: string;

  cobradorId: string;

  ordenVisita?: number | null;

  estado?: string | null;

  horaSugerida?: string | null;

  cliente?: { id: string; nombres: string; apellidos: string; telefono?: string };

}



export interface RutasMeta {

  total: number;

  page: number;

  limit: number;

  totalPages: number;

}



export interface VisitaDelDia {

  clienteId: string;

  clienteNombre: string;

  direccion?: string;

  telefono?: string;

  montoCuota?: number;

  saldoTotal?: number;

  ordenVisita?: number;

  estado?: string;

}



export interface ReordenarClientesResult {

  exito: boolean;

  mensaje?: string;

}



export interface Ruta {

  id: string;

  codigo: string;

  nombre: string;

  descripcion: string | null;

  zona: string;

  activa: boolean;

  cobradorId: string;

  supervisorId: string | null;

  creadoEn: string;

  actualizadoEn: string;

  eliminadoEn: string | null;

  asignaciones?: AsignacionCliente[];

}



export interface CrearRutaDto {

  codigo: string;

  nombre: string;

  descripcion?: string;

  zona: string;

  cobradorId: string;

  supervisorId?: string;

}



export interface ActualizarRutaDto {

  codigo?: string;

  nombre?: string;

  descripcion?: string;

  zona?: string;

  cobradorId?: string;

  supervisorId?: string;

  activa?: boolean;

}



export interface FiltrosRutas {

  page?: number;

  limit?: number;

  search?: string;

  activa?: boolean;

  cobradorId?: string;

  supervisorId?: string;

}



export interface EstadisticasRutas {

  totalRutas: number;

  rutasActivas: number;

  rutasInactivas: number;

  totalClientes: number;

  totalCobradores: number;

}



export interface Cobrador {

  id: string;

  nombres: string;

  apellidos: string;

  correo: string;

}



export interface CreditosAsignadosResponse {

  cobradorId: string;

  total: number;

  data: any[];

}



export const rutasService = {

  /**

   * Obtener todas las rutas con filtros

   */

  async obtenerRutas(filtros?: FiltrosRutas): Promise<Ruta[]> {

    const params = new URLSearchParams();

    

    if (filtros?.page) params.append('page', filtros.page.toString());

    if (filtros?.limit) params.append('limit', filtros.limit.toString());

    if (filtros?.search) params.append('search', filtros.search);

    if (filtros?.activa !== undefined) params.append('activa', filtros.activa.toString());

    if (filtros?.cobradorId) params.append('cobradorId', filtros.cobradorId);

    if (filtros?.supervisorId) params.append('supervisorId', filtros.supervisorId);

    

    const query = params.toString();

    const endpoint = query ? `/routes?${query}` : '/routes';

    

    const response = await apiRequest<{ data: Ruta[], meta: RutasMeta }>('GET', endpoint);

    return response.data || [];

  },



  /**

   * Obtener estadisticas de rutas

   */

  async obtenerEstadisticas(): Promise<EstadisticasRutas> {

    return apiRequest<EstadisticasRutas>('GET', '/routes/statistics');

  },



  /**

   * Obtener lista de cobradores

   */

  async obtenerCobradores(): Promise<Cobrador[]> {

    return apiRequest<Cobrador[]>('GET', '/routes/cobradores');

  },



  /**

   * Obtener lista de supervisores

   */

  async obtenerSupervisores(): Promise<Cobrador[]> {

    return apiRequest<Cobrador[]>('GET', '/routes/supervisores');

  },



  /**

   * Obtener una ruta por ID

   */

  async obtenerRutaPorId(id: string): Promise<Ruta> {

    return apiRequest<Ruta>('GET', `/routes/${id}`);

  },



  async obtenerCreditosAsignadosACobrador(cobradorId: string): Promise<CreditosAsignadosResponse> {

    return apiRequest<CreditosAsignadosResponse>(

      'GET',

      `/routes/cobradores/${cobradorId}/creditos-asignados`,

    );

  },



  /**

   * Obtener todas las rutas

   */

  async getAll(): Promise<Ruta[]> {

    return this.obtenerRutas();

  },



  /**

   * Crear una nueva ruta

   */

  async crearRuta(data: CrearRutaDto): Promise<Ruta> {

    try {

      return await apiRequest<Ruta>('POST', '/routes', data);

    } catch (error: any) {

      if (

        (typeof navigator !== 'undefined' && !navigator.onLine) ||

        error?.statusCode === 0 || 

        error?.message?.includes('network') ||

        error?.code === 'ERR_NETWORK'

      ) {

        logger.log('[Offline Mode] Guardando creacion de ruta en cola...');

        return await syncService.enqueueOperation(

          'ruta_crear',

          '/routes',

          'POST',

          data,

          'Crear ruta: ' + data.nombre

        ) as any;

      }

      throw error;

    }

  },



  /**

   * Actualizar una ruta existente

   */

  async actualizarRuta(id: string, data: ActualizarRutaDto): Promise<Ruta> {

    try {

      return await apiRequest<Ruta>('PATCH', `/routes/${id}`, data);

    } catch (error: any) {

      if (

        (typeof navigator !== 'undefined' && !navigator.onLine) ||

        error?.statusCode === 0 || 

        error?.message?.includes('network') ||

        error?.code === 'ERR_NETWORK'

      ) {

        logger.log('[Offline Mode] Guardando actualizacion de ruta en cola...');

        return await syncService.enqueueOperation(

          'ruta_actualizar',

          `/routes/${id}`,

          'PATCH',

          data,

          'Actualizar ruta ID: ' + id

        ) as any;

      }

      throw error;

    }

  },



  /**

   * Eliminar una ruta (soft delete)

   */

  async eliminarRuta(id: string): Promise<void> {

    try {

      return await apiRequest<void>('DELETE', `/routes/${id}`);

    } catch (error: any) {

      if (

        (typeof navigator !== 'undefined' && !navigator.onLine) ||

        error?.statusCode === 0 || 

        error?.message?.includes('network') ||

        error?.code === 'ERR_NETWORK'

      ) {

        logger.log('[Offline Mode] Guardando eliminacion de ruta en cola...');

        await syncService.enqueueOperation(

          'ruta_eliminar',

          `/routes/${id}`,

          'DELETE',

          null,

          'Eliminar ruta ID: ' + id

        );

        return;

      }

      throw error;

    }

  },



  /**

   * Activar o desactivar una ruta

   */

  async toggleActiva(id: string): Promise<Ruta> {

    try {

      return await apiRequest<Ruta>('PATCH', `/routes/${id}/toggle-active`);

    } catch (error: any) {

      if (

        (typeof navigator !== 'undefined' && !navigator.onLine) ||

        error?.statusCode === 0 || 

        error?.message?.includes('network') ||

        error?.code === 'ERR_NETWORK'

      ) {

        logger.log('[Offline Mode] Guardando cambio de estado de ruta en cola...');

        return await syncService.enqueueOperation(

          'ruta_toggle_activa',

          `/routes/${id}/toggle-active`,

          'PATCH',

          null,

          'Alternar estado activo de ruta ID: ' + id

        ) as any;

      }

      throw error;

    }

  },



  /**

   * Asignar cliente a una ruta

   */

  async asignarCliente(rutaId: string, clienteId: string, cobradorId: string): Promise<void> {

    try {

      return await apiRequest<void>('POST', `/routes/${rutaId}/assign-client`, {

        clienteId,

        cobradorId

      });

    } catch (error: any) {

      if (

        (typeof navigator !== 'undefined' && !navigator.onLine) ||

        error?.statusCode === 0 || 

        error?.message?.includes('network') ||

        error?.code === 'ERR_NETWORK'

      ) {

        logger.log('[Offline Mode] Guardando asignacion de cliente a ruta en cola...');

        await syncService.enqueueOperation(

          'ruta_asignar_cliente',

          `/routes/${rutaId}/assign-client`,

          'POST',

          { clienteId, cobradorId },

          `Asignar cliente ${clienteId} a ruta: ${rutaId}`

        );

        return;

      }

      throw error;

    }

  },



  /**

   * Remover cliente de una ruta

   */

  async removerCliente(rutaId: string, clienteId: string): Promise<void> {

    try {

      return await apiRequest<void>('DELETE', `/routes/${rutaId}/remove-client/${clienteId}`);

    } catch (error: any) {

      if (

        (typeof navigator !== 'undefined' && !navigator.onLine) ||

        error?.statusCode === 0 || 

        error?.message?.includes('network') ||

        error?.code === 'ERR_NETWORK'

      ) {

        logger.log('[Offline Mode] Guardando remocion de cliente de ruta en cola...');

        await syncService.enqueueOperation(

          'ruta_remover_cliente',

          `/routes/${rutaId}/remove-client/${clienteId}`,

          'DELETE',

          null,

          `Remover cliente ${clienteId} de ruta: ${rutaId}`

        );

        return;

      }

      throw error;

    }

  },



  /**

   * Mover cliente entre rutas

   */

  async moverCliente(clienteId: string, fromRutaId: string, toRutaId: string): Promise<void> {

    try {

      return await apiRequest<void>('POST', '/routes/move-client', {

        clienteId,

        fromRutaId,

        toRutaId

      });

    } catch (error: any) {

      if (

        (typeof navigator !== 'undefined' && !navigator.onLine) ||

        error?.statusCode === 0 || 

        error?.message?.includes('network') ||

        error?.code === 'ERR_NETWORK'

      ) {

        logger.log('[Offline Mode] Guardando movimiento de cliente entre rutas en cola...');

        await syncService.enqueueOperation(

          'ruta_mover_cliente',

          '/routes/move-client',

          'POST',

          { clienteId, fromRutaId, toRutaId },

          `Mover cliente ${clienteId} de ruta ${fromRutaId} a ${toRutaId}`

        );

        return;

      }

      throw error;

    }

  },



  /**

   * Obtener visitas del día para una ruta (agenda de cobro)

   */

  async obtenerVisitasDelDia(rutaId: string, fecha?: string): Promise<VisitaDelDia[]> {

    const params = fecha ? `?fecha=${fecha}` : '';

    return apiRequest<VisitaDelDia[]>('GET', `/routes/${rutaId}/daily-visits${params}`);

  },



  /**

   * Actualizar orden de clientes en una ruta (drag & drop)

   */

  async actualizarOrdenClientes(rutaId: string, orden: Array<{ clienteId: string; orden: number }>): Promise<ReordenarClientesResult> {

    try {

      return await apiRequest('PATCH', `/routes/${rutaId}/reorder`, { orden });

    } catch (error: any) {

      if (

        (typeof navigator !== 'undefined' && !navigator.onLine) ||

        error?.statusCode === 0 || 

        error?.message?.includes('network') ||

        error?.code === 'ERR_NETWORK'

      ) {

        logger.log('[Offline Mode] Guardando reordenamiento de clientes en cola...');

        return await syncService.enqueueOperation(

          'ruta_reorder_clientes',

          `/routes/${rutaId}/reorder`,

          'PATCH',

          { orden },

          `Reordenar clientes en ruta: ${rutaId}`

        ) as any;

      }

      throw error;

    }

  },

};





