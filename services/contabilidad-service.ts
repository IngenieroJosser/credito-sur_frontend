import { estadoDeError, mensajeDeError } from '@/lib/mensaje-de-error'
import { esApiError } from '@/lib/api/api'
import { logger } from '@/lib/logger'
import { apiRequest } from '@/lib/api/api'
import { syncService } from '@/lib/offline/syncService'
import { esErrorDeRed } from '@/lib/offline/conRespaldoOffline'
import { offlineStore } from '@/lib/offline/offlineDb'
import { toBogotaDateTimeOffsetIso } from '@/lib/rutas-core'

const generarIdempotencyKey = (prefix: string) => {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12)
  return `${prefix}-${Date.now()}-${random}`
}

// Interfaces
export interface Caja {
  id: string
  codigo: string
  nombre: string
  tipo: 'PRINCIPAL' | 'RUTA'
  rutaId?: string
  rutaNombre?: string
  responsable: string
  responsableId: string
  saldo: number
  /**
   * Alias del saldo que el codigo acepta y el backend NO manda. Se
   * comprobo endpoint por endpoint: la respuesta expone `saldo`, y
   * `saldoActual` es solo el nombre de la columna en Prisma, que nunca
   * sale tal cual. La cadena `saldoActual ?? saldo ?? ...` resuelve por
   * el segundo eslabon, asi que no estorban; se declaran para que se
   * sepa que de ahi no viene el dato.
   */
  saldoActual?: number
  saldoCaja?: number
  balance?: number
  monto?: number
  total?: number
  saldoMinimo?: number
  saldoMaximo?: number
  estado: 'ABIERTA' | 'CERRADA'
  transacciones?: number
  ultimaActualizacion: string
  /**
   * Rutas que supervisa esta caja. Solo viene en las cajas de tipo RUTA
   * sin ruta propia, es decir, las de un supervisor con varias a cargo.
   */
  rutasSupervisadas?: Array<{ id: string; nombre: string; codigo: string }>
}

export interface Transaccion {
  id: string
  numero: string
  fecha: string
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA'
  monto: number
  descripcion: string
  caja: string
  responsable: string
  /**
   * Siempre 'APROBADO'.
   *
   * No es un campo de la base: `model Transaccion` no tiene columna `estado`, solo
   * `estadoSincronizacion`. El backend lo adjunta como literal en el UNICO sitio donde
   * arma una transaccion para la respuesta (`accounting.service.ts:102`,
   * `estado: 'APROBADO' as const`). Estaba declarado `string`, y eso obligaba a
   * castear al mapearlo a la union de la pantalla contable.
   *
   * Consecuencia a tener en cuenta: cualquier filtro o etiqueta de "PENDIENTE" o
   * "RECHAZADO" sobre transacciones no puede coincidir con nada.
   */
  estado: 'APROBADO'
  categoria?: string
  origen?: 'EMPRESA' | 'COBRADOR'
  rutaId?: string
  cajaId: string
  cajaOrigenId?: string
  cajaSaldo?: number
  /** Que origino la transaccion: CUOTA_INICIAL, ABONO_DEUDA, CIERRE_RUTA… */
  tipoReferencia?: string
  /** Id de eso que la origino. */
  referenciaId?: string
  direction?: 'IN' | 'OUT'
  impactoCaja?: number
  impactoResultado?: number
  accountCode?: string
  accountName?: string
}

export interface MovimientoLedger {
  id: string
  fecha: string
  tipo: string
  referenciaId: string
  descripcion?: string
  creadoPorId: string
  totalDebito: number
  totalCredito: number
  direction?: 'IN' | 'OUT'
  impactoCaja?: number
  impactoResultado?: number
  accountCode?: string | null
  accountName?: string | null
  origenGestion?: string | null
  fechaOperativaRuta?: string | null
  caja?: string | null
  cajaId?: string | null
  cuadrado: boolean
  lineas: Array<{
    id: string
    accountCode: string
    accountName: string
    debitAmount: number
    creditAmount: number
    cajaId?: string
    caja?: string | null
    direction?: 'IN' | 'OUT' | null
  }>
}

