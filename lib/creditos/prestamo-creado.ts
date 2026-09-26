import type { Prestamo } from '@/types/domain'

/**
 * Lo que de verdad devuelve `POST /loans`.
 *
 * `crearPrestamo` estaba declarado `Promise<any>`, y como nadie sabía la forma de
 * la respuesta, cuatro pantallas terminaron adivinando el id por hasta seis
 * caminos distintos (`response.data.id`, `response.prestamo.id`,
 * `response.data.prestamo.id`, `response.data.data.id`, `response.data.loan.id`…).
 *
 * Rastreado en el backend (`LoansService.createLoan`), son tres formas y ninguna
 * de esas cinco existe; `apiRequest` ya devuelve el cuerpo de la respuesta:
 *
 *  1. Creación normal: `{ ...prestamo, mensaje, requiereAprobacion }` → el id va
 *     arriba, en `id`.
 *  2. Recuperación tras fallar una tarea secundaria: lo mismo más
 *     `aprobacionId`, `efectoProvisionalId` y `warning`. También `id`.
 *  3. Reintento idempotente (el préstamo ya estaba creado, que es justo lo que
 *     pasa cuando la cola offline reintenta):
 *     `{ mensaje, prestamoId, numeroPrestamo, aprobacionId, idempotentReplay }`
 *     → aquí el id se llama **prestamoId**, y ninguna de las pantallas lo leía.
 *
 * Y la rama offline del propio servicio devuelve `{ id: tempId, …, esOffline }`.
 */
export interface PrestamoCreado extends Partial<Prestamo> {
  /** Creación normal, recuperación y modo offline. */
  id?: string
  /** Solo en el reintento idempotente: el préstamo ya existía. */
  prestamoId?: string
  mensaje?: string
  requiereAprobacion?: boolean
  /** true cuando la respuesta es un reintento y no se creó nada nuevo. */
  idempotentReplay?: boolean
  aprobacionId?: string | null
  efectoProvisionalId?: string | null
  /** El préstamo quedó creado pero falló una tarea posterior. */
  warning?: string
  /** La creación quedó en la cola: el id es temporal y no existe en el servidor. */
  esOffline?: boolean
}

/**
 * El id del préstamo recién creado, en un solo lugar.
 *
 * Devuelve `null` cuando no hay id utilizable, incluido el caso del id temporal
 * de la cola offline: pedirle al servidor el contrato de un préstamo que todavía
 * no subió solo produce un 404.
 */
export function idDelPrestamoCreado(respuesta: PrestamoCreado | null | undefined): string | null {
  if (!respuesta) return null

  const id = respuesta.id ?? respuesta.prestamoId
  if (!id) return null
  if (respuesta.esOffline) return null
  // Los ids de la cola llevan este prefijo hasta que el sync los remapea.
  if (id.startsWith('temp-')) return null

  return id
}
