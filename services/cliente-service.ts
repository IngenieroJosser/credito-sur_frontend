import { apiRequest } from '@/lib/api/api';
import { AxiosRequestConfig } from 'axios';

export interface Cliente {
  id: string;
  codigo: string;
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string | null;
  direccion: string | null;
  referencia: string | null;
  nivelRiesgo: string;
  puntaje: number;
  enListaNegra: boolean;
  estadoAprobacion: string;
  // Campos adicionales para la vista de coordinador
  score?: number;
  tendencia?: 'SUBE' | 'BAJA' | 'ESTABLE';
  ultimaVisita?: string;
  rutaId?: string;
  rutaNombre?: string;
}

export interface ClientesResponse {
  clientes: Cliente[];
  estadisticas: {
    total: number;
    buenComportamiento: number;
    enRiesgo: number;
    scorePromedio: number;
  };
}

export interface CreateClienteRequest {
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo?: string;
  direccion?: string;
  referencia?: string;
}

export interface UpdateClienteRequest {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  referencia?: string;
  nivelRiesgo?: string;
  puntaje?: number;
}

export interface ClientesFilters {
  nivelRiesgo?: string;
  ruta?: string;
  search?: string;
}

export const clientesService = {
  obtenerClientes: async (filters: ClientesFilters = {}): Promise<ClientesResponse> => {
    const config: AxiosRequestConfig = {
      params: {
        nivelRiesgo: filters.nivelRiesgo || 'all',
        ruta: filters.ruta || '',
        search: filters.search || '',
      },
    };
    
    try {
      return await apiRequest<ClientesResponse>('GET', '/clients', null, config);
    } catch (error) {
      console.error('Error in clientesService.obtenerClientes:', error);
      // Devolver respuesta segura en caso de error
      return {
        clientes: [],
        estadisticas: {
          total: 0,
          buenComportamiento: 0,
          enRiesgo: 0,
          scorePromedio: 0,
        },
      };
    }
  },

  obtenerClientePorId: async (id: string): Promise<Cliente> => {
    try {
      return await apiRequest<Cliente>('GET', `/clients/${id}`);
    } catch (error) {
      console.error(`Error in clientesService.obtenerClientePorId for id ${id}:`, error);
      throw error;
    }
  },

  crearCliente: async (data: CreateClienteRequest): Promise<any> => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      return await apiRequest('POST', '/clients', {
        ...data,
        creadoPorId: user.id,
      });
    } catch (error) {
      console.error('Error in clientesService.crearCliente:', error);
      throw error;
    }
  },

  aprobarCliente: async (aprobacionId: string, datosAprobados?: any): Promise<any> => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      return await apiRequest('POST', `/clients/approve/${aprobacionId}`, {
        aprobadoPorId: user.id,
        datosAprobados,
      });
    } catch (error) {
      console.error(`Error in clientesService.aprobarCliente for id ${aprobacionId}:`, error);
      throw error;
    }
  },

  actualizarCliente: async (id: string, data: UpdateClienteRequest): Promise<Cliente> => {
    try {
      return await apiRequest<Cliente>('PUT', `/clients/${id}`, data);
    } catch (error) {
      console.error(`Error in clientesService.actualizarCliente for id ${id}:`, error);
      throw error;
    }
  },

  agregarAListaNegra: async (id: string, razon: string): Promise<Cliente> => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      return await apiRequest<Cliente>('POST', `/clients/${id}/blacklist`, {
        razon,
        agregadoPorId: user.id,
      });
    } catch (error) {
      console.error(`Error in clientesService.agregarAListaNegra for id ${id}:`, error);
      throw error;
    }
  },

  removerDeListaNegra: async (id: string): Promise<Cliente> => {
    try {
      return await apiRequest<Cliente>('DELETE', `/clients/${id}/blacklist`);
    } catch (error) {
      console.error(`Error in clientesService.removerDeListaNegra for id ${id}:`, error);
      throw error;
    }
  },

  asignarARuta: async (clienteId: string, rutaId: string, cobradorId: string, diaSemana?: number): Promise<any> => {
    try {
      return await apiRequest('POST', `/clients/${clienteId}/assign-route`, {
        rutaId,
        cobradorId,
        diaSemana,
      });
    } catch (error) {
      console.error(`Error in clientesService.asignarARuta for cliente ${clienteId}:`, error);
      throw error;
    }
  },
};

// Datos de ejemplo para cuando la API no esté disponible
export const MOCK_CLIENTES: Cliente[] = [
  {
    id: '1',
    codigo: 'CLI-001',
    dni: '12345678',
    nombres: 'Juan',
    apellidos: 'Pérez',
    telefono: '3001234567',
    correo: 'juan@email.com',
    direccion: 'Calle 123',
    referencia: 'Cerca al parque',
    nivelRiesgo: 'VERDE',
    puntaje: 85,
    enListaNegra: false,
    estadoAprobacion: 'APROBADO',
  },
];