export interface ResumenFinanciero {
  ingresosHoy: number
  entradasCajaHoy?: number
  ingresosDevengadosHoy?: number
  egresosHoy: number
  costosVentasHoy?: number
  ingresosArticulosHoy?: number
  margenArticulosHoy?: number
  interesHoy?: number
  moraHoy?: number
  otrosIngresosHoy?: number
  cobranzaHoy?: number
  gananciaNeta: number
  utilidadReal?: number
  capitalEnCalle: number
  saldoCajas: number
  cajasAbiertasCount: number
  rutasTotales: number
  rutasAbiertas: number
  rutasPendientesConsolidacion: number
  consolidacionesHoy: number
  porcentajeCierre: number
  fecha: string
  porcentajeIngresosVsAyer?: number
  porcentajeEgresosVsAyer?: number
  esIngresoPositivo?: boolean
  esEgresoPositivo?: boolean

  /**
   * Cartera, provision y utilidad del Ledger.
   *
   * El backend los manda (comprobado uno por uno en `AccountingService`, lineas
   * 3315-3360) y este tipo no los declaraba, asi que la pantalla contable los leia
   * con `as any`. Se agregan como opcionales porque no todas las respuestas del
   * resumen los traen.
   */
  utilidadOperativa?: number
  cuotaInicialHoy?: number
  deudaCobradorHoy?: number
  porcentajeCuotaInicialVsAyer?: number
  saldoCarteraEnMora?: number
  saldoCarteraIncumplida?: number
  saldoCarteraPerdida?: number
  provisionCarteraEnMora?: number
  provisionCarteraIncumplida?: number
  provisionCarteraPerdida?: number
  provisionCarteraTotal?: number
  /**
   * La provision causada DENTRO del periodo consultado, no el acumulado.
   * `provisionCarteraTotal` es el saldo de toda la cartera; esta es la del rango
   * (`accounting.service.ts:3328`, y el comentario de la linea 3327 lo separa
   * explicitamente).
   */
  provisionCarteraPeriodo?: number
}

export interface Gasto {
  id: string
  numero: string
  fecha: string
  tipo: string
  monto: number
  descripcion: string
  cobradorId: string
  cobrador: string
  ruta: string
  caja: string
  categoriaId?: string | null
  categoria: string | null
  estado: string
}

export interface SaldoDisponibleRuta {
  rutaId: string
  cajaId?: string
  fecha: string
  saldoDisponible: number
  recaudoDelDia: number
  cobranzaDelDia: number
  gastosDelDia: number
  baseEfectivo: number
  desembolsos: number
  netoPeriodo: number
  saldoCaja?: number
  /** Gastos aun sin aprobar. El backend los manda; el tipo no los declaraba. */
  egresosProvisionales?: number
  /** Todas las salidas reales de caja del periodo. */
  totalEgresosCaja?: number
  /** Recaudo desglosado por referencia; solo lo trae el saldo por ruta. */
  recaudosPorReferencia?: Record<string, number>
  mensaje?: string
  fechaInicio?: string
  fechaFin?: string
}

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// =====================
// CAJAS
// =====================

export async function getCajas(): Promise<Caja[]> {
  try {
    return await apiRequest<Caja[]>('GET', '/accounting/cajas')
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      logger.log('[Offline Mode] Cargando cajas desde cache local...')
      const cached = await offlineStore.getAll<Caja>('cajas')
      if (cached.length > 0) return cached
    }
    const statusCode = estadoDeError(error)
    if (statusCode === 401 || statusCode === 403) {
      logger.log('[Contabilidad] getCajas omitido por permisos.')
      return []
    }

    const errorDetails = {
      statusCode: estadoDeError(error),
      message: mensajeDeError(error, ''),
      error: esApiError(error) ? error.error : undefined,
    }
    try {
      console.error(`Error fetching cajas: ${JSON.stringify(errorDetails)}`)
    } catch {
      console.error('Error fetching cajas')
    }
    return []
  }
}

export async function getCajaById(id: string): Promise<Caja | null> {
  try {
    return await apiRequest<Caja>('GET', `/accounting/cajas/${id}`)
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      logger.log('[Offline Mode] Buscando caja ID ' + id + ' en cache local...')
      const cached = await offlineStore.getById<Caja>('cajas', id)
      if (cached) return cached
    }
    const statusCode = estadoDeError(error)
    if (statusCode === 401 || statusCode === 403) {
      logger.log('[Contabilidad] getCajaById omitido por permisos.')
      return null
    }

    const errorDetails = {
      statusCode: estadoDeError(error),
      message: mensajeDeError(error, ''),
      error: esApiError(error) ? error.error : undefined,
    }
    try {
      console.error(`Error fetching caja: ${JSON.stringify(errorDetails)}`)
    } catch {
      console.error('Error fetching caja')
    }
    return null
  }
}

