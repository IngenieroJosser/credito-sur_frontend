export type CierrePendienteRuta = {
  pendienteCierre?: boolean
  message?: string
  fechaOperativa?: string
  fechaActivacion?: string
  diasPendiente?: number
  rutaId?: string
  rutaNombre?: string
  cajaId?: string
  cobradorId?: string | null
  cobradorNombre?: string | null
  activacionId?: string
  requiereRegularizacion?: boolean
}

export type CuotaObjetivoCierrePendiente = {
  id: string
  numeroCuota: number
  estadoActual: string
  fechaVencimiento: string
  fechaVencimientoProrroga?: string | null
  fechaEfectiva: string
  montoCuota: number
  montoPagado: number
  saldoCuota: number
  saldoExigibleEnFechaOperativa: number
  enMoraEnFechaOperativa: boolean
  puedePagar: boolean
  puedeReprogramar: boolean
  esCuotaFuturaEnFechaOperativa?: boolean
  esCuotaPagadaHistorica?: boolean
  motivoBloqueoPago?: string | null
  motivoBloqueoReprogramacion?: string | null
}

export type ProximaCuotaCierrePendiente = {
  id?: string
  numeroCuota?: number
  fechaVencimiento?: string | Date | null
  monto?: number
  montoTotalDeuda?: number
  montoNominal?: number
  estado?: string
  enProrroga?: boolean
  fechaOriginalVencimiento?: string | Date | null
}

export type PrestamoCierrePendiente = {
  id: string
  numeroPrestamo?: string | null
  monto?: number
  saldoPendiente?: number
  frecuenciaPago?: string | null
  cantidadCuotas?: number | null
  estado?: string
  montoMetaOperativaPendiente?: number
  proximaCuota?: ProximaCuotaCierrePendiente | null
  cuotaObjetivo?: CuotaObjetivoCierrePendiente | null
  registroSintetico?: boolean
  origenGestion?: string
}

export type CierrePendienteResumen = {
  fechaOperativa: string
  fechaActivacion: string
  diasPendiente: number
  rutaId: string
  rutaNombre: string
  cobradorNombre: string | null
  meta: number
  recaudo: number
  recaudoOperativo?: number
  recaudoContable?: number
  recaudoRegularizado?: number
  recaudoEfectivo?: number
  recaudoTransferencia?: number
  recaudoContableEfectivo?: number
  recaudoContableTransferencia?: number
  recaudoRegularizadoEfectivo?: number
  recaudoRegularizadoTransferencia?: number
  pendiente: number
  gastos: number
  netoEfectivoRuta?: number
  efectividad: number
  totalClientes: number
  clientesGestionados: number
  clientesPagaron: number
  clientesAusentes: number
  clientesPendientes: number
}

export type ClienteCierrePendiente = {
  asignacionId?: string | null
  ordenVisita?: number
  clienteId?: string
  nombreCliente?: string
  dni?: string
  telefono?: string
  direccion?: string
  nivelRiesgo?: string
  estadoGestion: 'PAGO_REGISTRADO' | 'AUSENTE' | 'REPROGRAMADO' | 'PENDIENTE'
  recaudadoDelDia: number
  saldoOperativoJornada?: number
  metaOperativaJornada?: number
  estadoVisita?: string | null
  notasVisita?: string | null
  prestamos?: PrestamoCierrePendiente[]
  prestamoObjetivoId?: string | null
  cuotaObjetivoId?: string | null

  /**
   * @deprecated Usar cuotaObjetivoId.
   */
  cuotaObjetivoPrestamoId?: string | null

  cuotaObjetivo?: CuotaObjetivoCierrePendiente | null
}

export type CierrePendienteJornada = {
  cierrePendiente?: CierrePendienteRuta
  resumen?: CierrePendienteResumen
  clientes?: ClienteCierrePendiente[]
  accionesSugeridas?: string[]
}

export type CierrePendienteDetalle = {
  pendienteCierre: boolean
  totalPendientes?: number
  jornadas?: CierrePendienteJornada[]

  // Compatibilidad legacy
  cierrePendiente?: CierrePendienteRuta
  resumen?: CierrePendienteResumen
  clientes?: ClienteCierrePendiente[]
  accionesSugeridas?: string[]
}
