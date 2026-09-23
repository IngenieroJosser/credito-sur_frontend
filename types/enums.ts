// Enums del sistema - Sincronizados con Prisma Schema

export enum EstadoUsuario {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  ARCHIVADO = 'ARCHIVADO'
}

export enum RolUsuario {
  SUPER_ADMINISTRADOR = 'SUPER_ADMINISTRADOR',
  ADMIN = 'ADMIN',
  COORDINADOR = 'COORDINADOR',
  SUPERVISOR = 'SUPERVISOR',
  COBRADOR = 'COBRADOR',
  CONTADOR = 'CONTADOR',
  PUNTO_DE_VENTA = 'PUNTO_DE_VENTA'
}

export enum NivelRiesgo {
  VERDE = 'VERDE',
  AMARILLO = 'AMARILLO',
  ROJO = 'ROJO',
  LISTA_NEGRA = 'LISTA_NEGRA'
}

/**
 * Estos dos son uniones de cadenas, no `enum`, y la diferencia importa.
 *
 * Un `enum` de TypeScript es un tipo nominal: un `'ACTIVO'` que llega del API
 * en un JSON NO encaja en `EstadoPrestamo` aunque el valor sea identico. Como
 * todo lo que maneja prestamos y cuotas viene del servidor como cadena, tipar
 * cualquiera de los dos obligaba a castear en cada comparacion, y por eso casi
 * todo ese codigo seguia en `any`.
 *
 * Con una union, `'ACTIVO'` encaja solo. Se comprobo antes de cambiarlo que
 * nadie los usaba como valor -ni una sola referencia a `EstadoPrestamo.X` o
 * `EstadoCuota.X` en todo el proyecto-, asi que el objeto que el `enum` emitia
 * era codigo muerto.
 *
 * Los demas enums de este archivo SI se usan como valor y se quedan como estan.
 */
export type EstadoPrestamo =
  | 'BORRADOR'
  | 'PENDIENTE_APROBACION'
  | 'ACTIVO'
  | 'EN_MORA'
  | 'PAGADO'
  | 'INCUMPLIDO'
  | 'PERDIDA'

export type EstadoCuota =
  | 'PENDIENTE'
  | 'PAGADA'
  | 'PARCIAL'
  | 'VENCIDA'
  | 'PRORROGADA'

export enum FrecuenciaPago {
  DIARIO = 'DIARIO',
  SEMANAL = 'SEMANAL',
  QUINCENAL = 'QUINCENAL',
  MENSUAL = 'MENSUAL'
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA'
}

export enum TipoAmortizacion {
  INTERES_SIMPLE = 'INTERES_SIMPLE',
  FRANCESA = 'FRANCESA',
  INTERES_PLANO = 'INTERES_PLANO'
}

export enum EstadoAprobacion {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  CANCELADO = 'CANCELADO'
}

export enum TipoAprobacion {
  NUEVO_CLIENTE = 'NUEVO_CLIENTE',
  NUEVO_PRESTAMO = 'NUEVO_PRESTAMO',
  GASTO = 'GASTO',
  SOLICITUD_BASE_EFECTIVO = 'SOLICITUD_BASE_EFECTIVO',
  PAGO_TRANSFERENCIA = 'PAGO_TRANSFERENCIA',
  PRORROGA_PAGO = 'PRORROGA_PAGO',
  BAJA_POR_PERDIDA = 'BAJA_POR_PERDIDA',
  REPROGRAMACION_CUOTA = 'REPROGRAMACION_CUOTA',
}

export enum TipoGasto {
  OPERATIVO = 'OPERATIVO',
  TRANSPORTE = 'TRANSPORTE',
  OTRO = 'OTRO'
}

export enum TipoCaja {
  PRINCIPAL = 'PRINCIPAL',
  RUTA = 'RUTA'
}

export enum TipoTransaccion {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
  TRANSFERENCIA = 'TRANSFERENCIA'
}

export enum EstadoSincronizacion {
  PENDIENTE = 'PENDIENTE',
  SINCRONIZADO = 'SINCRONIZADO',
  CONFLICTO = 'CONFLICTO',
  ERROR = 'ERROR'
}

export enum TipoContenidoMultimedia {
  FOTO_PERFIL = 'FOTO_PERFIL',
  DOCUMENTO_IDENTIDAD_FRENTE = 'DOCUMENTO_IDENTIDAD_FRENTE',
  DOCUMENTO_IDENTIDAD_REVERSO = 'DOCUMENTO_IDENTIDAD_REVERSO',
  COMPROBANTE_DOMICILIO = 'COMPROBANTE_DOMICILIO',
  FIRMA_DIGITAL = 'FIRMA_DIGITAL',
  FOTO_PRODUCTO = 'FOTO_PRODUCTO',
  RECIBO_PAGO = 'RECIBO_PAGO',
  EVIDENCIA_GASTO = 'EVIDENCIA_GASTO',
  CONTRATO_PRESTAMO = 'CONTRATO_PRESTAMO',
  OTRO_DOCUMENTO = 'OTRO_DOCUMENTO'
}

export enum EstadoMultimedia {
  TEMPORAL = 'TEMPORAL',
  ACTIVO = 'ACTIVO',
  ELIMINADO = 'ELIMINADO'
}

// Type exports para compatibilidad con codigo existente
export type RolUsuarioType = keyof typeof RolUsuario;
export type EstadoUsuarioType = keyof typeof EstadoUsuario;
export type NivelRiesgoType = keyof typeof NivelRiesgo;
export type EstadoPrestamoType = EstadoPrestamo;
export type EstadoCuotaType = EstadoCuota;
export type FrecuenciaPagoType = keyof typeof FrecuenciaPago;
export type MetodoPagoType = keyof typeof MetodoPago;
export type EstadoAprobacionType = keyof typeof EstadoAprobacion;
export type TipoAprobacionType = keyof typeof TipoAprobacion;
export type TipoGastoType = keyof typeof TipoGasto;
export type TipoCajaType = keyof typeof TipoCaja;
export type TipoTransaccionType = keyof typeof TipoTransaccion;