export async function createCaja(data: {
  nombre: string
  tipo: 'PRINCIPAL' | 'RUTA'
  rutaId?: string
  responsableId: string
  saldoInicial?: number
}): Promise<Caja | null> {
  try {
    return await apiRequest<Caja>('POST', '/accounting/cajas', data)
  } catch (error) {
    if (esErrorDeRed(error)) {
      logger.log('[Offline Mode] Guardando creacion de caja en cola...')
      await syncService.enqueueOperation(
        'caja_crear',
        '/accounting/cajas',
        'POST',
        data,
        `Crear caja: ${data.nombre}`,
      )
      return {
        ...data,
        id: `temp-caja-${Date.now()}`,
        estado: 'ABIERTA',
        saldo: data.saldoInicial || 0,
        ultimaActualizacion: toBogotaDateTimeOffsetIso(new Date()),
        responsable: 'Local',
        responsableId: data.responsableId,
        codigo: 'TEMP',
      }
    }
    console.error('Error creating caja:', error)
    throw error
  }
}

export async function updateCaja(
  id: string,
  data: {
    nombre?: string
    responsableId?: string
    activa?: boolean
  },
): Promise<Caja | null> {
  try {
    return await apiRequest<Caja>('PATCH', `/accounting/cajas/${id}`, data)
  } catch (error) {
    if (esErrorDeRed(error)) {
      logger.log('[Offline Mode] Guardando actualizacion de caja en cola...')
      await syncService.enqueueOperation(
        'caja_actualizar',
        `/accounting/cajas/${id}`,
        'PATCH',
        data,
        `Actualizar caja ID: ${id}`,
      )
      // El tipo ya era `| null` y las dos pantallas que llaman descartan el
      // resultado: `{ id, ...data }` no era una Caja, solo lo parecia.
      return null
    }
    throw error
  }
}

export interface ConsolidarCajaResponse {
  origen: string
  destino: string
  monto: number
  numeroRef: string
  transacciones: string[]
  idempotente?: boolean
}

export interface ConsolidarCajaOfflineResponse {
  esOffline: boolean
  idempotente?: boolean
}

export async function consolidarCaja(
  cajaId: string,
  monto?: number,
  idempotencyKey?: string,
): Promise<ConsolidarCajaResponse | ConsolidarCajaOfflineResponse> {
  const key = idempotencyKey || generarIdempotencyKey(`RECOLECCION-${cajaId}`)

  try {
    return await apiRequest('POST', `/accounting/cajas/${cajaId}/consolidar`, {
      monto,
      idempotencyKey: key,
    })
  } catch (error) {
    if (esErrorDeRed(error)) {
      logger.log('[Offline Mode] Guardando consolidacion de caja en cola...')
      await syncService.enqueueOperation(
        'caja_consolidar',
        `/accounting/cajas/${cajaId}/consolidar`,
        'POST',
        { monto, idempotencyKey: key },
        `Consolidar caja ID: ${cajaId}`,
      )
      return { esOffline: true }
    }
    console.error('Error consolidating caja:', error)
    throw error
  }
}

export async function getDesglosePagosCaja(
  cajaId: string,
  fecha?: string,
): Promise<{
  efectivo: number
  transferencia: number
  total: number
  cajaNombre?: string
  fecha?: string | null
}> {
  try {
    const params = fecha ? `?fecha=${fecha}` : ''
    return await apiRequest('GET', `/accounting/cajas/${cajaId}/desglose-pagos${params}`)
  } catch (error) {
    console.error('Error fetching desglose pagos caja:', error)
    return { efectivo: 0, transferencia: 0, total: 0 }
  }
}

// =====================
// TRANSACCIONES
// =====================

