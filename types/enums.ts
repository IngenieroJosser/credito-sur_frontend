// Enums del sistema - Sincronizados con Prisma Schema

export enum EstadoUsuario {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO'
}

export enum RolUsuario {
  SUPER_ADMINISTRADOR = 'SUPER_ADMINISTRADOR',
  ADMIN = 'ADMIN',
  COORDINADOR = 'COORDINADOR',
  SUPERVISOR = 'SUPERVISOR',
  COBRADOR = 'COBRADOR',
  CONTADOR = 'CONTADOR'
}

export enum NivelRiesgo {
  VERDE = 'VERDE',
  AMARILLO = 'AMARILLO',
  ROJO = 'ROJO',
  LISTA_NEGRA = 'LISTA_NEGRA'
}

export enum EstadoPrestamo {
  BORRADOR = 'BORRADOR',
  PENDIENTE_APROBACION = 'PENDIENTE_APROBACION',
  ACTIVO = 'ACTIVO',
  EN_MORA = 'EN_MORA',
  PAGADO = 'PAGADO',
  INCUMPLIDO = 'INCUMPLIDO',
  PERDIDA = 'PERDIDA'
}

export enum EstadoCuota {
  PENDIENTE = 'PENDIENTE',
  PAGADA = 'PAGADA',
  PARCIAL = 'PARCIAL',
  VENCIDA = 'VENCIDA',
  PRORROGADA = 'PRORROGADA'
}

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
  PRORROGA_PAGO = 'PRORROGA_PAGO',
  BAJA_POR_PERDIDA = 'BAJA_POR_PERDIDA'
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
export type EstadoPrestamoType = keyof typeof EstadoPrestamo;
export type EstadoCuotaType = keyof typeof EstadoCuota;
export type FrecuenciaPagoType = keyof typeof FrecuenciaPago;
export type MetodoPagoType = keyof typeof MetodoPago;
export type EstadoAprobacionType = keyof typeof EstadoAprobacion;
export type TipoAprobacionType = keyof typeof TipoAprobacion;
export type TipoGastoType = keyof typeof TipoGasto;
export type TipoCajaType = keyof typeof TipoCaja;
export type TipoTransaccionType = keyof typeof TipoTransaccion;
