import { estadoDeError, mensajeDeError } from '@/lib/mensaje-de-error'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api/apiClient'
import { apiRequest } from '@/lib/api/api'
import { restoreOfflineSession } from '@/lib/auth/offlineAuth'
import { offlineQueue } from './offlineQueue'
import {
  offlineStore,
  OfflineCliente,
  OfflinePrestamo,
  OfflineCuota,
  OfflineRuta,
} from './offlineDb'
import { trackOfflineEvent } from './offlineAnalytics'
import { nombreDePersona } from '@/lib/nombre-de-persona'
import type { Cliente } from '@/services/clientes-service'
import type { PrestamoDelListadoParcial } from '@/types/domain'
import type { PaginatedRoutes } from '@/services/routes-service'
import type { Producto } from '@/services/inventario-service'
import type { Caja } from '@/services/contabilidad-service'
import type { Usuario } from '@/services/usuarios-service'
import {
  remapearEndpoint,
  remapearProfundo,
  registrarMapeo,
  extraerIdReal,
  limpiarMapeos,
  contieneTempIdSinResolver,
} from './idRemap'

/**
 * Lo que se puede sacar de un fallo de red para el registro de diagnostico.
 *
 * Estaba escrito cinco veces, identico, en las cinco descargas: url, metodo,
 * baseURL, cuerpo de la respuesta, codigo, claves crudas y pila. Y estaba escrito
 * sobre un `catch (err)`, asi que nadie comprobaba que esos campos
 * existieran: son de axios, y un fallo que no venga de axios no los trae.
 */
type FalloDeRed = {
  config?: { url?: unknown; method?: unknown; baseURL?: unknown }
  response?: { data?: unknown }
  error?: unknown
  code?: unknown
  stack?: unknown
}

/**
 * `code` y `message` tal cual vienen, sin la busqueda mas amplia de
 * `mensajeDeError`.
 *
 * Hace falta porque de estas dos lecturas cuelgan DECISIONES, no textos: si el
 * fallo es de red no se detienen las demas descargas, y si el mensaje habla de 403
 * la descarga se omite por permisos. `mensajeDeError` tambien mira el cuerpo de la
 * respuesta y un `error.message` anidado, asi que usarlo aqui ampliaria lo que
 * cuenta como un 403. Se deja igual que estaba.
 */
const crudoDeFallo = (fallo: unknown) => {
  const f = (fallo && typeof fallo === 'object' ? fallo : {}) as {
    code?: unknown
    message?: unknown
  }
  return {
    code: f.code,
    message: typeof f.message === 'string' ? f.message : '',
  }
}

const detallesDeFallo = (fallo: unknown) => {
  const f: FalloDeRed = fallo && typeof fallo === 'object' ? fallo : {}
  return {
    url: f.config?.url,
    method: f.config?.method,
    baseURL: f.config?.baseURL,
    responseData: f.response?.data || f.error,
    code: f.code,
    rawKeys: fallo && typeof fallo === 'object' ? Object.keys(fallo) : null,
    stack: f.stack,
  }
}

/**
 * Cuantas veces se reintenta una operacion fallida antes de dejarla como
 * conflicto para que alguien la revise a mano. No se reintenta indefinidamente:
 * una operacion que falla siempre (un 400 por datos invalidos) bloquearia la
 * cola detras de ella.
 */
const MAX_RETRIES = 3

/**
 * Id del usuario sacado del propio token, sin llamar al servidor.
 *
 * Hace falta leerlo asi porque esto corre justo cuando no hay red. Se usa para
 * filtrar la cola: en un celular compartido entre cobradores, cada uno sincroniza
 * solo lo suyo y nadie sube las operaciones que otro dejo pendientes.
 *
 * El `catch` vacio es intencional: si el token esta corrupto o vencido se
 * devuelve `null` y la sincronizacion simplemente no corre. No es un error que
 * haya que reportar.
 */
const getCurrentUserId = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4)))
    return payload.sub || payload.id || null
  } catch {
    return null
  }
}

export interface SyncResult {
  processed: number
  succeeded: number
  failed: number
  errors: Array<{ id: string; description: string; error: string }>
}