export async function getTransacciones(filtros?: {
  cajaId?: string
  tipo?: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA'
  fechaInicio?: string
  fechaFin?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<Transaccion>> {
  try {
    const params = new URLSearchParams()
    if (filtros?.cajaId) params.append('cajaId', filtros.cajaId)
    if (filtros?.tipo) params.append('tipo', filtros.tipo)
    if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio)
    if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin)
    if (filtros?.page) params.append('page', filtros.page.toString())
    if (filtros?.limit) params.append('limit', filtros.limit.toString())

    const queryString = params.toString()
    const url = `/accounting/transacciones${queryString ? `?${queryString}` : ''}`

    return await apiRequest<PaginatedResponse<Transaccion>>('GET', url)
  } catch (error) {
    console.error('Error fetching transacciones:', {
      urlRequested: (() => {
        try {
          const params = new URLSearchParams()
          if (filtros?.cajaId) params.append('cajaId', filtros.cajaId)
          if (filtros?.tipo) params.append('tipo', filtros.tipo)
          if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio)
          if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin)
          if (filtros?.page) params.append('page', filtros.page.toString())
          if (filtros?.limit) params.append('limit', filtros.limit.toString())
          const qs = params.toString()
          return `/accounting/transacciones${qs ? `?${qs}` : ''}`
        } catch {
          return '/accounting/transacciones'
        }
      })(),
      statusCode: estadoDeError(error),
      message: mensajeDeError(error, ''),
      error: esApiError(error) ? error.error : undefined,
      rawType: typeof error,
      rawKeys: error && typeof error === 'object' ? Object.keys(error) : null,
    })
    return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } }
  }
}

export async function getMovimientosLedger(filtros?: {
  tipo?: string
  cajaId?: string
  accountCode?: string
  accountPrefix?: string
  fechaInicio?: string
  fechaFin?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<MovimientoLedger>> {
  try {
    const params = new URLSearchParams()
    if (filtros?.tipo) params.append('tipo', filtros.tipo)
    if (filtros?.cajaId) params.append('cajaId', filtros.cajaId)
    if (filtros?.accountCode) params.append('accountCode', filtros.accountCode)
    if (filtros?.accountPrefix) params.append('accountPrefix', filtros.accountPrefix)
    if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio)
    if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin)
    if (filtros?.page) params.append('page', filtros.page.toString())
    if (filtros?.limit) params.append('limit', filtros.limit.toString())

    const queryString = params.toString()
    return await apiRequest<PaginatedResponse<MovimientoLedger>>(
      'GET',
      `/accounting/ledger/movimientos${queryString ? `?${queryString}` : ''}`,
    )
  } catch (error) {
    console.error('Error fetching ledger movimientos:', error)
    return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } }
  }
}

export async function createTransaccion(data: {
  cajaId: string
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA'
  monto: number
  descripcion: string
  tipoReferencia?: string
  referenciaId?: string
  cajaOrigenId?: string
  accountCode?: string
  idempotencyKey?: string
}): Promise<Transaccion | null> {
  const payload = {
    ...data,
    idempotencyKey: data.idempotencyKey || generarIdempotencyKey('trx'),
  }

  try {
    return await apiRequest<Transaccion>('POST', '/accounting/transacciones', payload)
  } catch (error) {
    if (esErrorDeRed(error)) {
      logger.log('[Offline Mode] Guardando transacción en cola...')
      await syncService.enqueueOperation(
        'transaccion_crear', // Tipo más descriptivo
        '/accounting/transacciones',
        'POST',
        payload,
        `Transacción: ${payload.descripcion} ($${payload.monto})`,
      )
      // Las dos pantallas que llaman recargan desde el servidor y descartan el
      // resultado, asi que no se inventa una transaccion (le faltaba
      // `responsable` y traia un `numero` que no existe en el libro).
      return null
    }
    console.error('Error creating transaccion:', error)
    throw error
  }
}

export async function getTransaccionById(id: string): Promise<Transaccion | null> {
  try {
    return await apiRequest<Transaccion>('GET', `/accounting/transacciones/${id}`)
  } catch (error) {
    console.error('Error fetching transaccion by id:', error)
    return null
  }
}

// =====================
// RESUMEN FINANCIERO
// =====================

