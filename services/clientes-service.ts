import { apiRequest } from "@/lib/api/api";

// Tipos basados en lo que vimos en el componente, se pueden mover a un archivo de tipos centralizado luego
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
  nivelRiesgo: 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
  puntaje: number;
  enListaNegra: boolean;
  estadoAprobacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';
  // Campos calculados que podrían venir del backend
  prestamosActivos?: number;
  montoTotal?: number;
  montoMora?: number;
  diasMora?: number;
  ultimoPago?: string;
  rutaId?: string;
  fechaRegistro?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrearClienteDto {
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  direccion?: string;
  correo?: string;
  referencia?: string;
  nivelRiesgo?: 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
  puntaje?: number;
  enListaNegra?: boolean;
  rutaId?: string;
  observaciones?: string;
}

export const MOCK_CLIENTES: Cliente[] = [
  {
    id: '1',
    codigo: 'CLI-001',
    nombres: 'Juan Carlos',
    apellidos: 'Pérez Rodriguez',
    dni: '1.020.345.678',
    telefono: '310 123 4567',
    correo: 'juan.perez@email.com',
    direccion: 'Calle 10 # 5-23, Centro',
    referencia: 'Frente a la panadería',
    nivelRiesgo: 'VERDE',
    puntaje: 85,
    enListaNegra: false,
    montoTotal: 2500000,
    montoMora: 0,
    rutaId: 'r1',
    estadoAprobacion: 'APROBADO',
    fechaRegistro: '2023-01-15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    codigo: 'CLI-002',
    nombres: 'Ana María',
    apellidos: 'Gómez López',
    dni: '1.030.987.654',
    telefono: '320 987 6543',
    correo: 'ana.gomez@email.com',
    direccion: 'Av. Principal # 20-10',
    referencia: 'Al lado del supermercado',
    nivelRiesgo: 'AMARILLO',
    puntaje: 65,
    enListaNegra: false,
    montoTotal: 1500000,
    montoMora: 0,
    rutaId: 'r2',
    estadoAprobacion: 'APROBADO',
    fechaRegistro: '2023-02-20',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    codigo: 'CLI-003',
    nombres: 'Carlos Andrés',
    apellidos: 'Ruiz Díaz',
    dni: '1.040.123.456',
    telefono: '300 456 7890',
    correo: null,
    direccion: 'Barrio La Paz, Mz C Casa 5',
    referencia: 'Casa azul de dos pisos',
    nivelRiesgo: 'ROJO',
    puntaje: 45,
    enListaNegra: false,
    montoTotal: 800000,
    montoMora: 150000,
    rutaId: 'r1',
    estadoAprobacion: 'APROBADO',
    fechaRegistro: '2023-03-10',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    codigo: 'CLI-004',
    nombres: 'Luisa Fernanda',
    apellidos: 'Martínez',
    dni: '1.050.555.555',
    telefono: '315 555 5555',
    correo: 'luisa.martinez@email.com',
    direccion: 'Urb. Los Pinos, Bloque 4 Apto 201',
    referencia: 'Entrada principal',
    nivelRiesgo: 'LISTA_NEGRA',
    puntaje: 0,
    enListaNegra: true,
    montoTotal: 5000000,
    montoMora: 5000000,
    rutaId: 'r3',
    estadoAprobacion: 'RECHAZADO',
    fechaRegistro: '2022-11-05',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const clientesService = {
  obtenerClientes: async () => {
    try {
      return await apiRequest<Cliente[]>('GET', '/clients');
    } catch (error) {
      console.warn('Usando datos mock de clientes', error);
      return MOCK_CLIENTES;
    }
  },

  obtenerCliente: async (id: string) => {
    try {
      return await apiRequest<Cliente & { prestamos: any[], pagos: any[] }>('GET', `/clients/${id}`);
    } catch (error) {
      console.warn(`Usando datos mock de cliente individual para ID: ${id}`, error);
      // Normalizar ID para la búsqueda (asegurar string y trim)
      const searchId = String(id).trim();
      const cliente = MOCK_CLIENTES.find(c => String(c.id) === searchId);
      
      if (!cliente) {
        console.error(`Cliente con ID ${searchId} no encontrado en mocks. IDs disponibles:`, MOCK_CLIENTES.map(c => c.id));
        throw new Error(`Cliente con ID ${searchId} no encontrado en mock`);
      }
      
      return {
        ...cliente,
        prestamos: [],
        pagos: []
      };
    }
  },

  crearCliente: async (data: CrearClienteDto) => {
    return await apiRequest<Cliente>('POST', '/clients', data);
  },

  actualizarCliente: async (id: string, data: Partial<Cliente>) => {
    return await apiRequest<Cliente>('PATCH', `/clients/${id}`, data);
  },

  eliminarCliente: async (id: string) => {
    return await apiRequest<void>('DELETE', `/clients/${id}`);
  }
};