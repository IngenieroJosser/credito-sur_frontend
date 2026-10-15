/**
 * El nombre del cobrador de una ruta, en un solo lugar.
 *
 * En una RUTA el cobrador es un string, no un objeto: los dos endpoints
 * (`GET /routes` y `GET /routes/:id`) pisan la relación de Prisma con
 * `` `${ruta.cobrador.nombres} ${ruta.cobrador.apellidos}` ``. Ver la nota completa
 * en `Ruta` de `types/domain.ts`.
 *
 * Existe porque tres pantallas leían `ruta.cobrador.nombres`. Como el string es
 * truthy, entraban a esa rama, sacaban `undefined` y mostraban el cobrador EN
 * BLANCO — y en `SupervisorCobroView` además se saltaban el respaldo que sí
 * funcionaba.
 *
 * Acepta también la forma de objeto porque hay endpoints que sí la mandan
 * (`reports/operational/route-detail`, y el cobrador de un préstamo), y así una
 * pantalla que reciba cualquiera de las dos no se rompe.
 *
 * La lógica está en `nombreDePersona`: el mismo fallo apareció después en la copia
 * offline de los préstamos, con el nombre del cliente. Aquí queda el nombre del
 * dominio y allí el mecanismo.
 */
import { nombreDePersona } from '@/lib/nombre-de-persona'

/**
 * @param cobrador lo que venga en el campo `cobrador`: un nombre ya armado, un
 *   objeto con nombres y apellidos, o nada.
 * @param siNoHay qué devolver cuando no se puede armar un nombre.
 */
export function nombreDelCobrador(cobrador: unknown, siNoHay = ''): string {
  return nombreDePersona(cobrador, siNoHay)
}