export async function getResumenFinanciero(
  fechaInicio?: string,
  fechaFin?: string,
): Promise<ResumenFinanciero | null> {
  try {
    const params = new URLSearchParams()
    if (fechaInicio) params.append('fechaInicio', fechaInicio)
    if (fechaFin) params.append('fechaFin', fechaFin)

    const queryString = params.toString()
    const url = `/accounting/resumen${queryString ? `?${queryString}` : ''}`

    return await apiRequest<ResumenFinanciero>('GET', url)
  } catch (error) {
    const statusCode = estadoDeError(error)
    if (statusCode === 401 || statusCode === 403) {
      logger.log('[Contabilidad] getResumenFinanciero omitido por permisos.')
      return null
    }

    const details = {
      statusCode: estadoDeError(error),
      message: mensajeDeError(error, ''),
      error: esApiError(error) ? error.error : undefined,
    }
    try {
      console.error(`Error fetching resumen financiero: ${JSON.stringify(details)}`)
    } catch {
      console.error('Error fetching resumen financiero')
    }
    return null
  }
}

// =====================
// GASTOS
// =====================

export async function getGastos(filtros?: {
  rutaId?: string
  estado?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<Gasto>> {
  try {
    const params = new URLSearchParams()
    if (filtros?.rutaId) params.append('rutaId', filtros.rutaId)
    if (filtros?.estado) params.append('estado', filtros.estado)
    if (filtros?.page) params.append('page', filtros.page.toString())
    if (filtros?.limit) params.append('limit', filtros.limit.toString())

    const queryString = params.toString()
    const url = `/accounting/gastos${queryString ? `?${queryString}` : ''}`

    return await apiRequest<PaginatedResponse<Gasto>>('GET', url)
  } catch (error) {
    console.error('Error fetching gastos:', error)
    return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } }
  }
}

// =====================
// CIERRES
// =====================

/**
 * Una fila de `GET /accounting/cierres`.
 *
 * Espejo de `CierreHistorialItem` en `accounting.service.ts` del backend. Casi todo es
 * opcional porque la lista UNE cuatro formas y se distinguen por `tipo`:
 *
 *  - `ARQUEO` salido de `Transaccion` (el detalle viene codificado en `referenciaId`).
 *    Es el unico que NO trae `cajaTipo`.
 *  - `CIERRE_RUTA`: la meta va en `saldoSistema` y el recaudo en `saldoReal`.
 *  - `CONSOLIDACION`.
 *  - `ARQUEO` salido de la tabla `Arqueo`, el mas rico: trae `cajaOrigen`/`cajaDestino`,
 *    que es lo que pinta el modal de detalle.
 *
 * La forma no se adivino: se leyeron los dos `map` del backend y se anoto alli el
 * resultado para que tsc la validara contra Prisma.
 */
export interface CierreHistorialItem {
  id: string
  fecha: string
  caja: string
  responsable: string | null
  diferencia: number
  estado: string
  descripcion: string | null
  tipo: 'ARQUEO' | 'CIERRE_RUTA' | 'CONSOLIDACION'
  cajaId: string
  cajaTipo?: string
  saldoSistema?: number
  saldoReal?: number
  referenciaId?: string | null
  /** Solo `CIERRE_RUTA`. */
  deudaFisica?: number
  efectividad?: number
  clientesFaltantes?: number
  /** Solo el `ARQUEO` de la tabla `Arqueo`. */
  fechaOperativa?: string
  creadoPor?: string | null
  recibidoPor?: string | null
  saldoEsperado?: number
  efectivoContado?: number
  montoTransferido?: number
  tipoDiferencia?: string | null
  numeroComprobanteTraslado?: string | null
  journalEntryId?: string | null
  rutaId?: string | null
  cajaOrigen?: {
    id: string
    nombre: string
    saldoAnterior: number
    salida: number
    saldoNuevo: number
  }
  cajaDestino?: {
    nombre: string
    ingreso: number
    saldoNuevo: number | null
  }
}

export async function getHistorialCierres(): Promise<CierreHistorialItem[]> {
  try {
    return await apiRequest<CierreHistorialItem[]>('GET', '/accounting/cierres')
  } catch (error) {
    console.error('Error fetching cierres:', error)
    return []
  }
}

