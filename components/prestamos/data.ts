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

// PRESTAMOS_MOCK removed — all components now use real API calls via prestamosService
