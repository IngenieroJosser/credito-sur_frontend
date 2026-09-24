import type { CuotaOperativa } from '@/lib/types/cobranza';
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
  /**
   * Cuotas vencidas, calculadas por el servidor y adjuntadas al
   * prestamo (alertas-clientes.service). No es columna. `diasMora`, su
   * pareja, ya estaba declarado mas abajo.
   */
  cuotasVencidas?: number;
  /** Estado de la revision del credito (columna del modelo). */
  estadoAprobacion?: string;
  /** Efecto provisional aplicado mientras se aprueba. */
  efectoProvisional?: { estado?: string } | null;
  /** Marca de archivado; si viene, el prestamo no es operativo. */
  eliminadoEn?: string | null;
  /** Venta de contado: se paga en el momento y no se cobra en ruta. */
  esContado?: boolean;
  /** Id de la cuota que toca cobrar (routes.service:784). */
  cuotaObjetivoId?: string;
  /**
   * Alias que el codigo acepta y el backend NO manda: `cuotaId` por
   * `cuotaObjetivoId` y `tipo` por `tipoPrestamo`. Cada uno esta en una
   * cadena `a ?? b` junto al nombre bueno, asi que no estorban; se
   * declaran para que se sepa que de ahi no viene el dato.
   */
  cuotaId?: string;
  tipo?: string;
  /** La cuota objetivo ya enriquecida, cuando la respuesta la trae. */
  cuotaObjetivo?: CuotaOperativa | null;
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


/**
 * Un prestamo con lo que haya llegado.
 *
 * Las funciones del nucleo (`lib/rutas-core`) deciden si un prestamo es
 * operativo mirando tres o cuatro campos -estado, estadoAprobacion,
 * eliminadoEn- y se defienden solas de lo que falte. Se las llama con
 * prestamos completos, pero tambien con fragmentos: mientras se enriquece una
 * visita, y en las pruebas. Pedirles el prestamo entero seria pedir mas de lo
 * que usan.
 */
/**
 * Campos que el codigo lee del prestamo y no estaban declarados.
 *
 *   articulo             el backend SI lo manda (83 sitios en src/)
 *   frecuenciaRuta       NO existe en el backend; va en la cadena
 *                        `frecuenciaRuta || frecuenciaPago || frecuencia`,
 *                        asi que resuelve por el segundo eslabon
 */
export interface PrestamoCamposLeidos {
  articulo?: string | { nombre?: string } | null;
  descripcionArticulo?: string | null;
  frecuenciaRuta?: string | null;
}

