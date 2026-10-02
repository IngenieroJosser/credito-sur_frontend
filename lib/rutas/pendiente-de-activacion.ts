import type { RutaDeLista } from '@/types/domain'

/**
 * Cuándo una ruta está pendiente de salir a operar hoy.
 *
 * El listado de rutas tenía una pestaña "Pendientes" que filtraba por
 * `estado === 'PENDIENTE_ACTIVACION'`. Ese estado **no existe**: el backend deriva
 * `estado` de la columna `activa`, así que solo vale `'ACTIVA'` o `'INACTIVA'`. La
 * pestaña no podía coincidir con nada, así que siempre mostraba una lista vacía.
 *
 * La activación del día sí existe, pero antes solo se podía consultar de una ruta
 * a la vez (`GET /routes/:id/activacion-hoy`). Ahora el listado la trae para todas
 * en `activadaHoy`, y esta es la regla que decide.
 *
 * Tres condiciones, y las tres importan:
 *
 *  - **Habilitada.** Una ruta inhabilitada no se espera que opere, así que no está
 *    "pendiente": está apagada.
 *  - **No es domingo.** No hay jornada operativa, así que nada está pendiente.
 *  - **`activadaHoy === false`,** comparado en estricto a propósito: si el campo no
 *    viene (una respuesta vieja, o un caché de antes de este cambio), no se puede
 *    afirmar que la ruta no salió. Ahí se prefiere no marcar nada antes que marcar
 *    todas las rutas como pendientes.
 */
export const estaPendienteDeActivacion = (
  ruta: Pick<RutaDeLista, 'estado' | 'activadaHoy' | 'diaNoLaboral'>,
): boolean => ruta.estado === 'ACTIVA' && !ruta.diaNoLaboral && ruta.activadaHoy === false
