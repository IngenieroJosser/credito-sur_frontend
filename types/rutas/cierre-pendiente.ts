import type { ObligacionDeJornada } from '@/types/obligacion-jornada'
import type { CuotaOperativa } from '@/lib/types/cobranza'

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

/**
 * La cuota objetivo del cierre pendiente es la MISMA que la de la ruta del dia.
 *
 * Estaba escrita aparte con los mismos nombres pero obligatorios, y por eso el modal
 * del cierre no podia pasar la cuota que recibe sin un `any`. Se comprobo campo por
 * campo contra lo que arma el backend (routes.service.ts:4198-4217): es el mismo objeto,
 * asi que ahora es un alias y los siete campos que faltaban se agregaron a
 * `CuotaOperativa`, que es el tipo autoritativo.
 */
export type CuotaObjetivoCierrePendiente = CuotaOperativa

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
  totalObligaciones?: number
  obligacionesGestionadas?: number
  obligacionesPagaron?: number
  obligacionesAusentes?: number
  obligacionesPendientes?: number
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
  prestamoId?: string | null
  prestamoObjetivoId?: string | null
  cuotaId?: string | null
  cuotaObjetivoId?: string | null

  /**
   * @deprecated Usar cuotaObjetivoId.
   */
  cuotaObjetivoPrestamoId?: string | null

  cuotaObjetivo?: CuotaObjetivoCierrePendiente | null
}

/**
 * Una obligacion de la jornada pendiente de cierre.
 *
 * NO es un `ClienteCierrePendiente`, que es lo que decia antes. Se comprobo contra lo
 * que el backend arma (routes.service.ts:6903-6931): el elemento de `obligaciones` trae
 * `cliente` (objeto), `prestamo` y `cuotaObjetivo`, y NO trae `nombreCliente`, `dni`,
 * `telefono`, `direccion`, `nivelRiesgo` ni `saldoOperativoJornada`, que son los campos
 * del otro tipo. Es la misma forma que ya describe `ObligacionDeJornada`, asi que se
 * reusa en vez de escribirla una segunda vez.
 */
export type ObligacionCierrePendiente = ObligacionDeJornada

export type CierrePendienteJornada = {
  cierrePendiente?: CierrePendienteRuta
  resumen?: CierrePendienteResumen
  clientes?: ClienteCierrePendiente[]
  obligaciones?: ObligacionCierrePendiente[]
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
  obligaciones?: ObligacionCierrePendiente[]
  accionesSugeridas?: string[]
}

/**
 * Lo que viaja como "contexto de regularizacion" entre el cierre pendiente y las
 * pantallas que registran el pago.
 *
 * Todos los campos son opcionales porque el estado guarda UNA DE DOS formas, segun por
 * donde entro el usuario:
 *
 *  - El objeto que arma `CierrePendienteDetalleModal` (y el banner) y pasa a
 *    `onMarcarAusente` / `onReprogramar` / `onRegularizar`: `rutaId`, `fechaOperativa`,
 *    `activacionId`, `origenGestion`.
 *  - La salida de `buildRegularizedPaymentTarget`, que esparce la anterior y le suma la
 *    cuota objetivo y `fechaOperativaRuta`, DERIVADA de `fechaOperativa`.
 *
 * Por eso conviven `fechaOperativa` y `fechaOperativaRuta`, y por eso los lectores usan
 * la cadena `fechaOperativaRuta || fechaOperativa`: acepta las dos formas. Antes esto
 * era `any` en catorce sitios (tres `useState`, tres `useRef`, siete props y el
 * builder), con la forma escrita a mano dos veces.
 */
export type ContextoRegularizacion = {
  rutaId?: string
  clienteId?: string
  prestamoId?: string
  cuotaId?: string
  cuotaObjetivoId?: string
  cuotaObjetivoPrestamoId?: string
  cuotaNumeroEsperada?: number
  montoCuotaEsperado?: number
  fechaOperativa?: string
  fechaOperativaRuta?: string
  activacionId?: string
  origenGestion?: string
}