export type PrestamoParcial = Partial<Prestamo & PrestamoCamposLeidos>;
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
  /**
   * El backend manda un subconjunto distinto en cada endpoint: unas veces
   * `{id, saldoPendiente}`, otras `{id, numeroPrestamo}` y en el export
   * solo `{numeroPrestamo}` (payments.service). Por eso va parcial: pedir
   * siempre `clienteId` describia algo que no llega nunca.
   */
  prestamo?: PrestamoParcial | null;
  clienteId?: string | null;
  /**
   * Lo que el backend selecciona aqui es `{id, nombres, apellidos, dni}` y
   * nada mas: comprobadas las siete variantes de payments.service. El codigo
   * lee ademas `direccion`, `telefono` y `nivelRiesgo`, que NO llegan nunca y
   * hoy resuelven a cadena vacia o al valor por defecto. Va parcial para
   * describir eso sin mentir en ninguna de las dos direcciones.
   */
  cliente?: Partial<Cliente> | null;
  rutaId?: string | null;
  cobradorId?: string | null;
  montoTotal: number;

  /**
   * El pago NO lleva su propio desglose: el modelo Pago solo tiene
   * `montoTotal` (schema.prisma). Capital, interes y mora viven en
   * `detalles[]`, una fila por cuota cubierta, porque un mismo pago puede
   * repartirse entre varias.
   *
   * Estaban declarados aqui como obligatorios, asi que el tipo prometia un
   * `number` donde en ejecucion siempre llegaba `undefined`. Se dejan
   * opcionales y anotados para que quien los lea sepa que tiene que sumar
   * `detalles`, no confiar en esto.
   */
  montoCapital?: number;
  montoInteres?: number;
  montoMora?: number;
  metodoPago: MetodoPago;
  fechaPago: string;
  comprobante?: string | null;
  notas?: string | null;
  /** Numero de recibo o referencia (columna del modelo). */
  numeroReferencia?: string | null;
  /**
   * Alias que el codigo acepta y el backend NO manda: `monto` por
   * `montoTotal` y `referencia` por `numeroReferencia`. Van siempre en
   * una cadena `a || b` junto al nombre bueno.
   */
  monto?: number;
  referencia?: string | null;
  /** Fecha operativa de la ruta a la que se imputa el pago (columna del modelo). */
  fechaOperativaRuta?: string | null;
  /**
   * Que cuotas cubrio este pago. Es el UNICO sitio donde vive el vinculo
   * pago->cuota: el modelo Pago no tiene columna `cuotaId`, la tiene
   * DetallePago. El listado de pagos los devuelve con la cuota anidada
   * (payments.service, findAll).
   */
  detalles?: Array<{
    id: string;
    cuotaId: string;
    monto: number;
    montoCapital?: number;
    montoInteres?: number;
    montoInteresMora?: number;
    cuota?: Pick<Cuota, 'id' | 'numeroCuota' | 'monto' | 'montoPagado' | 'estado'>;
  }>;
  creadoEn: string;

  /**
   * Quien cobro y en que ruta. El backend los incluye en el listado
   * (payments.service: cobrador con nombres/apellidos/rol, ruta con
   * id/nombre/codigo). Parciales porque cada endpoint selecciona lo suyo.
   */
  cobrador?: Partial<Usuario> | null;
  ruta?: Partial<Ruta> | null;

  /**
   * NO existe en el modelo: el pago no tiene estado propio. Lo que hay es
   * `estadoSincronizacion`, que es otra cosa -si ya se replico al espejo-.
   * El codigo lo lee como `p.estado || 'completado'`, asi que siempre
   * resuelve a completado, que es correcto: un pago registrado esta hecho.
   */
  estado?: string | null;

  /** Consecutivo del recibo. Lo genera el backend (payments.service). */
  numeroPago?: string | null;
  /** De dónde salió la gestión: CIERRE_PENDIENTE y similares. */
  origenGestion?: string | null;
  /** Cuánto se esperaba de la cuota cuando se cobró. */
  montoCuotaEsperado?: number | null;
  /** Saldo del crédito después de aplicar este pago. */
  saldoNuevo?: number | null;

  /**
   * Alias que el código lee y el backend NO manda nunca. Comprobado buscando
   * cada nombre en src/payments y en el esquema: cero apariciones. Van siempre
   * dentro de una cadena `a || b` junto al nombre bueno, así que hoy no rompen
   * nada; se declaran para que el tipo describa lo que el código lee de verdad
   * y no haya que taparlo con `any`.
   *
   *   cuotaAfectada / cuotaNumero  →  el vínculo vive en `detalles[].cuota`
   *   nuevoSaldo                   →  el backend manda `saldoNuevo`
   *   valor                        →  el backend manda `montoTotal`
   */
  cuotaAfectada?: unknown;
  /** Alias en singular de `detalles`. El backend manda siempre el plural. */
  detalle?: { cuota?: Partial<Cuota> | null } | null;
  /** Cuota suelta: el vinculo real vive en `detalles[].cuota`. */
  cuota?: Partial<Cuota> | null;
  cuotaNumero?: number | null;
  nuevoSaldo?: number | null;
  valor?: number | null;
}

/**
 * Un pago del que solo se leen algunos campos.
 *
 * Igual que [[PrestamoParcial]]: las funciones del núcleo de rutas reciben lo
 * que venga del listado, del historial o de la cola offline, y cada origen trae
 * un subconjunto distinto. Se defienden con `pago?.campo`, así que pedirles el
 * `Pago` entero sería mentir sobre lo que necesitan.
 */
export type PagoParcial = Partial<Pago>;

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
