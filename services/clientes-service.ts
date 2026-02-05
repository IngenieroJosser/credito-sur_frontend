import { apiRequest } from "@/lib/api/api";
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
  creadoPorId: string;
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
    
    return apiRequest<Cliente[]>('GET', endpoint);
  },

  /**
   * Obtener un cliente por ID
   */
  async obtenerPorId(id: string): Promise<Cliente> {
    return apiRequest<Cliente>('GET', `/clients/${id}`);
  },

  /**
   * Crear un nuevo cliente
   */
  async crear(data: CrearClienteDto): Promise<Cliente> {
    return apiRequest<Cliente>('POST', '/clients', data);
  },

  /**
   * Actualizar un cliente existente
   */
  async actualizar(id: string, data: ActualizarClienteDto): Promise<Cliente> {
    return apiRequest<Cliente>('PUT', `/clients/${id}`, data);
  },

  /**
   * Eliminar un cliente (soft delete)
   */
  async eliminar(id: string): Promise<void> {
    return apiRequest<void>('DELETE', `/clients/${id}`);
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
  }
};

/**
 * Datos mock para desarrollo/testing
 * TODO: Remover cuando el backend esté completamente integrado
 */
export const MOCK_CLIENTES: Cliente[] = [
  {
    id: 'CLI-001',
    codigo: 'CLI-001',
    dni: '1234567890',
    nombres: 'Juan Carlos',
    apellidos: 'Pérez García',
    correo: 'juan.perez@email.com',
    telefono: '3001234567',
    direccion: 'Calle 123 #45-67',
    referencia: null,
    nivelRiesgo: NivelRiesgo.VERDE,
    puntaje: 850,
    enListaNegra: false,
    estadoAprobacion: EstadoAprobacion.APROBADO,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    prestamosActivos: 1,
    montoTotal: 5000000
  },
  {
    id: 'CLI-002',
    codigo: 'CLI-002',
    dni: '0987654321',
    nombres: 'María',
    apellidos: 'González López',
    correo: 'maria.gonzalez@email.com',
    telefono: '3109876543',
    direccion: 'Carrera 45 #12-34',
    referencia: null,
    nivelRiesgo: NivelRiesgo.AMARILLO,
    puntaje: 650,
    enListaNegra: false,
    estadoAprobacion: EstadoAprobacion.APROBADO,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    prestamosActivos: 2,
    montoTotal: 3000000
  },
  {
    id: 'CLI-003',
    codigo: 'CLI-003',
    dni: '1122334455',
    nombres: 'Pedro',
    apellidos: 'Martínez Ruiz',
    correo: null,
    telefono: '3201122334',
    direccion: 'Avenida 68 #89-10',
    referencia: null,
    nivelRiesgo: NivelRiesgo.VERDE,
    puntaje: 900,
    enListaNegra: false,
    estadoAprobacion: EstadoAprobacion.APROBADO,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    prestamosActivos: 0,
    montoTotal: 0
  }
];