/**
 * Una fila de `GET /loans` convertida en la copia local de un prestamo.
 *
 * Esta funcion existe aparte y exportada porque el mapeo que habia dentro de
 * `downloadPrestamos` leia claves que ese endpoint NO manda. Comprobado contra la
 * fila que arma `loans.service.ts:1960-1997`:
 *
 *   se leia          el endpoint manda      resultado que quedaba guardado
 *   ---------------  ---------------------  ------------------------------
 *   p.monto          montoPrestado          0 en todos los prestamos
 *   p.saldoPendiente montoPendiente         0 en todos los prestamos
 *   p.cantidadCuotas cuotasTotales          0 en todos los prestamos
 *   p.cliente.nombres cliente (TEXTO)       cadena vacia en todos
 *   p.plazoMeses     no lo manda            0 (sigue asi, ver abajo)
 *
 * Y descartaba una veintena de campos que si venian y que las pantallas offline
 * leen. El efecto se veia en tres sitios: cuentas vencidas mostraba todo el saldo
 * en $0, la ruta del cobrador mostraba cuota y saldo en $0, y el listado de
 * prestamos mostraba "undefined/undefined cuotas" y el pendiente en $0 en verde,
 * como si estuviera pagado.
 *
 * `plazoMeses` se queda en 0 a proposito: el listado no lo manda y no hay de donde
 * sacarlo sin otra peticion. Nadie lo lee de la copia local.
 */
/**
 * Cuantos prestamos como maximo se le piden las cuotas, y de cuantos en cuantos.
 *
 * El techo es por un admin: `GET /loans` acota por cobrador
 * (`collectorLoanScope`), asi que un cobrador baja solo los creditos de su ruta
 * —decenas— pero un admin podria traerse los 500 del limite. Con 200 se cubre el caso
 * real y no se dispara el numero de peticiones.
 */
const CUOTAS_MAX_PRESTAMOS = 200
const CUOTAS_POR_LOTE = 5

/**
 * Una fila de `/loans/:id/cuotas` convertida en la copia local de una cuota.
 *
 * Ese endpoint devuelve las filas crudas de Prisma (`getLoanCuotas`, sin enriquecer),
 * asi que los nombres son los de `model Cuota`.
 */
export function mapearCuotaDescargada(
  c: Record<string, unknown>,
  prestamoId: string,
): OfflineCuota {
  const num = (valor: unknown): number => Number(valor) || 0
  const texto = (valor: unknown, siNoHay = ''): string =>
    typeof valor === 'string' && valor ? valor : siNoHay

  return {
    id: String(c.id ?? ''),
    prestamoId,
    numeroCuota: num(c.numeroCuota),
    fechaVencimiento: texto(c.fechaVencimiento),
    monto: num(c.monto),
    montoCapital: num(c.montoCapital),
    montoInteres: num(c.montoInteres),
    montoInteresMora: num(c.montoInteresMora),
    estado: texto(c.estado, 'PENDIENTE'),
    montoPagado: num(c.montoPagado),
    fechaPago: typeof c.fechaPago === 'string' ? c.fechaPago : null,
    /**
     * Se guarda aunque `OfflineCuota` no la exigia: de ella depende el distintivo de
     * prorroga que calcula `enrich-ruta-historial-riesgo` sobre las visitas.
     */
    fechaVencimientoProrroga:
      typeof c.fechaVencimientoProrroga === 'string' ? c.fechaVencimientoProrroga : null,
  }
}

/**
 * Baja las cuotas de varios prestamos, de a `CUOTAS_POR_LOTE` peticiones.
 *
 * Por que una peticion por prestamo: `GET /loans` NO devuelve el arreglo `cuotas` y no
 * tiene ningun flag para pedirlo; la fila del listado solo trae los conteos ya
 * calculados. Las cuotas completas estan en `/loans/:id` y en `/loans/:id/cuotas`, las
 * dos por credito. Se usa la segunda, que es la mas liviana.
 *
 * Un fallo en un prestamo no tumba el resto: se queda sin sus cuotas y ya.
 */
async function descargarCuotasDePrestamos(ids: string[]): Promise<OfflineCuota[]> {
  const cuotas: OfflineCuota[] = []

  for (let i = 0; i < ids.length; i += CUOTAS_POR_LOTE) {
    const lote = ids.slice(i, i + CUOTAS_POR_LOTE)
    const respuestas = await Promise.all(
      lote.map((id) =>
        apiRequest<unknown[]>('GET', `/loans/${id}/cuotas`, undefined, {
          timeout: 20000,
          cacheTTL: 0,
        }).catch(() => [] as unknown[]),
      ),
    )

    respuestas.forEach((filas, k) => {
      if (!Array.isArray(filas)) return
      for (const fila of filas) {
        if (fila && typeof fila === 'object') {
          cuotas.push(mapearCuotaDescargada(fila as Record<string, unknown>, lote[k]))
        }
      }
    })
  }

  return cuotas
}

