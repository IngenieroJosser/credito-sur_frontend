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

import type { CuotaOperativa, EstadoVisita } from '@/lib/types/cobranza'
import type { EstadoPrestamo, FrecuenciaPago } from '@/types/enums'

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
  /** El enum del esquema, igual que `frecuenciaPago`: el backend manda `p.estado`. */
  estado?: EstadoPrestamo
  estadoPrestamo?: string
  estadoGestion?: string
  estadoVisita?: string
  estadoAprobacion?: string
  /**
   * El enum, no texto suelto: el backend manda `p.frecuenciaPago`, que es la columna
   * `frecuenciaPago FrecuenciaPago` del esquema (no nulable), y `Prestamo` del dominio
   * tambien lo declara como enum. `string` a secas era lo que no dejaba pasar el
   * `{...o}` de `mapObligacionToVisitaRuta`.
   */
  frecuenciaPago?: FrecuenciaPago
  tipoPrestamo?: string
  tipo?: string

  // Los montos del prestamo anidado son `number`, no `NumeroDeApi`, y tambien es una
  // medida: este payload los pasa por `Number(...)` antes de mandarlos
  // (`saldoPendiente: Number(p.saldoPendiente)` routes.service.ts:867,
  // `montoNominal: Number(...)` :822 que es de donde sale `montoCuotaNormal` en :884,
  // `montoCuota: Number(...)` :819). El `Decimal` como texto, que es lo que justifica
  // `NumeroDeApi`, no llega hasta aqui: el backend ya lo convirtio.
  saldoPendiente?: number
  saldoTotal?: number | null
  // `cantidadCuotas Int` en el esquema (:301), no nulable.
  cantidadCuotas?: number
  montoMetaOperativaPendiente?: number | null

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
  montoCuota?: number
  montoCuotaNormal?: number | null
  // nombrados por el compilador al tipar SupervisorCobroView
  valorCuota?: number
  notasVisita?: string
  descripcionArticulo?: string
  frecuencia?: string
  frecuenciaRuta?: string
  esProvisional?: boolean | null
  // Los cuatro los agrega el backend por CREDITO en la respuesta de la jornada
  // (routes.service.ts los pone en `PrestamoDeVisita`), y los lee el mapeador de visitas.
  recaudadoDelDia?: NumeroDeApi
  recaudadoHoy?: NumeroDeApi
  // Sin `| null`: `PrestamoCamposLeidos` lo declara `number | undefined` y el spread de
  // este prestamo va a parar ahi. El backend lo calcula, asi que siempre manda un numero.
  diasMora?: number
  fechaEfectiva?: FechaDeApi
  // Los tres los agrega el backend al revisar la operacion, y los lee el mapeo del
  // listado de rutas. Los nombro el compilador al tipar ese mapeo.
  estadoEfectoProvisional?: string | null
  etiquetaRevision?: string | null
  esRevertido?: boolean | null

  // Aqui NO va `cliente`, y es una medida: el `prestamo` que anida una obligacion de la
  // jornada no lo trae. El backend lo arma con id, tipo, numeroPrestamo, saldoPendiente,
  // frecuenciaPago, cantidadCuotas, estado, articulo y proximaCuota, y nada mas
  // (routes.service.ts:862-875); el cliente viaja como HERMANO, en la raiz de la
  // obligacion. Declararlo obligaba a casar `ClienteDeObligacion` con el `Cliente` del
  // dominio, que pide `estado`, `creadoEn` y `actualizadoEn` que este payload no manda:
  // el unico motivo del cast en el `{...o}` de `mapObligacionToVisitaRuta`.
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
  // Los cuatro que siguen van SIN `| null`, y es una medida contra el esquema, no una
  // suposicion: `estadoAprobacion EstadoAprobacion @default(PENDIENTE)` (schema:669),
  // `esProvisional Boolean @default(false)` (schema:671) y
  // `frecuenciaPago FrecuenciaPago` (schema:300) son columnas NO nulables, y
  // `esRevertido` no es columna: lo calcula el backend con un `Boolean(...)`
  // (ruta-operational-rules.ts:194). Ninguno puede llegar como `null`.
  //
  // Importa porque `mapObligacionToVisitaRuta` hace `{...o}` sobre una `VisitaRuta`, que
  // los declara `string`/`boolean`: el `| null` de mas, puesto "por si acaso", era lo
  // unico que obligaba a castear ahi.
  estadoAprobacion?: string
  estadoEfectoProvisional?: string | null
  etiquetaRevision?: string | null
  esProvisional?: boolean
  esRevertido?: boolean

  frecuenciaPago?: string
  /**
   * La union estrecha es la medida, no una precaucion.
   *
   * `prioridad` NO existe en `schema.prisma` y en todo el backend aparece una sola
   * vez, en una alerta de cliente, sin relacion con visitas ni asignaciones (ver el
   * comentario de `VisitaRuta.prioridad` en lib/types/cobranza.ts). O sea que aqui
   * nunca llega y el `o.prioridad || 'media'` de los builders siempre resuelve por la
   * derecha. Se declaro `string | number` por si acaso, y eso obligaba a castear al
   * asignarla a `VisitaRuta.prioridad`, que si es una union cerrada.
   */
  prioridad?: 'alta' | 'media' | 'baja' | null
  ordenVisita?: number | null
  /**
   * La hora sugerida de la visita, como texto ya formateado ('08:00 AM').
   *
   * La nombro el compilador al tipar SupervisorCobroView, que la lee con un
   * `|| '08:00 AM'` de respaldo.
   */
  horaSugerida?: string | null
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

  // Riesgo: siete nombres para un dato que llega con uno.
  //
  // Medido sobre el backend entero: de estos siete campos el UNICO que existe en el
  // codigo del servidor es `nivelRiesgo`, y solo anidado en el cliente
  // (`nivelRiesgo: cliente.nivelRiesgo`, routes.service.ts:860). `nivelRiesgoCredito`,
  // `nivelRiesgoObligacion`, `nivelRiesgoBackend`, `riesgoCredito`, `riesgoOperativo` y
  // `riesgoOperativoEnFecha` no aparecen NI UNA VEZ en `src/`. La cascada que los lee
  // resuelve siempre por el ultimo eslabon.
  //
  // Se quedan declarados porque el codigo los lee, y borrar las cascadas es otro
  // trabajo en varias pantallas. Pero van sin `| null`: lo medido es que no llegan, y
  // el `| null` obligaba a castear al asignarlos a `VisitaRuta`.
  nivelRiesgo?: string
  nivelRiesgoCredito?: string
  nivelRiesgoObligacion?: string
  nivelRiesgoBackend?: string
  riesgoCredito?: string
  riesgoOperativo?: string
  riesgoOperativoEnFecha?: string
}