export async function getHistorialCierresFiltrado(filtros?: {
  tipo?: 'ARQUEO' | 'CONSOLIDACION' | 'TODOS'
  cajaId?: string
  soloRutas?: boolean
  estado?: 'CUADRADA' | 'DESCUADRADA' | 'TODOS'
  fechaInicio?: string
  fechaFin?: string
}): Promise<any[]> {
  try {
    const params = new URLSearchParams()
    if (filtros?.tipo && filtros.tipo !== 'TODOS') params.append('tipo', filtros.tipo)
    if (filtros?.cajaId) params.append('cajaId', filtros.cajaId)
    if (typeof filtros?.soloRutas !== 'undefined')
      params.append('soloRutas', filtros.soloRutas ? '1' : '0')
    if (filtros?.estado && filtros.estado !== 'TODOS') params.append('estado', filtros.estado)
    if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio)
    if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin)
    const qs = params.toString()
    return await apiRequest<CierreHistorialItem[]>(
      'GET',
      `/accounting/cierres${qs ? `?${qs}` : ''}`,
    )
  } catch (error) {
    console.error('Error fetching cierres filtrados:', error)
    return []
  }
}

/**
 * El arqueo de una caja: las dos respuestas del backend, que NO son iguales.
 *
 * Ojo con `responsable`, que tiene tres formas distintas segun de donde venga, y
 * las tres circulan por esta pantalla:
 *
 *   `/cajas/:id/arqueo/preview`  -> { id, nombre }   (nombre en SINGULAR)
 *   `/cajas/arqueos/:id`         -> el usuario de Prisma, con nombres y apellidos
 *   `/accounting/cierres`        -> un string ya armado
 *
 * `getNombreUsuario` de la pantalla de cierre de caja cubre la segunda y la
 * tercera. La primera no le llega nunca (de la vista previa solo se leen
 * `saldoEsperado`, `arqueoExistente` y `cajaPrincipal.nombre`), pero si algun dia
 * se le pasa, devolveria un guion en vez del nombre.
 */
export interface ArqueoPreview {
  cajaId: string
  cajaNombre: string
  rutaId: string | null
  rutaNombre: string | null
  fechaOperativa: string
  /** Forma corta, con `nombre` en singular. */
  responsable: { id: string | null; nombre: string } | null
  cajaPrincipal: { id: string; nombre: string; saldoActual: number }
  /** El saldo en libros de la caja. De aqui sale el faltante/sobrante del arqueo. */
  saldoEsperado: number
  desglose: {
    baseInicial: number
    saldoActualSistema: number
    saldoEsperadoCalculado: number
    diferenciaSistema: number
  }
  jornada: { id: string; estado: string } | null
  arqueoExistente: boolean
}

/** Un usuario tal como lo incluye Prisma en el detalle del arqueo. */
interface UsuarioDeArqueo {
  id?: string
  nombres?: string
  apellidos?: string
}

export interface ArqueoDetalle {
  id: string
  fechaOperativa: string
  creadoEn: string
  numeroComprobanteTraslado: string | null
  saldoEsperado: number
  efectivoContado: number
  diferencia: number
  tipoDiferencia: string
  montoTransferido: number
  journalEntryId: string | null
  observaciones: string | null
  cajaOrigen: {
    id: string
    nombre: string
    saldoAnterior: number
    salida: number
    saldoNuevo: number
  }
  cajaDestino: { nombre: string; ingreso: number; saldoNuevo: number | null } | null
  /** Forma larga: el usuario de Prisma. */
  responsable: UsuarioDeArqueo | null
  creadoPor: UsuarioDeArqueo | null
  recibidoPor: UsuarioDeArqueo | null
}

export async function getArqueoPreview(
  cajaId: string,
  fechaOperativa?: string,
): Promise<ArqueoPreview> {
  try {
    const params = fechaOperativa ? `?fechaOperativa=${fechaOperativa}` : ''
    logger.log('[getArqueoPreview] Requesting:', `/cajas/${cajaId}/arqueo/preview${params}`)
    return await apiRequest<ArqueoPreview>('GET', `/cajas/${cajaId}/arqueo/preview${params}`)
  } catch (error) {
    // Se registra el error entero: desglosarlo en campos sueltos obligaba a
    // tipar el catch como `any`, y el JSON.stringify de abajo ya volcaba lo
    // mismo. Por logger y no por console, como el resto del sistema.
    logger.error('[getArqueoPreview] Fallo la peticion', error)
    throw error
  }
}