/**
 * Lo que entra a `mapearPrestamoDescargado`.
 *
 * Es la fila del listado (`PrestamoDelListado`) en PARCIAL y con `cliente` ensanchado, por
 * dos razones medidas:
 *
 *  - El almacen `prestamos` tiene DOS escritores: esta descarga y `ListadoPrestamos`, que
 *    guarda las filas tal cual. Y hay una prueba —"acepta tambien el cliente como objeto,
 *    por si otro origen alimenta el almacen"— que pasa `{ nombres, apellidos }`. El listado
 *    manda `cliente` como TEXTO ya compuesto; el detalle, como objeto.
 *  - Las pruebas llaman al mapeador con fragmentos, asi que tiene que ser parcial.
 *
 * Antes era `Record<string, unknown>`, que aceptaba leer cualquier nombre sin avisar. Ahi
 * vivian los cuatro campos que se guardaban en 0 en TODOS los prestamos.
 */
type FilaPrestamoDescargable = Omit<PrestamoDelListadoParcial, 'cliente'> & {
  cliente?: string | { nombres?: string; apellidos?: string; razonSocial?: string }
}

export function mapearPrestamoDescargado(p: FilaPrestamoDescargable): OfflinePrestamo {
  const num = (valor: unknown): number => Number(valor) || 0
  const texto = (valor: unknown, siNoHay = ''): string =>
    typeof valor === 'string' && valor ? valor : siNoHay

  return {
    id: String(p.id ?? ''),
    numeroPrestamo: texto(p.numeroPrestamo),
    clienteId: texto(p.clienteId),
    // `cliente` llega como nombre ya compuesto, no como objeto. `nombreDePersona`
    // acepta las dos formas por si otro origen alimenta este almacen.
    clienteNombre: nombreDePersona(p.cliente),
    cliente: nombreDePersona(p.cliente),
    clienteDni: texto(p.clienteDni),
    clienteTelefono: texto(p.clienteTelefono),
    clienteDireccion: texto(p.clienteDireccion),

    monto: num(p.montoPrestado),
    montoPrestado: num(p.montoPrestado),
    montoTotal: num(p.montoTotal),
    // El listado lo llama `montoPendiente`; aqui el campo historico es
    // `saldoPendiente` y lo leen dos pantallas, asi que se guardan los dos.
    saldoPendiente: num(p.montoPendiente),
    montoPendiente: num(p.montoPendiente),
    montoPagado: num(p.montoPagado),
    interesTotal: num(p.interesTotal),
    moraAcumulada: num(p.moraAcumulada),
    cuotaInicial: num(p.cuotaInicial),
    valorCuota: num(p.valorCuota),

    tasaInteres: num(p.tasaInteres),
    // El listado NO manda `plazoMeses` (ver la nota de arriba): queda en 0, y quien lo
    // usa lo comprueba antes (`offP.plazoMeses ? formatLoanTerm(...)`).
    plazoMeses: 0,
    frecuenciaPago: texto(p.frecuenciaPago, 'MENSUAL'),
    estado: texto(p.estado, 'PENDIENTE'),

    cantidadCuotas: num(p.cuotasTotales),
    cuotasTotales: num(p.cuotasTotales),
    cuotasPagadas: num(p.cuotasPagadas),
    cuotasVencidas: num(p.cuotasVencidas),
    progreso: num(p.progreso),

    producto: texto(p.producto),
    tipoProducto: texto(p.tipoProducto),
    tipoPrestamo: texto(p.tipoPrestamo),
    riesgo: texto(p.riesgo),
    ruta: texto(p.ruta),
    rutaNombre: texto(p.rutaNombre),

    fechaInicio: texto(p.fechaInicio),
    fechaFin: texto(p.fechaFin),
    creadoEn: texto(p.creadoEn),
  }
}

// ─── Procesar cola de operaciones pendientes ─────────────────────