/**
 * El evento de tiempo real que hace recargar la jornada.
 *
 * Cada campo aparece DOS veces —en la raiz y dentro de `metadata`— porque los emisores no
 * coinciden: unos mandan `{prestamoId}` y otros `{metadata: {prestamoId}}`, y los handlers
 * los leen en cascada. Eso es lo que el `any` escondia en las dos pantallas que lo reciben.
 *
 * Vive aqui y no en una pantalla porque `VistaCobrador` y `SupervisorCobroView` tenian el
 * mismo handler con el mismo `payload?: any`. Una sola copia.
 *
 * `estadoVisita` va como la union cerrada porque se escribe DIRECTO en `VisitaRuta.estado`.
 * Conviene decirlo: nada valida este payload en ejecucion —viene de un socket— asi que si
 * el backend mandara otro texto, la pantalla guardaria un estado que no sabe pintar.
 */
export type CamposDelEventoDeJornada = {
  rutaId?: string
  clienteId?: string
  prestamoId?: string
  accion?: string
  estadoVisita?: EstadoVisita
  notas?: string
  notasVisita?: string
  // Los que siguen se sacaron de los emisores del backend, uno por uno:
  // payments.service.ts:1613 (pago registrado), routes.service.ts:5804 (jornada
  // cerrada/regularizada) y loans.service.ts:5016 (reprogramacion solicitada). El
  // gateway le suma `timestamp` a todos (notificaciones.gateway.ts:476-540).
  //
  // `fechaClave` NO esta: se busco en todo el backend y no se emite en ningun sitio.
  // El historial de ruta lo leia en una cadena junto a `fechaOperativaRuta` y ese
  // eslabon no resolvia nunca.
  pagoId?: string
  cuotaId?: string
  jornadaId?: string
  aprobacionId?: string
  origenGestion?: string
  fechaOperativa?: string
  fechaOperativaRuta?: string
  timestamp?: string
}

export type EventoDeJornada = CamposDelEventoDeJornada & {
  metadata?: CamposDelEventoDeJornada
}

/**
 * El cliente de una obligacion, siempre como OBJETO.
 *
 * `ObligacionDeJornada.cliente` puede ser el objeto o un texto con solo el nombre, segun el
 * endpoint. Cinco sitios lo leian como objeto a secas —`cliente.nombres`, `cliente.id`—, y
 * con el texto eso valia `undefined`: el cliente salia sin nombre y sin id. Este
 * normalizador hace la comprobacion una vez, en vez de repetir el `typeof` en cada sitio.
 */
export const clienteComoObjeto = (
  cliente: ClienteDeObligacion | string | null | undefined,
): ClienteDeObligacion =>
  typeof cliente === 'object' && cliente ? cliente : {}