export async function getArqueoById(arqueoId: string): Promise<ArqueoDetalle> {
  try {
    return await apiRequest<ArqueoDetalle>('GET', `/cajas/arqueos/${arqueoId}`)
  } catch (error) {
    // Se registra el error entero: desglosarlo en campos sueltos obligaba a
    // tipar el catch como `any`, y el JSON.stringify de abajo ya volcaba lo
    // mismo. Por logger y no por console, como el resto del sistema.
    logger.error('[getArqueoById] Fallo la peticion', error)
    throw error
  }
}

export async function confirmarArqueo(
  cajaId: string,
  data: {
    fechaOperativa: string
    efectivoContado: number
    recibidoPorId?: string
    denominaciones?: any
    observaciones?: string
  },
): Promise<unknown> {
  try {
    return await apiRequest<any>('POST', `/cajas/${cajaId}/arqueos`, data)
  } catch (error) {
    if (esErrorDeRed(error)) {
      logger.log('[Offline Mode] Guardando arqueo en cola...')
      await syncService.enqueueOperation(
        'arqueo_registrar',
        `/cajas/${cajaId}/arqueos`,
        'POST',
        data,
        `Arqueo de Caja (Offline)`,
      )
      return { id: `temp-arq-${Date.now()}`, esOffline: true }
    }
    console.error('Error registrando arqueo:', error)
    throw error
  }
}

export async function registrarArqueo(
  cajaId: string,
  data: {
    efectivoReal: number
    saldoSistema: number
    diferencia: number
    observaciones?: string
  },
): Promise<unknown> {
  try {
    return await apiRequest<any>('POST', `/accounting/cajas/${cajaId}/arqueos`, data)
  } catch (error) {
    if (esErrorDeRed(error)) {
      logger.log('[Offline Mode] Guardando arqueo en cola...')
      await syncService.enqueueOperation(
        'arqueo_registrar',
        `/accounting/cajas/${cajaId}/arqueos`,
        'POST',
        data,
        `Arqueo de Caja (Offline)`,
      )
      return { id: `temp-arq-${Date.now()}`, esOffline: true }
    }
    console.error('Error registrando arqueo:', error)
    throw error
  }
}

export async function obtenerSaldoDisponibleRuta(
  rutaId: string,
  fecha?: string,
  fechaInicio?: string,
  fechaFin?: string,
): Promise<SaldoDisponibleRuta> {
  const params = new URLSearchParams()
  if (fecha) params.append('fecha', fecha)
  if (fechaInicio) params.append('fechaInicio', fechaInicio)
  if (fechaFin) params.append('fechaFin', fechaFin)

  const qs = params.toString()
  return apiRequest<SaldoDisponibleRuta>(
    'GET',
    `/accounting/rutas/${rutaId}/saldo-disponible${qs ? `?${qs}` : ''}`,
  )
}

export async function obtenerSaldoCajaSupervisor(
  supervisorId: string,
  fecha?: string,
  fechaInicio?: string,
  fechaFin?: string,
): Promise<SaldoDisponibleRuta> {
  const params = new URLSearchParams()
  if (fecha) params.append('fecha', fecha)
  if (fechaInicio) params.append('fechaInicio', fechaInicio)
  if (fechaFin) params.append('fechaFin', fechaFin)

  const qs = params.toString()
  return apiRequest<SaldoDisponibleRuta>(
    'GET',
    `/accounting/supervisores/${supervisorId}/saldo-disponible${qs ? `?${qs}` : ''}`,
  )
}

export async function getRutaCierreHoy(rutaId: string): Promise<{
  rutaId: string
  cerradaHoy: boolean
  cierreId: string | null
  fechaCierre: string | null
}> {
  return apiRequest('GET', `/accounting/rutas/${rutaId}/cierre-hoy`)
}