export const syncManager = {
  /**
   * Sube al servidor todo lo que se hizo sin conexion.
   *
   * Lo dificil no es reenviar las peticiones, es que las operaciones offline se
   * referencian entre si con ids que todavia no existen. Un cobrador puede crear
   * un cliente y acto seguido un credito para ese cliente: el credito apunta a un
   * id temporal (`temp-...`) que el servidor no conoce.
   *
   * De ahi las tres piezas que trabajan juntas:
   *  1. Orden cronologico, para que la creacion vaya antes que quien la usa.
   *  2. Remapeo temp -> real, con el id que devolvio la creacion ya sincronizada.
   *  3. Una guarda final: si tras remapear todavia queda un id temporal, la
   *     operacion se devuelve a pendiente en vez de enviarse. Mandarla daria un
   *     400/404 y la marcaria como conflicto, cuando en realidad solo le faltaba
   *     esperar su turno.
   *
   * Sale sin hacer nada si no hay red o no hay sesion. Nunca lanza: los fallos se
   * acumulan en `result.errors` para que la UI los muestre sin romperse.
   */
  async processQueue(): Promise<SyncResult> {
    const startTime = Date.now()
    const result: SyncResult = { processed: 0, succeeded: 0, failed: 0, errors: [] }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return result
    }

    const currentUserId = getCurrentUserId()
    if (!currentUserId) return result

    let shouldNotifySync = false

    try {
      const pending = (await offlineQueue.getPending()).filter(
        (item) => item.userId === currentUserId,
      )
      const failed = (await offlineQueue.getFailed()).filter(
        (item) => item.userId === currentUserId,
      )

      // Reintentar fallidos con menos de MAX_RETRIES
      const retryable = failed.filter((item) => item.retries < MAX_RETRIES)
      // Orden CRONOLÓGICO (por fecha de creación): garantiza que una entidad se
      // cree antes que las operaciones que la referencian (no puedes referenciar
      // algo antes de crearlo). Esto hace que el remapeo temp→real funcione:
      // el `cliente_create` corre antes que el crédito que apunta a ese cliente,
      // aunque el crédito o un pago tengan mayor prioridad.
      const allToProcess = [...pending, ...retryable].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )

      shouldNotifySync = allToProcess.length > 0

      // Disparar evento de inicio de sincronización
      if (shouldNotifySync && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-sync-started'))
      }

      for (const item of allToProcess) {
        result.processed++
        await offlineQueue.updateStatus(item.id, 'syncing')

        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

          // Remapear referencias a ids temporales por los ids reales ya conocidos
          // (p. ej. un crédito creado offline que apunta a un cliente cuya
          // creación ya se sincronizó). Se aplica al endpoint y al cuerpo.
          const endpointFinal = remapearEndpoint(item.endpoint)
          const dataRemapeada = remapearProfundo(item.data)

          // Red de seguridad: si tras remapear AÚN queda una referencia a un id
          // temporal (su creación no se ha sincronizado todavía), no enviamos la
          // operación —fallaría con 400/404 y se marcaría como conflicto—; la
          // dejamos pendiente para el próximo intento, cuando su prerrequisito
          // ya tenga id real.
          const quedaTempSinResolver = contieneTempIdSinResolver(endpointFinal, dataRemapeada)
          if (quedaTempSinResolver) {
            await offlineQueue.updateStatus(item.id, 'pending')
            result.processed--
            continue
          }

          let requestData = dataRemapeada
          const headers: Record<string, string> = {
            Accept: 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          }

          // Soporte para archivos (Multimedia)
          if (item.file) {
            const formData = new FormData()
            formData.append('file', item.file, item.fileName || 'upload')

            if (dataRemapeada && typeof dataRemapeada === 'object') {
              Object.entries(dataRemapeada as Record<string, any>).forEach(([key, value]) => {
                formData.append(
                  key,
                  typeof value === 'object' ? JSON.stringify(value) : String(value),
                )
              })
            }
            requestData = formData
            // El navegador pondrá el Content-Type adecuado para FormData
          } else {
            headers['Content-Type'] = 'application/json'
          }

          const resp = await apiClient.request({
            method: item.method,
            url: endpointFinal,
            data: requestData,
            headers,
            timeout: 30000,
          })

          // Si esta operación era una creación con id temporal, registramos el
          // mapeo temp → real para que las operaciones dependientes que aún
          // están en cola apunten al id correcto.
          if (item.tempId) {
            const idReal = extraerIdReal(resp?.data)
            if (idReal) registrarMapeo(item.tempId, idReal)
          }

          // Éxito: marcar como completado
          await offlineQueue.updateStatus(item.id, 'completed')
          result.succeeded++

          // Eliminar permanentemente tras 3 segundos (para que el usuario vea el check)
          setTimeout(async () => {
            await offlineQueue.remove(item.id)
          }, 3000)
        } catch (err) {
          const status = estadoDeError(err)
          const errorMsg = mensajeDeError(err, 'Error desconocido')

          const newRetries = (item.retries || 0) + 1

          // Si es 401, no reintentar (token expirado) pero no lo borramos (esperamos login)
          if (status === 401) {
            await offlineQueue.updateStatus(
              item.id,
              'failed',
              'Token expirado. Inicie sesión nuevamente.',
              newRetries,
            )
          } else {
            const isFatal =
              status === 409 ||
              status === 400 ||
              status === 403 ||
              status === 404 ||
              newRetries >= MAX_RETRIES

            if (isFatal) {
              // Es un fallo definitivo, tratamos de enviarlo al Pipeline de Fallos Centralizado
              try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                await apiClient.request({
                  method: 'POST',
                  url: '/sync-conflicts/report-failed',
                  data: {
                    entidad: item.type || 'desconocido',
                    operacion: item.method,
                    datos: typeof item.data === 'string' ? JSON.parse(item.data) : item.data || {},
                    errorMotivo: errorMsg,
                    statusCode: status || 0,
                    endpoint: item.endpoint,
                  },
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                  },
                })

                // Se reportó exitosamente al servidor. Ya podemos borrarlo seguro.
                await offlineQueue.remove(item.id)
              } catch {
                // Si falla el reporte (ej. no hay internet), actualizamos su estado y reintentos para que intente reportarlo después
                await offlineQueue.updateStatus(
                  item.id,
                  'failed',
                  `Fallo definitivo. Pendiente de reporte al servidor. Error: ${errorMsg}`,
                  newRetries,
                )
              }
            } else {
              // Aún le quedan reintentos, solo actualizamos el error con el contador correcto
              await offlineQueue.updateStatus(item.id, 'failed', errorMsg, newRetries)
            }
          }

          result.failed++
          result.errors.push({ id: item.id, description: item.description, error: errorMsg })
          await trackOfflineEvent('error', { errorMessage: errorMsg })
        }
      }

      // Track sync completion
      const duration = Date.now() - startTime
      await trackOfflineEvent('sync', {
        duration,
        recordCount: result.processed,
        success: result.failed === 0,
      })

      // Si ya no queda nada pendiente ni fallido en la cola, los mapeos de ids
      // temporales cumplieron su función: se limpian para no acumularse.
      try {
        const [pend, fail] = await Promise.all([
          offlineQueue.countPending(),
          offlineQueue.countFailed(),
        ])
        if (pend === 0 && fail === 0) limpiarMapeos()
      } catch {
        /* el conteo es best-effort; no afecta el resultado del sync */
      }

      return result
    } finally {
      // Disparar evento de fin de sincronización siempre
      if (shouldNotifySync && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-sync-finished', { detail: result }))
      }
    }
  },

  // ─── Descargar datos para uso offline ────────────────────────

  async downloadClientes(): Promise<number> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      logger.warn('[Offline Sync] Sin conexión a internet, omitiendo descarga de clientes')
      return 0
    }

    try {
      let token = localStorage.getItem('token')
      if (!token) {
        const restored = restoreOfflineSession()
        token = restored?.token || null
        if (!token) {
          logger.warn('[Offline Sync] No hay token de autenticación disponible')
          return 0
        }
      }

      logger.log('[Offline Sync] Iniciando descarga de clientes...')
      const data = await apiRequest<Cliente[] | { clientes: Cliente[] }>(
        'GET',
        '/clients',
        undefined,
        {
          timeout: 30000,
          cacheTTL: 0,
        },
      )

      const clientes: OfflineCliente[] = (Array.isArray(data) ? data : data.clientes || []).map(
        (c: any) => ({
          id: c.id,
          codigo: c.codigo || '',
          dni: c.dni || '',
          nombres: c.nombres || '',
          apellidos: c.apellidos || '',
          telefono: c.telefono || '',
          direccion: c.direccion || null,
          correo: c.correo || null,
          nivelRiesgo: c.nivelRiesgo || 'MEDIO',
          rutaId: c.rutaId || undefined,
          prestamosActivos: c.prestamosActivos || 0,
          montoTotal: c.montoTotal || 0,
          montoMora: c.montoMora || 0,
        }),
      )

      await offlineStore.saveMany('clientes', clientes, true)
      await trackOfflineEvent('download', { storeName: 'clientes', recordCount: clientes.length })
      logger.log(`[Offline Sync] Descarga de clientes completada: ${clientes.length} registros`)
      return clientes.length
    } catch (err) {
      const errorMessage = mensajeDeError(err, 'Error desconocido')
      const statusCode = estadoDeError(err) ?? 'N/A'

      if (statusCode === 401 || statusCode === 403) {
        logger.log('[Offline Sync] Descarga de clientes omitida por permisos.')
        return 0
      }

      const errorDetails = {
        message: errorMessage,
        statusCode,
        ...detallesDeFallo(err),
      }

      try {
        console.error(`[Offline Sync] Error descargando clientes: ${JSON.stringify(errorDetails)}`)
      } catch {
        console.error('[Offline Sync] Error descargando clientes (no-serialize)')
      }

      // Si es un error de red, no lanzar excepción para evitar que detenga otras descargas
      const crudo = crudoDeFallo(err)
      if (
        statusCode === 0 ||
        crudo.code === 'ERR_NETWORK' ||
        crudo.message.includes('Network Error')
      ) {
        logger.warn(
          '[Offline Sync] Error de red al descargar clientes. El servidor puede no estar disponible.',
        )
      }

      return 0
    }
  },

  async downloadPrestamos(): Promise<number> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0

    try {
      let token = localStorage.getItem('token')
      if (!token) {
        const restored = restoreOfflineSession()
        token = restored?.token || null
        if (!token) return 0
      }

      const data = await apiRequest<{ prestamos?: PrestamoDelListadoParcial[] }>(
        'GET',
        '/loans?limit=500',
        undefined,
        {
          timeout: 30000,
          cacheTTL: 0,
        },
      )

      const prestamosRaw = data.prestamos || []
      const prestamos: OfflinePrestamo[] = prestamosRaw.map(mapearPrestamoDescargado)

      // Filtrar para guardar solo préstamos activos o en mora (excluir FINALIZADO, ARCHIVADO, RECHAZADO, etc.)
      const prestamosFiltrados = prestamos.filter(
        (p) =>
          p.estado === 'ACTIVO' ||
          p.estado === 'VENCIDO' ||
          p.estado === 'EN_MORA' ||
          p.estado === 'PENDIENTE',
      )

      await offlineStore.saveMany('prestamos', prestamosFiltrados, true)
      await trackOfflineEvent('download', { storeName: 'prestamos', recordCount: prestamos.length })

      // Aqui habia un bucle que leia `p.cuotas` de cada fila del listado. Ese arreglo
      // NO existe: `GET /loans` solo manda los conteos ya calculados
      // (`cuotasPagadas`, `cuotasTotales`, `cuotasVencidas`). Asi que el bucle nunca
      // corria, el almacen `cuotas` no se llenaba NUNCA, y encima el
      // `saveMany('prestamos', ..., true)` de arriba lo borra en cada login.
      //
      // Se veia en el detalle de prestamo sin conexion: la tabla de cuotas salia
      // vacia siempre. Ahora se bajan de verdad, una peticion por credito y de a
      // cinco, solo para los que se guardan (ya filtrados a los estados operativos).
      const idsParaCuotas = prestamosFiltrados
        .slice(0, CUOTAS_MAX_PRESTAMOS)
        .map((p) => p.id)
        .filter(Boolean)
      if (prestamosFiltrados.length > CUOTAS_MAX_PRESTAMOS) {
        logger.warn(
          `[Offline Sync] ${prestamosFiltrados.length} creditos en la copia local; se bajan las cuotas de los primeros ${CUOTAS_MAX_PRESTAMOS}.`,
        )
      }
      const allCuotas = await descargarCuotasDePrestamos(idsParaCuotas)

      if (allCuotas.length > 0) {
        await offlineStore.saveMany('cuotas', allCuotas)
        await trackOfflineEvent('download', { storeName: 'cuotas', recordCount: allCuotas.length })
      }

      return prestamos.length
    } catch (err) {
      const statusCode = estadoDeError(err) ?? 'N/A'
      if (statusCode === 401 || statusCode === 403) {
        logger.log('[Offline Sync] Descarga de préstamos omitida por permisos.')
        return 0
      }

      const errorDetails = {
        message: mensajeDeError(err, 'Error desconocido'),
        statusCode,
        ...detallesDeFallo(err),
      }

      try {
        console.error(`[Offline Sync] Error descargando préstamos: ${JSON.stringify(errorDetails)}`)
      } catch {
        console.error('[Offline Sync] Error descargando préstamos (no-serialize)')
      }
      return 0
    }
  },

  async downloadRutas(): Promise<number> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0

    try {
      let token = localStorage.getItem('token')
      if (!token) {
        const restored = restoreOfflineSession()
        token = restored?.token || null
        if (!token) return 0
      }

      const data = await apiRequest<PaginatedRoutes>('GET', '/routes', undefined, {
        timeout: 30000,
        cacheTTL: 0,
      })

      const rutasRaw = Array.isArray(data) ? data : data.data || []
      const rutas: OfflineRuta[] = rutasRaw.map((r) => ({
        id: r.id,
        codigo: r.codigo || '',
        nombre: r.nombre || '',
        zona: r.zona || '',
        activa: r.activa ?? true,
        cobradorId: r.cobradorId || '',
        supervisorId: r.supervisorId || null,
      }))

      await offlineStore.saveMany('rutas', rutas, true)
      await trackOfflineEvent('download', { storeName: 'rutas', recordCount: rutas.length })
      return rutas.length
    } catch (err) {
      const errorMessage = mensajeDeError(err, 'Error desconocido')
      const statusCode = estadoDeError(err) ?? 'N/A'

      if (statusCode === 401 || statusCode === 403) {
        logger.log('[Offline Sync] Descarga de rutas omitida por permisos.')
        return 0
      }

      const errorDetails = {
        message: errorMessage,
        statusCode,
        ...detallesDeFallo(err),
      }

      try {
        console.error(`[Offline Sync] Error descargando rutas: ${JSON.stringify(errorDetails)}`)
      } catch {
        console.error('[Offline Sync] Error descargando rutas (no-serialize)')
      }
      return 0
    }
  },

  async downloadProductos(): Promise<number> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0
    try {
      const data = await apiRequest<Producto[]>('GET', '/inventory', undefined, {
        timeout: 30000,
        cacheTTL: 0,
      })
      const productos = data.map((p) => ({
        id: String(p.id),
        codigo: p.codigo || '',
        nombre: p.nombre || '',
        descripcion: p.descripcion || '',
        categoria: p.categoria || 'General',
        stock: p.stock || 0,
        costo: p.costo || 0,
        activo: p.activo ?? true,
      }))
      await offlineStore.saveMany('productos', productos, true)
      await trackOfflineEvent('download', { storeName: 'productos', recordCount: productos.length })
      return productos.length
    } catch (err) {
      console.error('[Offline Sync] Error descargando productos:', err)
      return 0
    }
  },

  async downloadCajas(): Promise<number> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0
    try {
      const data = await apiRequest<Caja[]>('GET', '/accounting/cajas', undefined, {
        timeout: 30000,
        cacheTTL: 0,
      })
      const cajas = data.map((c) => ({
        id: c.id,
        codigo: c.codigo || '',
        nombre: c.nombre || '',
        tipo: c.tipo || 'RUTA',
        responsable: c.responsable || '',
        saldo: Number(c.saldo) || 0,
        estado: c.estado || 'CERRADA',
      }))
      await offlineStore.saveMany('cajas', cajas, true)
      await trackOfflineEvent('download', { storeName: 'cajas', recordCount: cajas.length })
      return cajas.length
    } catch (err) {
      const errorMessage = mensajeDeError(err, 'Error desconocido')
      const statusCode = estadoDeError(err) ?? 'N/A'

      if (statusCode === 401 || statusCode === 403) {
        logger.log('[Offline Sync] Descarga de cajas omitida por permisos.')
        return 0
      }

      const errorDetails = {
        message: errorMessage,
        statusCode,
        ...detallesDeFallo(err),
      }

      try {
        console.error(`[Offline Sync] Error descargando cajas: ${JSON.stringify(errorDetails)}`)
      } catch {
        console.error('[Offline Sync] Error descargando cajas (no-serialize)')
      }
      return 0
    }
  },

  async downloadUsuarios(): Promise<number> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0
    try {
      const data = await apiRequest<Usuario[]>('GET', '/usuarios', undefined, {
        timeout: 30000,
        cacheTTL: 0,
      })
      const usuarios = data.map((u) => ({
        id: u.id,
        nombres: u.nombres || '',
        apellidos: u.apellidos || '',
        correo: u.correo || '',
        rol: u.rol || 'COBRADOR',
        estado: u.estado || 'ACTIVO',
      }))
      await offlineStore.saveMany('usuarios', usuarios, true)
      await trackOfflineEvent('download', { storeName: 'usuarios', recordCount: usuarios.length })
      return usuarios.length
    } catch (err) {
      const statusCode = estadoDeError(err) ?? 'N/A'
      if (
        statusCode === 401 ||
        statusCode === 403 ||
        crudoDeFallo(err).message.includes('403') ||
        crudoDeFallo(err).message.toLowerCase().includes('forbidden')
      ) {
        logger.log(
          '[Offline Sync] Descarga de usuarios omitida por permisos (SUPERVISOR/COBRADOR).',
        )
        return 0
      }

      const errorDetails = {
        message: mensajeDeError(err, 'Error desconocido'),
        statusCode,
        ...detallesDeFallo(err),
      }

      try {
        console.error(`[Offline Sync] Error descargando usuarios: ${JSON.stringify(errorDetails)}`)
      } catch {
        console.error('[Offline Sync] Error descargando usuarios (no-serialize)')
      }
      return 0
    }
  },

  // Limpiar todos los datos locales para forzar una resincronización limpia
  async clearLocalData(): Promise<void> {
    await offlineStore.clearAll()
    logger.log('[Offline Sync] Datos locales limpiados')
  },

  // Descargar todos los datos para uso offline
  async downloadAll(): Promise<{
    clientes: number
    prestamos: number
    rutas: number
    productos: number
    cajas: number
    usuarios: number
  }> {
    try {
      const [clientes, prestamos, rutas, productos, cajas, usuarios] = await Promise.all([
        this.downloadClientes(),
        this.downloadPrestamos(),
        this.downloadRutas(),
        this.downloadProductos(),
        this.downloadCajas(),
        this.downloadUsuarios(),
      ])
      return { clientes, prestamos, rutas, productos, cajas, usuarios }
    } catch (err) {
      console.error('[Offline Sync] Error critico en downloadAll:', err)
      return { clientes: 0, prestamos: 0, rutas: 0, productos: 0, cajas: 0, usuarios: 0 }
    }
  },

  // Obtener estado de sincronización
  async getStatus(): Promise<{
    isOnline: boolean
    pendingOps: number
    failedOps: number
    lastSync: Record<string, string | undefined>
    recordCounts: Record<string, number>
  }> {
    const [
      pendingOps,
      failedOps,
      clientesMeta,
      prestamosMeta,
      rutasMeta,
      productosMeta,
      cajasMeta,
      usuariosMeta,
      clientesCount,
      prestamosCount,
      cuotasCount,
      rutasCount,
      productosCount,
      cajasCount,
      usuariosCount,
    ] = await Promise.all([
      offlineQueue.countPending(),
      offlineQueue.countFailed(),
      offlineStore.getSyncMeta('clientes'),
      offlineStore.getSyncMeta('prestamos'),
      offlineStore.getSyncMeta('rutas'),
      offlineStore.getSyncMeta('productos'),
      offlineStore.getSyncMeta('cajas'),
      offlineStore.getSyncMeta('usuarios'),
      offlineStore.count('clientes'),
      offlineStore.count('prestamos'),
      offlineStore.count('cuotas'),
      offlineStore.count('rutas'),
      offlineStore.count('productos'),
      offlineStore.count('cajas'),
      offlineStore.count('usuarios'),
    ])

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingOps,
      failedOps,
      lastSync: {
        clientes: clientesMeta?.lastSyncAt,
        prestamos: prestamosMeta?.lastSyncAt,
        rutas: rutasMeta?.lastSyncAt,
        productos: productosMeta?.lastSyncAt,
        cajas: cajasMeta?.lastSyncAt,
        usuarios: usuariosMeta?.lastSyncAt,
      },
      recordCounts: {
        clientes: clientesCount,
        prestamos: prestamosCount,
        cuotas: cuotasCount,
        rutas: rutasCount,
        productos: productosCount,
        cajas: cajasCount,
        usuarios: usuariosCount,
      },
    }
  },
}
