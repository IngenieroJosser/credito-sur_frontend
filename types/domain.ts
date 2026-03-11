/**
 * types/domain.ts
 *
 * Interfaces del dominio derivadas de los modelos Prisma del backend.
 * Úsalas en los servicios en lugar de `any` para tener type-safety completo.
 *
 * Regla: Si el backend cambia un campo, TypeScript lo detecta aquí primero.
 */

import type {
  EstadoPrestamo,
  FrecuenciaPago,
  EstadoCuota,
  MetodoPago,
  NivelRiesgo,
} from './enums';

// ─── USUARIO ────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: string;
  esPrincipal: boolean;
  estado: string;
  telefono?: string | null;
  creadoEn: string;
  ultimoIngreso?: string | null;
  permisos?: string[];
}

// ─── CLIENTE ────────────────────────────────────────────────────────────────

export interface Cliente {
  id: string;
  nombres: string;
  apellidos: string;
  correo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  cedula?: string | null;
  nivelRiesgo: NivelRiesgo;
  estado: string;
  foto?: string | null;
  creadoEn: string;
  actualizadoEn: string;
  eliminadoEn?: string | null;
}

// ─── PRÉSTAMO ────────────────────────────────────────────────────────────────

export interface Prestamo {
  id: string;
  clienteId: string;
  cliente?: Cliente;
  monto: number;
  saldoPendiente: number;
  tasaInteres: number;
  tasaInteresMora: number;
  frecuenciaPago: FrecuenciaPago;
  cantidadCuotas: number;
  estado: EstadoPrestamo;
  fechaInicio: string;
  fechaFin?: string | null;
  tipoPrestamo?: string | null;
  descripcionArticulo?: string | null;
  cuotas?: Cuota[];
  extensiones?: Extension[];
  proximaCuota?: Cuota | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Cuota {
  id: string;
  prestamoId: string;
  numeroCuota: number;
  fechaVencimiento: string;
  monto: number;
  montoCapital: number;
  montoInteres: number;
  montoInteresMora: number;
  estado: EstadoCuota;
  montoPagado: number;
  fechaPago?: string | null;
  fechaVencimientoProrroga?: string | null;
  creadoEn: string;
}

export interface Extension {
  id: string;
  prestamoId: string;
  nuevaFechaVencimiento: string;
  motivo?: string | null;
  creadoEn: string;
}

// ─── PAGO ────────────────────────────────────────────────────────────────────

export interface Pago {
  id: string;
  prestamoId: string;
  prestamo?: Pick<Prestamo, 'id' | 'clienteId' | 'cliente'>;
  clienteId?: string | null;
  cliente?: Pick<Cliente, 'id' | 'nombres' | 'apellidos'>;
  rutaId?: string | null;
  cobradorId?: string | null;
  montoTotal: number;
  montoCapital: number;
  montoInteres: number;
  montoMora: number;
  metodoPago: MetodoPago;
  fechaPago: string;
  comprobante?: string | null;
  notas?: string | null;
  creadoEn: string;
}

// ─── RUTA ────────────────────────────────────────────────────────────────────

export interface Ruta {
  id: string;
  nombre: string;
  codigo?: string | null;
  zona?: string | null;
  cobradorId?: string | null;
  cobrador?: Pick<Usuario, 'id' | 'nombres' | 'apellidos'>;
  activa: boolean;
  creadoEn: string;
}

export interface AsignacionRuta {
  id: string;
  rutaId: string;
  clienteId: string;
  cliente?: Cliente;
  ordenVisita?: number | null;
  estado?: string | null;
  horaSugerida?: string | null;
  prioridad?: string | null;
}

// ─── CAJA / CONTABILIDAD ─────────────────────────────────────────────────────

export interface Caja {
  id: string;
  nombre: string;
  tipo: string;
  saldoActual: number;
  moneda?: string;
  activa: boolean;
  descripcion?: string | null;
  creadoEn: string;
}

export interface Transaccion {
  id: string;
  cajaId: string;
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  concepto: string;
  referencia?: string | null;
  fecha: string;
  creadoEn: string;
}

export interface Gasto {
  id: string;
  categoria: string;
  descripcion?: string | null;
  monto: number;
  rutaId?: string | null;
  comprobante?: string | null;
  fecha: string;
  creadoEn: string;
}

// ─── NOTIFICACIÓN ────────────────────────────────────────────────────────────

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'PAGO' | 'CLIENTE' | 'PRESTAMO' | 'GASTO' | 'MORA' | 'SISTEMA' | 'APROBACION' | 'SOLICITUD_DINERO' | string;
  leida: boolean;
  estado?: string | null;
  rutaId?: string | null;
  entidadId?: string | null;
  fecha?: string;
  creadoEn?: string;
  metadata?: Record<string, unknown>;
  detalles?: Record<string, unknown>;
  link?: string;
  solicitante?: string;
  motivoRechazo?: string;
}

// ─── AUDITORÍA ───────────────────────────────────────────────────────────────

export interface RegistroAuditoria {
  id: string;
  usuarioId: string;
  usuario?: Pick<Usuario, 'id' | 'nombres' | 'apellidos' | 'correo'>;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  datosAnteriores?: Record<string, unknown> | null;
  datosNuevos?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  creadoEn: string;
}

// ─── HELPERS DE PAGINACIÓN ───────────────────────────────────────────────────

export interface Paginacion {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface RespuestaPaginada<T> {
  items: T[];
  paginacion: Paginacion;
}
