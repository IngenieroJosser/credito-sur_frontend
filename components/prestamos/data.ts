// Tipos alineados con Prisma Schema
export type EstadoPrestamo = 'BORRADOR' | 'PENDIENTE_APROBACION' | 'ACTIVO' | 'EN_MORA' | 'PAGADO' | 'INCUMPLIDO' | 'PERDIDA';
export type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';

export interface Prestamo {
  id: string;
  cliente: string;
  clienteId: string;
  producto: string;
  montoTotal: number;
  montoPagado: number;
  montoPendiente: number;
  cuotasTotales: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  fechaInicio: string;
  fechaVencimiento: string;
  proximoPago: string;
  estado: EstadoPrestamo;
  tasaInteres: number;
  diasMora?: number;
  moraAcumulada?: number;
  riesgo: NivelRiesgo;
  ruta?: string;
  // icono is UI concern, usually mapped from type/product, but here we can keep it optional or string
  tipoProducto?: 'electrodomestico' | 'efectivo' | 'mueble' | 'otro';
}

export const PRESTAMOS_MOCK: Prestamo[] = [
  {
    id: 'PR-2023-001',
    cliente: 'Carlos Rodríguez',
    clienteId: 'CL-001',
    producto: 'Refrigeradora Samsung',
    montoTotal: 1200000,
    montoPagado: 720000,
    montoPendiente: 480000,
    cuotasTotales: 12,
    cuotasPagadas: 7,
    cuotasPendientes: 5,
    fechaInicio: '15 Ene 2023',
    fechaVencimiento: '15 Dic 2023',
    proximoPago: '15 Ago 2023',
    estado: 'ACTIVO',
    tasaInteres: 1.5,
    diasMora: 0,
    riesgo: 'AMARILLO',
    tipoProducto: 'electrodomestico',
    ruta: 'Norte'
  },
  {
    id: 'PR-2023-002',
    cliente: 'Ana Gómez',
    clienteId: 'CL-002',
    producto: 'Lavadora LG',
    montoTotal: 850000,
    montoPagado: 850000,
    montoPendiente: 0,
    cuotasTotales: 10,
    cuotasPagadas: 10,
    cuotasPendientes: 0,
    fechaInicio: '10 Jun 2022',
    fechaVencimiento: '10 Mar 2023',
    proximoPago: '-',
    estado: 'PAGADO',
    tasaInteres: 1.8,
    riesgo: 'VERDE',
    tipoProducto: 'electrodomestico',
    ruta: 'Centro'
  },
  {
    id: 'PR-2023-003',
    cliente: 'Roberto Sánchez',
    clienteId: 'CL-003',
    producto: 'Cocina a Gas',
    montoTotal: 650000,
    montoPagado: 325000,
    montoPendiente: 325000,
    cuotasTotales: 8,
    cuotasPagadas: 4,
    cuotasPendientes: 4,
    fechaInicio: '05 Mar 2023',
    fechaVencimiento: '05 Oct 2023',
    proximoPago: '05 Ago 2023',
    estado: 'EN_MORA',
    tasaInteres: 1.6,
    diasMora: 7,
    moraAcumulada: 12500,
    riesgo: 'ROJO',
    tipoProducto: 'electrodomestico',
    ruta: 'Sur'
  },
  {
    id: 'PR-2023-004',
    cliente: 'María López',
    clienteId: 'CL-004',
    producto: 'Televisor 55"',
    montoTotal: 950000,
    montoPagado: 190000,
    montoPendiente: 760000,
    cuotasTotales: 12,
    cuotasPagadas: 2,
    cuotasPendientes: 10,
    fechaInicio: '01 Abr 2023',
    fechaVencimiento: '01 Mar 2024',
    proximoPago: '01 Jun 2023',
    estado: 'ACTIVO',
    tasaInteres: 1.4,
    riesgo: 'VERDE',
    tipoProducto: 'electrodomestico',
    ruta: 'Norte'
  },
  {
    id: 'PR-2023-005',
    cliente: 'Luis Fernández',
    clienteId: 'CL-005',
    producto: 'Aire Acondicionado',
    montoTotal: 1800000,
    montoPagado: 450000,
    montoPendiente: 1350000,
    cuotasTotales: 18,
    cuotasPagadas: 3,
    cuotasPendientes: 15,
    fechaInicio: '20 May 2023',
    fechaVencimiento: '20 Oct 2024',
    proximoPago: '20 Ago 2023',
    estado: 'INCUMPLIDO',
    tasaInteres: 1.7,
    diasMora: 45,
    moraAcumulada: 67800,
    riesgo: 'ROJO',
    tipoProducto: 'electrodomestico',
    ruta: 'Centro'
  },
  {
    id: 'PR-2023-006',
    cliente: 'Carlos Rodríguez',
    clienteId: 'CL-001',
    producto: 'Microondas',
    montoTotal: 350000,
    montoPagado: 350000,
    montoPendiente: 0,
    cuotasTotales: 6,
    cuotasPagadas: 6,
    cuotasPendientes: 0,
    fechaInicio: '15 Nov 2022',
    fechaVencimiento: '15 Abr 2023',
    proximoPago: '-',
    estado: 'PAGADO',
    tasaInteres: 1.3,
    riesgo: 'VERDE',
    tipoProducto: 'electrodomestico',
    ruta: 'Sur'
  },
  {
    id: 'PR-2023-007',
    cliente: 'Ana Gómez',
    clienteId: 'CL-002',
    producto: 'Refrigeradora Samsung',
    montoTotal: 1200000,
    montoPagado: 600000,
    montoPendiente: 600000,
    cuotasTotales: 12,
    cuotasPagadas: 6,
    cuotasPendientes: 6,
    fechaInicio: '10 Feb 2023',
    fechaVencimiento: '10 Ene 2024',
    proximoPago: '10 Ago 2023',
    estado: 'ACTIVO',
    tasaInteres: 1.5,
    riesgo: 'AMARILLO',
    tipoProducto: 'electrodomestico',
    ruta: 'Norte'
  },
  {
    id: 'PR-2023-008',
    cliente: 'Pedro Martínez',
    clienteId: 'CL-006',
    producto: 'Lavadora LG',
    montoTotal: 850000,
    montoPagado: 0,
    montoPendiente: 850000,
    cuotasTotales: 10,
    cuotasPagadas: 0,
    cuotasPendientes: 10,
    fechaInicio: '01 Jun 2023',
    fechaVencimiento: '01 Mar 2024',
    proximoPago: '01 Jul 2023',
    estado: 'PERDIDA',
    tasaInteres: 1.8,
    riesgo: 'LISTA_NEGRA',
    tipoProducto: 'electrodomestico',
    ruta: 'Norte'
  }
];
