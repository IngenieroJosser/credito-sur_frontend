import { apiRequest } from "@/lib/api/api";
import { syncService } from '@/lib/offline/syncService';
import { NivelRiesgo, EstadoAprobacion } from '@/types/enums';

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
  nivelRiesgo?: NivelRiesgo;
  puntaje?: number;
  creadoPorId?: string;
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
    
    const query = params.toString();
    const endpoint = query ? `/clients?${query}` : '/clients';
    
    const response = await apiRequest<any>('GET', endpoint);
    return Array.isArray(response) ? response : (response.clientes || []);
  },

  /**
   * Obtener un cliente por ID
   */
  async obtenerPorId(id: string): Promise<Cliente> {
    return apiRequest<Cliente>('GET', `/clients/${id}`);
  },

  /**
   * Crear un nuevo cliente (con soporte Offline)
   */
  async crear(data: CrearClienteDto): Promise<Cliente> {
    try {
      return await apiRequest<Cliente>('POST', '/clients', data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
         console.log('🌐 [Offline Mode] Guardando creación de cliente en cola...');
         // Usar un ID temporal
         const tempId = `temp-${Date.now()}`;
         
         await syncService.enqueueOperation(
           'cliente_create',
           '/clients',
           'POST',
           data,
           `Crear cliente: ${data.nombres} ${data.apellidos}`
         );

         // Retornar objeto temporal para UI optimista
         return {
           id: tempId,
           codigo: 'OFFLINE',
           dni: data.dni,
           nombres: data.nombres,
           apellidos: data.apellidos,
           telefono: data.telefono,
           direccion: data.direccion || null,
           referencia: data.referencia || null,
           correo: data.correo || null,
           nivelRiesgo: data.nivelRiesgo || NivelRiesgo.VERDE,
           puntaje: data.puntaje || 0,
           enListaNegra: false,
           estadoAprobacion: EstadoAprobacion.PENDIENTE,
           creadoEn: new Date().toISOString(),
           actualizadoEn: new Date().toISOString(),
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
        error?.message?.includes('network')
      ) {
         console.log('🌐 [Offline Mode] Guardando actualización de cliente en cola...');
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
        error?.statusCode === 0
      ) {
         console.log('🌐 [Offline Mode] Guardando eliminación de cliente en cola...');
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
   * Aprobar un cliente
   */
  async aprobar(id: string, aprobadoPorId: string, datosAprobados?: unknown): Promise<Cliente> {
    return apiRequest<Cliente>('POST', `/clients/approve/${id}`, { 
      aprobadoPorId, 
      datosAprobados 
    });
  },

  /**
   * Agregar cliente a lista negra
   */
  async agregarListaNegra(id: string, data: AgregarListaNegraDto): Promise<Cliente> {
    return apiRequest<Cliente>('POST', `/clients/${id}/blacklist`, data);
  },

  /**
   * Remover cliente de lista negra
   */
  async removerListaNegra(id: string): Promise<Cliente> {
    return apiRequest<Cliente>('DELETE', `/clients/${id}/blacklist`);
  },

  /**
   * Asignar cliente a una ruta
   */
  async asignarRuta(clienteId: string, data: AsignarRutaDto): Promise<void> {
    return apiRequest<void>('POST', `/clients/${clienteId}/assign-route`, data);
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