export async function registrarGasto(data: {
  descripcion: string
  valor: number
  comprobante?: File | null
  comprobanteUrl?: string
  fotoRecibo?: string
  rutaId: string
  cobradorId: string
  categoriaId?: string
  esPersonal?: boolean
  idempotencyKey?: string
}): Promise<unknown> {
  const idempotencyKey = data.idempotencyKey || generarIdempotencyKey('gasto')

  // El mismo payload lo usan el envio y la cola offline. Estaba escrito dos veces,
  // asi que agregar un campo obligaba a acordarse del segundo sitio: si se olvidaba,
  // el gasto se guardaba completo en linea y cojo al sincronizar. Y el `: any` que
  // llevaba no describia nada, porque `data` ya viene tipado: quitarlo deja que el
  // compilador vea la forma de verdad.
  const payload = {
    descripcion: data.descripcion,
    valor: data.valor,
    rutaId: data.rutaId,
    cobradorId: data.cobradorId,
    comprobanteUrl: data.comprobanteUrl,
    fotoRecibo: data.fotoRecibo,
    esPersonal: data.esPersonal,
    idempotencyKey,
    ...(data.categoriaId ? { categoriaId: data.categoriaId } : {}),
  }

  try {
    return await apiRequest('POST', '/accounting/gastos', payload)
  } catch (error) {
    if (esErrorDeRed(error)) {
      logger.log('[Offline Mode] Guardando gasto en cola...')

      await syncService.enqueueOperation(
        'gasto_registrar',
        '/accounting/gastos',
        'POST',
        payload,
        `Gasto: ${data.descripcion} ($${data.valor})`,
        data.comprobante || undefined,
      )

      return { id: `temp-gasto-${Date.now()}`, esOffline: true }
    }
    throw error
  }
}

export async function solicitarBase(data: {
  monto: number
  descripcion: string
  cobradorId: string
  rutaId: string
}): Promise<unknown> {
  try {
    return await apiRequest('POST', '/accounting/base-requests', data)
  } catch (error) {
    if (esErrorDeRed(error)) {
      logger.log('[Offline Mode] Guardando solicitud de base en cola...')
      await syncService.enqueueOperation(
        'base_solicitar',
        '/accounting/base-requests',
        'POST',
        data,
        `Solicitud de Base: $${data.monto}`,
      )
      return { id: `temp-base-${Date.now()}`, esOffline: true }
    }
    throw error
  }
}

// =====================================================
// DEUDAS DE COBRADORES
// =====================================================

export type DeudaEvento = {
  id: string
  tipoReferencia: string
  monto: number
  fecha: string
  cajaId: string
  referenciaId?: string
  descripcion?: string
}

export type DeudaCobrador = {
  cobradorId: string
  nombreCobrador: string
  rol: string
  totalDeuda: number
  gastosPersonales: number
  descuadres: number
  efectivoBajoCustodia: number
  totalEventos: number
  eventos?: DeudaEvento[]
}

export async function getDeudoresCobrador(): Promise<DeudaCobrador[]> {
  try {
    return await apiRequest<DeudaCobrador[]>('GET', '/accounting/deudas-cobradores')
  } catch (error) {
    const statusCode = estadoDeError(error)
    if (statusCode === 401 || statusCode === 403) {
      logger.log('[Contabilidad] getDeudoresCobrador omitido por permisos.')
      return []
    }

    const details = {
      statusCode: estadoDeError(error),
      message: mensajeDeError(error, ''),
      error: esApiError(error) ? error.error : undefined,
    }
    try {
      logger.error(`Error fetching deudas cobrador: ${JSON.stringify(details)}`)
    } catch {
      logger.error('Error fetching deudas cobrador')
    }
    return []
  }
}

export async function registrarAbonoDeudaCobrador(
  cobradorId: string,
  monto: number,
  nota: string,
  cajaIdDestino?: string,
): Promise<Transaccion | null> {
  const payload = {
    monto,
    nota,
    cajaIdDestino,
    // Misma clave online y offline: un reintento tras sincronizar no duplica.
    idempotencyKey: `abono-${cobradorId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  }
  try {
    return await apiRequest<Transaccion>(
      'POST',
      `/accounting/deudas-cobradores/${cobradorId}/abono`,
      payload,
    )
  } catch (error) {
    if (esErrorDeRed(error)) {
      logger.log('[Offline Mode] Guardando abono a deuda de cobrador en cola...')
      await syncService.enqueueOperation(
        'abono_deuda_cobrador',
        `/accounting/deudas-cobradores/${cobradorId}/abono`,
        'POST',
        payload,
        `Abono a deuda de cobrador (${cobradorId})`,
      )
      // La transacción se materializa al sincronizar.
      return null
    }
    logger.error('Error al registrar el abono:', error)
    throw error
  }
}
