/**
 * Quién puede recibir un pago EN LA OFICINA.
 *
 * ── Por qué es una lista aparte ─────────────────────────────────────────────
 *
 * El backend acepta un pago de cinco roles, pero no los trata igual: decide a
 * qué caja entra el dinero según quién cobra y cómo
 * (`payments.service.ts` → `resolveCajaIngresoPago`).
 *
 *   coordinador / admin / super admin, en efectivo  ->  CAJA-OFICINA
 *   cualquier rol, con método distinto de efectivo  ->  CAJA-BANCO
 *   supervisor, en efectivo                         ->  su caja operativa,
 *                                                       y solo en una ruta que
 *                                                       él supervise
 *   cobrador, en efectivo                           ->  la caja de su ruta
 *
 * De ahí que esta lista sean TRES roles y no cinco. El cliente que llega a
 * pagar a la sede lo atiende la oficina, y su billete entra a la caja de la
 * oficina. El supervisor y el cobrador cobran en la calle, con su propio flujo
 * —cuota objetivo, clave de idempotencia y respaldo sin conexión—, y si se les
 * ofreciera este botón desde el listado de clientes se encontrarían con un
 * «No tienes permiso para registrar cobros en esta ruta supervisada» en cuanto
 * el cliente no fuera de una ruta suya: un camino sin salida.
 *
 * Es el espejo de `rolesOficina` en `payments.service.ts`. Si allí cambia,
 * aquí también: lo que decide de verdad es el backend, y esta lista solo
 * evita ofrecer un botón que iba a fallar.
 */
export const ROLES_QUE_COBRAN_EN_OFICINA = [
  'SUPER_ADMINISTRADOR',
  'ADMIN',
  'COORDINADOR',
] as const

export type RolDeOficina = (typeof ROLES_QUE_COBRAN_EN_OFICINA)[number]

export const puedeCobrarEnOficina = (rol: string | null | undefined): boolean =>
  !!rol && (ROLES_QUE_COBRAN_EN_OFICINA as readonly string[]).includes(String(rol).toUpperCase())

/** La pantalla real de registro, que el `rewrites` sirve para todos los roles. */
export const rutaDeRegistroDePago = (clienteId: string) => `/pagos/registrar/${clienteId}`
