import { logger } from '@/lib/logger'

import { apiRequest } from '@/lib/api/api';

import { syncService } from '@/lib/offline/syncService';
import { esErrorDeRed } from '@/lib/offline/conRespaldoOffline';
import type { Cliente, PrestamoParcial } from '@/types/domain';
import type { CuotaOperativa } from '@/lib/types/cobranza';



export interface AsignacionCliente {

  id: string;

  clienteId: string;

  cobradorId: string;

  ordenVisita?: number | null;

  estado?: string | null;

  horaSugerida?: string | null;

  /**
   * El detalle de la ruta trae el cliente ENTERO, con sus creditos activos y
   * las cuotas de cada uno: en routes.service la asignacion lleva
   * `include: { cliente: { include: { prestamos: { include: { cuotas } } } } }`,
   * que es un include, no un select. Declararlo con cuatro campos obligaba a
   * tratar toda la pantalla de la ruta como `any` para poder leer el resto.
   */
  cliente?: Partial<Cliente> & {
    prestamos?: Array<PrestamoParcial & { cuotas?: CuotaOperativa[] }>;
  };

  /**
   * NO existe en el modelo AsignacionRuta. Se lee como
   * `asig.prioridad?.toLowerCase() || (en mora ? alta : media)`, asi que
   * siempre resuelve por el respaldo, que es el que decide de verdad.
   */
  prioridad?: string | null;

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

export interface DailyVisitsResponse {

  fecha: string;

  rutaId: string;

  totalVisitas: number;

  resumen: {

    recaudo: number;

    recaudoOperativo?: number;

    recaudoContable?: number;

    recaudoRegularizado?: number;

    recaudoEfectivo?: number;

    recaudoTransferencia?: number;

    recaudoContableEfectivo?: number;

    recaudoContableTransferencia?: number;

    recaudoRegularizadoEfectivo?: number;

    recaudoRegularizadoTransferencia?: number;

    jornadaId?: string | null;

    jornadaEstado?: string | null;

    jornadaCerradaEn?: string | null;

    jornadaRegularizadaEn?: string | null;

    meta: number;

    gastos: number;

    netoEfectivoRuta?: number;

    efectividad: number;

    visitados: number;

    total: number;

  };

  visitas: any[];

  obligaciones?: any[];

}



export interface ReordenarClientesResult {

  exito: boolean;

  mensaje?: string;

}



export interface HistorialVisitaCliente {

  id: string;

  rutaId: string;

  clienteId: string;

  prestamoId?: string | null;

  cobradorId: string;

  fechaVisita: string;

  estadoVisita: string;

  notas?: string | null;

  creadoEn: string;

  ruta?: {

    id: string;

    nombre: string;

    codigo: string;

  } | null;

  cobrador?: {

    id: string;

    nombre: string;

  } | null;

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

  coordinadorId: string | null;

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

  coordinadorId?: string;

}



export interface ActualizarRutaDto {

  codigo?: string;

  nombre?: string;

  descripcion?: string;

  zona?: string;

  cobradorId?: string;

  supervisorId?: string;

  coordinadorId?: string;

  activa?: boolean;

}



export interface FiltrosRutas {

  page?: number;

  limit?: number;

  search?: string;

  activa?: boolean;

  cobradorId?: string;

  supervisorId?: string;

  coordinadorId?: string;

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

   * Obtener los coordinadores activos, para asignar el de la ruta

   */

  async obtenerCoordinadores(): Promise<Cobrador[]> {

    return apiRequest<Cobrador[]>('GET', '/routes/coordinadores');

  },



  /**

   * Obtener una ruta por ID

   */

  async obtenerRutaPorId(id: string): Promise<Ruta> {

    return apiRequest<Ruta>('GET', `/routes/${id}`, undefined, { cacheTTL: 0 });

  },



