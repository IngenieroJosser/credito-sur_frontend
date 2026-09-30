/**
 * La obligación de una jornada, tal como la manda el backend.
 *
 * Es lo que viene en `DailyVisitsResponse.obligaciones`, y era `any[]`. De ese `any`
 * colgaban los `any` de siete archivos: el mapeo a visitas, el historial del día, el
 * cálculo de la meta operativa y tres pantallas. Por eso quitar anotaciones hoja por
 * hoja no servía: el compilador no tenía de dónde inferir.
 *
 * ── Cómo se armó ────────────────────────────────────────────────────────────────
 *
 * Leyendo los siete consumidores y anotando cada campo que tocan, no iterando sobre
 * los errores de tsc. Eso último ya se intentó una vez y hubo que revertirlo: cada
 * campo que se declaraba descubría otros dos, porque el inventario nunca estaba
 * completo.
 *
 * ── Por qué todo es opcional y los números admiten texto ────────────────────────
 *
 * Todo opcional porque el backend arma esta fila desde varias consultas y no todas
 * llenan lo mismo: el listado trae menos que el detalle, y una obligación sin cuota
 * objetivo no trae nada de mora. Declarar un campo obligatorio que a veces no llega
 * haría mentir al tipo, que es lo que se está arreglando.
 *
 * Los montos admiten `string` porque Prisma serializa `Decimal` como texto en JSON:
 * el código los pasa por `Number(...)` en todos los sitios, y declarar `number` a
 * secas obligaría a un cast en cada lectura.
 */

import type { CuotaOperativa } from '@/lib/types/cobranza'

/**
 * Un monto: puede llegar como texto.
 *
 * Prisma serializa `Decimal` como string en JSON, asi que todo el dinero puede
 * venir de las dos formas y el codigo lo pasa por `Number(...)`.
 *
 * Los CONTADORES no van aqui: `numeroCuota`, `diasMora`, `cuotasVencidas` y
 * `ordenVisita` son enteros en la base y llegan como numero. Al principio se
 * declararon todos como monto y el compilador lo señalo al asignar `numeroCuota` a
 * `VisitaRuta.cuotaActual`, que es `number`: metia un `string` que no puede llegar.
 */
export type NumeroDeApi = number | string | null

/**
 * Una fecha del backend: siempre texto ISO.
 *
 * Se declaro `string | Date` al principio, por si acaso, y el compilador lo
 * rechazo: `VisitaRuta.proximaVisita` es `string`. Y tenia razon, porque esto
 * viaja por JSON y ahi no hay Date. Una union de mas tambien es un tipo que
 * miente.
 */
export type FechaDeApi = string | null

/** El cliente de la obligación. Llega como objeto, o como texto con solo el nombre. */
// Sin `| null` en los textos: `Cliente` y `Prestamo`, que ya existen, los declaran
// `string | undefined`, y con el null no se les podia asignar. Si el backend algun
// dia manda null ahi, el arreglo va en los tres tipos, no solo en este.
export type ClienteDeObligacion = {
  id?: string
  dni?: string
  nombre?: string
  nombres?: string
  apellidos?: string
  direccion?: string
  telefono?: string
  nivelRiesgo?: string
}

/** El préstamo de la obligación, con las señales de riesgo que el backend calcula. */
export type PrestamoDeObligacion = {
  id?: string
  numeroPrestamo?: string
  estado?: string
  estadoPrestamo?: string
  estadoGestion?: string
  estadoVisita?: string
  estadoAprobacion?: string
  frecuenciaPago?: string
  tipoPrestamo?: string
  tipo?: string

  saldoPendiente?: NumeroDeApi
  saldoTotal?: NumeroDeApi
  cantidadCuotas?: number | null
  montoMetaOperativaPendiente?: NumeroDeApi

  // Las tres conviven a propósito: el backend manda una u otra según el endpoint, y
  // el frontend las lee en cascada. Unificarlas es otro trabajo.
  nivelRiesgoCredito?: string
  nivelRiesgoObligacion?: string
  nivelRiesgoBackend?: string
  riesgoCredito?: string
  riesgoOperativo?: string
  riesgoOperativoEnFecha?: string

  // Estos siete los nombro el compilador cuando se declaro el tipo: el codigo los
  // leia del prestamo y el inventario inicial no los tenia. Es la unica forma de
  // completarlo sin adivinar.
  montoCuota?: NumeroDeApi
  montoCuotaNormal?: NumeroDeApi
  notasVisita?: string
  descripcionArticulo?: string
  frecuencia?: string
  frecuenciaRuta?: string
  esProvisional?: boolean | null

  cliente?: ClienteDeObligacion | string | null
  cuotaObjetivo?: CuotaOperativa | null
  proximaCuota?: CuotaOperativa | null
  producto?: { nombre?: string } | null
  /**
   * El NOMBRE del articulo, no el articulo.
   *
   * Se declaro como objeto y el compilador lo rechazo al asignarlo a
   * `articuloNombre`, que es texto. Se rastreo al backend:
   * `articulo: p.producto?.nombre || p.producto?.descripcion || null`
   * (routes.service.ts:871). Es texto: el codigo estaba bien y el tipo mal.
   */
  articulo?: string | null
}

