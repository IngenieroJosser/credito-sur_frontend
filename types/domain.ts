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
  /** Alias de cedula — usado en gran parte del frontend */
  dni?: string | null;
  nivelRiesgo: NivelRiesgo;
  estado: string;
  foto?: string | null;
  creadoEn: string;
  actualizadoEn: string;
  enListaNegra?: boolean;
  razonListaNegra?: string | null;
  fechaListaNegra?: string | null;
  eliminadoEn?: string | null;
  // Campos extendidos del backend
  archivos?: { id: string; url?: string; path?: string; ruta?: string; tipoArchivo?: string }[];
}

// ─── PRÉSTAMO ────────────────────────────────────────────────────────────────

export interface Prestamo {
  id: string;
  numeroPrestamo: string;          // Código generado por el backend, ej: "P-2024-00125"
  clienteId: string;
  cliente?: Cliente;
  cobradorId?: string | null;      // Cobrador asignado al préstamo
  rutaId?: string | null;
  monto: number;
  saldoPendiente: number;
  tasaInteres: number;
  tasaInteresMora: number;
  frecuenciaPago: FrecuenciaPago;
  cantidadCuotas: number;
  estado: EstadoPrestamo;
  nivelRiesgo?: NivelRiesgo | null;
  fechaInicio: string;
  fechaFin?: string | null;
  proximaCuotaFecha?: string | null; // Fecha de la próxima cuota a vencer
  tipoPrestamo?: string | null;
  descripcionArticulo?: string | null;
  cuotas?: Cuota[];
  extensiones?: Extension[];
  proximaCuota?: Cuota | null;
  creadoEn: string;
  actualizadoEn: string;
  // ── Campos calculados / enriquecidos que devuelve el backend ───────────────
  montoTotal?: number;             // monto + intereses
  montoPrestado?: number;          // capital inicial sin intereses
  interesTotal?: number;
  montoPendiente?: number;
  capitalPagado?: number;
  interesPagado?: number;
  totalPagado?: number;
  interesMoraPagado?: number;
  moraAcumulada?: number;
  plazoMeses?: number;
  cuotaInicial?: number;
  montoCuota?: number;
  valorCuota?: number;
  diasMora?: number;
  proximoPago?: string | null;
  fechaVencimiento?: string | null;
  fechaPrimerCobro?: string | null;
  tipoAmortizacion?: string | null;
  notas?: string | null;
  garantia?: string | null;
  duracion?: string | null;
  frecuencia?: string | null;
  // Campos de cliente aplanados
  clienteNombre?: string | null;
  clienteDni?: string | null;
  clienteTelefono?: string | null;
  clienteDireccion?: string | null;
  // Producto (para créditos por artículo)
  producto?: {
    id?: string;
    nombre?: string;
    precio?: number;
    descripcion?: string;
    [key: string]: unknown;
  } | null;
  fotos?: string[];
  archivos?: { id: string; url?: string; path?: string; ruta?: string }[];
  // Campos UI calculados (vienen ya calculados en el objeto de lista)
  progreso?: number;
  cuotasPagadas?: number;
  cuotasTotales?: number;
  riesgo?: string | null;
  tipoProducto?: string | null;
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