  async obtenerCreditosAsignadosACobrador(cobradorId: string): Promise<CreditosAsignadosResponse> {

    return apiRequest<CreditosAsignadosResponse>(

      'GET',

      `/routes/cobradores/${cobradorId}/creditos-asignados`,

      undefined,

      { cacheTTL: 0 },

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

  /**
   * Sin conexión devuelve `null`, no el registro de la cola.
   *
   * Antes devolvía `enqueueOperation(...) as any`: un objeto con `endpoint` y
   * `method` disfrazado de `Ruta`. Ninguno de los sitios que llaman aquí usa el
   * resultado —hacen `await` y recargan la lista—, asi que se dice la verdad en vez
   * de fabricar una ruta que nadie lee.
   */
  async crearRuta(data: CrearRutaDto): Promise<Ruta | null> {

    try {

      return await apiRequest<Ruta>('POST', '/routes', data);

    } catch (error) {

      if (esErrorDeRed(error)) {

        logger.log('[Offline Mode] Guardando creacion de ruta en cola...');

        await syncService.enqueueOperation(

          'ruta_crear',

          '/routes',

          'POST',

          data,

          'Crear ruta: ' + data.nombre

        );
        return null;

      }

      throw error;

    }

  },



  /**

   * Actualizar una ruta existente

   */

  /** Sin conexión devuelve `null`; ver la nota de `crearRuta`. */
  async actualizarRuta(
    id: string,
    data: ActualizarRutaDto,
  ): Promise<Ruta | null> {

    try {

      return await apiRequest<Ruta>('PATCH', `/routes/${id}`, data);

    } catch (error) {

      if (esErrorDeRed(error)) {

        logger.log('[Offline Mode] Guardando actualizacion de ruta en cola...');

        await syncService.enqueueOperation(

          'ruta_actualizar',

          `/routes/${id}`,

          'PATCH',

          data,

          'Actualizar ruta ID: ' + id

        );
        return null;

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

    } catch (error) {

      if (esErrorDeRed(error)) {

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

  /** Sin conexión devuelve `null`; ver la nota de `crearRuta`. */
  async toggleActiva(id: string): Promise<Ruta | null> {

    try {

      return await apiRequest<Ruta>('PATCH', `/routes/${id}/toggle-active`);

    } catch (error) {

      if (esErrorDeRed(error)) {

        logger.log('[Offline Mode] Guardando cambio de estado de ruta en cola...');

        await syncService.enqueueOperation(

          'ruta_toggle_activa',

          `/routes/${id}/toggle-active`,

          'PATCH',

          null,

          'Alternar estado activo de ruta ID: ' + id

        );
        return null;

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

    } catch (error) {

      if (esErrorDeRed(error)) {

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

    } catch (error) {

      if (esErrorDeRed(error)) {

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

    } catch (error) {

      if (esErrorDeRed(error)) {

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

  async obtenerVisitasDelDia(rutaId: string, fecha?: string): Promise<DailyVisitsResponse> {

    const params = fecha ? `?fecha=${fecha}` : '';

    return apiRequest<DailyVisitsResponse>('GET', `/routes/${rutaId}/daily-visits${params}`);

  },



  /**

   * Consultar si la ruta tiene una jornada anterior pendiente de cierre

   */

  async getCierrePendiente(rutaId: string): Promise<any> {

    return apiRequest('GET', `/routes/${rutaId}/cierre-pendiente`);

  },



  /**

   * Actualizar orden de clientes en una ruta (drag & drop)

   */

  async actualizarOrdenClientes(rutaId: string, orden: Array<{ clienteId: string; orden: number }>): Promise<ReordenarClientesResult> {

    try {

      return await apiRequest('PATCH', `/routes/${rutaId}/reorder`, { orden });

    } catch (error) {

      if (esErrorDeRed(error)) {

        logger.log('[Offline Mode] Guardando reordenamiento de clientes en cola...');

        await syncService.enqueueOperation(

          'ruta_reorder_clientes',

          `/routes/${rutaId}/reorder`,

          'PATCH',

          { orden },

          `Reordenar clientes en ruta: ${rutaId}`

        );

        // Aqui si se construye el resultado, y no es inventarlo: el reorden
        // QUEDA hecho, encolado, asi que `exito` es cierto. El mensaje dice de
        // donde viene, que es lo que la pantalla necesita saber.
        return {
          exito: true,
          mensaje: 'El orden se guardó sin conexión y se enviará al sincronizar.',
        };

      }

      throw error;

    }

  },
  /**
   * Obtener historial de visitas de un cliente
   */
  async obtenerHistorialVisitasCliente(clienteId: string, params?: { estadoVisita?: string; limit?: number }): Promise<HistorialVisitaCliente[]> {
    const query = new URLSearchParams();

    if (params?.estadoVisita) {
      query.set('estadoVisita', params.estadoVisita);
    }

    if (params?.limit) {
      query.set('limit', String(params.limit));
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';

    return apiRequest<HistorialVisitaCliente[]>('GET', `/routes/clientes/${clienteId}/visitas${suffix}`);
  },

  /**
   * Marcar visita como ausente (o cualquier otro estado) con notas
   */
  async marcarVisitaAusente(rutaId: string, clienteId: string, payload: { estadoVisita: string, notas: string, fechaOperativa?: string, origenGestion?: string }): Promise<void> {
    try {
      await apiRequest<void>('POST', `/routes/${rutaId}/clientes/${clienteId}/visita`, payload);
    } catch (error) {
      if (esErrorDeRed(error)) {
        logger.log('[Offline Mode] Guardando registro de visita en cola...');
        await syncService.enqueueOperation(
          'ruta_registrar_visita',
          `/routes/${rutaId}/clientes/${clienteId}/visita`,
          'POST',
          payload,
          `Registrar visita ${payload.estadoVisita} para cliente: ${clienteId}`
        );
        return;
      }
      throw error;
    }
  },

  async getCierrePendienteDetalle(rutaId: string) {
    return apiRequest('GET', `/routes/${rutaId}/cierre-pendiente/detalle`);
  },

};