/** La visita registrada del día, si ya hay una. */
export type VisitaDeObligacion = {
  id?: string
  cliente?: ClienteDeObligacion | string | null
  ordenVisita?: number | null
  proximaVisita?: FechaDeApi
  estadoGestion?: string
  estadoVisita?: string
  notasVisita?: string
  recaudadoDelDia?: NumeroDeApi
  cuotaObjetivoId?: string
  prestamoObjetivoId?: string
}

export type ObligacionDeJornada = {
  id?: string
  asignacionId?: string | null
  clienteId?: string | null
  prestamoId?: string | null
  cuotaId?: string | null
  cuotaObjetivoId?: string | null
  cuotaObjetivoPrestamoId?: string | null
  prestamoObjetivoId?: string | null

  cliente?: ClienteDeObligacion | string | null
  clienteNombre?: string | null
  nombreCliente?: string | null
  direccion?: string | null
  telefono?: string | null

  prestamo?: PrestamoDeObligacion | null
  prestamos?: PrestamoDeObligacion[] | null
  cuotaObjetivo?: CuotaOperativa | null
  proximaCuota?: CuotaOperativa | null
  visita?: VisitaDeObligacion | null

  estado?: string | null
  estadoActual?: string | null
  estadoGestion?: string | null
  estadoVisita?: string | null
  estadoCalculado?: string | null
  estadoCalculadoEnFecha?: string | null
  estadoAprobacion?: string | null
  estadoEfectoProvisional?: string | null
  etiquetaRevision?: string | null
  esProvisional?: boolean | null
  esRevertido?: boolean | null

  frecuenciaPago?: string | null
  prioridad?: string | number | null
  ordenVisita?: number | null
  notasVisita?: string | null
  fechaVisita?: FechaDeApi
  proximaVisita?: FechaDeApi
  fechaVencimiento?: FechaDeApi
  fechaEfectiva?: FechaDeApi

  monto?: NumeroDeApi
  montoCuota?: NumeroDeApi
  montoCuotaNormal?: NumeroDeApi
  montoNominal?: NumeroDeApi
  valorCuota?: NumeroDeApi
  montoMetaOperativaPendiente?: NumeroDeApi
  montoCuotaPendienteEnFecha?: NumeroDeApi
  saldoPendiente?: NumeroDeApi
  saldoTotal?: NumeroDeApi
  recaudadoDelDia?: NumeroDeApi
  recaudadoHoy?: NumeroDeApi
  recaudado?: NumeroDeApi

  diasMora?: number | null
  diasMoraEnFecha?: number | null
  diasMoraOperativos?: number | null
  cuotasVencidas?: number | null
  cuotasVencidasEnFecha?: number | null
  montoMoraAcumulada?: NumeroDeApi
  montoVencidoAcumulado?: NumeroDeApi
  montoVencidoAcumuladoEnFecha?: NumeroDeApi
  saldoVencidoAcumulado?: NumeroDeApi
  enMoraEnFechaOperativa?: boolean | null

  nivelRiesgo?: string | null
  nivelRiesgoCredito?: string | null
  nivelRiesgoObligacion?: string | null
  nivelRiesgoBackend?: string | null
  riesgoCredito?: string | null
  riesgoOperativo?: string | null
  riesgoOperativoEnFecha?: string | null
}
