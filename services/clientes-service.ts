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
    diasMora: 0,
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
    montoMora: 80000,
    diasMora: 10,
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
    diasMora: 25,
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
    diasMora: 45,
    rutaId: 'r3',
    estadoAprobacion: 'RECHAZADO',
    fechaRegistro: '2022-11-05',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    codigo: 'CLI-005',
    nombres: 'Pedro',
    apellidos: 'Ramírez',
    dni: '1.060.101.010',
    telefono: '301 111 2222',
    correo: 'pedro.ramirez@email.com',
    direccion: 'Calle 45 # 12-34',
    referencia: 'Tienda de repuestos',
    nivelRiesgo: 'VERDE',
    puntaje: 90,
    enListaNegra: false,
    montoTotal: 300000,
    montoMora: 0,
    diasMora: 0,
    rutaId: 'r2',
    estadoAprobacion: 'APROBADO',
    fechaRegistro: '2024-01-10',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    codigo: 'CLI-006',
    nombres: 'Sofía',
    apellidos: 'Quintero',
    dni: '1.070.202.020',
    telefono: '302 222 3333',
    correo: null,
    direccion: 'Barrio San José, Mz 2 Casa 8',
    referencia: null,
    nivelRiesgo: 'AMARILLO',
    puntaje: 62,
    enListaNegra: false,
    montoTotal: 1200000,
    montoMora: 60000,
    diasMora: 8,
    rutaId: 'r3',
    estadoAprobacion: 'APROBADO',
    fechaRegistro: '2023-08-02',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '7',
    codigo: 'CLI-007',
    nombres: 'Mariana',
    apellidos: 'Londoño',
    dni: '1.080.303.030',
    telefono: '303 333 4444',
    correo: 'mariana.londono@email.com',
    direccion: null,
    referencia: 'Frente al parque',
    nivelRiesgo: 'ROJO',
    puntaje: 40,
    enListaNegra: false,
    montoTotal: 2100000,
    montoMora: 180000,
    diasMora: 31,
    rutaId: 'r1',
    estadoAprobacion: 'APROBADO',
    fechaRegistro: '2023-06-18',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '8',
    codigo: 'CLI-008',
    nombres: 'Andrés',
    apellidos: 'Vargas',
    dni: '1.090.404.040',
    telefono: '304 444 5555',
    correo: 'andres.vargas@email.com',
    direccion: 'Av. 30 # 99-10',
    referencia: 'Local 12',
    nivelRiesgo: 'AMARILLO',
    puntaje: 58,
    enListaNegra: false,
    montoTotal: 3500000,
    montoMora: 250000,
    diasMora: 18,
    rutaId: 'r4',
    estadoAprobacion: 'PENDIENTE',
    fechaRegistro: '2024-02-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '9',
    codigo: 'CLI-009',
    nombres: 'Camilo',
    apellidos: 'Hernández',
    dni: '1.100.505.050',
    telefono: '305 555 6666',
    correo: null,
    direccion: 'Urb. Las Flores, Casa 12',
    referencia: null,
    nivelRiesgo: 'VERDE',
    puntaje: 78,
    enListaNegra: false,
    montoTotal: 900000,
    montoMora: 0,
    diasMora: 0,
    rutaId: 'r4',
    estadoAprobacion: 'APROBADO',
    fechaRegistro: '2023-10-11',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '10',
    codigo: 'CLI-010',
    nombres: 'Valentina',
    apellidos: 'Castro',
    dni: '1.110.606.060',
    telefono: '306 666 7777',
    correo: 'valentina.castro@email.com',
    direccion: 'Cra 7 # 20-30',
    referencia: 'Edificio rojo',
    nivelRiesgo: 'LISTA_NEGRA',
    puntaje: 10,
    enListaNegra: true,
    montoTotal: 700000,
    montoMora: 700000,
    diasMora: 60,
    rutaId: 'r2',
    estadoAprobacion: 'CANCELADO',
    fechaRegistro: '2022-05-09',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '11',
    codigo: 'CLI-011',
    nombres: 'Roberto',
    apellidos: 'Gómez',
    dni: '1.111.777.888',
    telefono: '310 999 0000',
    correo: 'roberto.gomez@email.com',
    direccion: 'Calle Falsa 123',
    referencia: 'Esquina azul',
    nivelRiesgo: 'VERDE',
    puntaje: 85,
    enListaNegra: false,
    montoTotal: 1500000,
    montoMora: 0,
    diasMora: 0,
    rutaId: 'r1',
    estadoAprobacion: 'APROBADO',
    fechaRegistro: '2024-01-15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '12',
    codigo: 'CLI-012',
    nombres: 'Marta',
    apellidos: 'Sánchez',
    dni: '1.222.333.444',
    telefono: '320 111 2222',
    correo: 'marta.sanchez@email.com',
    direccion: 'Av. Siempre Viva 742',
    referencia: 'Cerca al parque',
    nivelRiesgo: 'AMARILLO',
    puntaje: 55,
    enListaNegra: false,
    montoTotal: 2000000,
    montoMora: 150000,
    diasMora: 12,
    rutaId: 'r2',
    estadoAprobacion: 'APROBADO',
    fechaRegistro: '2023-11-20',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '13',
    codigo: 'CLI-013',
    nombres: 'Juan',
    apellidos: 'Pérez',
    dni: '1.333.444.555',
    telefono: '300 444 5555',
    correo: null,
    direccion: 'Carrera 10 # 5-67',
    referencia: 'Frente al CAI',
    nivelRiesgo: 'ROJO',
    puntaje: 30,
    enListaNegra: false,
    montoTotal: 500000,
    montoMora: 200000,
    diasMora: 40,
    rutaId: 'r1',
    estadoAprobacion: 'APROBADO',
    fechaRegistro: '2023-05-10',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const clientesService = {
  obtenerClientes: async () => {
    try {
      const response = await apiRequest<Cliente[] | { data: Cliente[] }>('GET', '/clients');
      // Manejar tanto arrays como objetos con propiedad data
      if (Array.isArray(response)) {
        return response;
      }
      if (response && 'data' in response) {
        return response.data;
      }
      return MOCK_CLIENTES;
    } catch (error) {
      console.warn('Usando datos mock de clientes', error);
      return MOCK_CLIENTES;
    }
  },

  obtenerCliente: async (id: string) => {
    try {
      return await apiRequest<Cliente & { prestamos: unknown[]; pagos: unknown[] }>('GET', `/clients/${id}`);
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