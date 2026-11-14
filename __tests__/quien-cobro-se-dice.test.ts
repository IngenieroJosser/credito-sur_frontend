import * as fs from 'fs'
import * as path from 'path'

import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Cuando cobra otro, la pantalla lo dice.
 *
 * ── Lo que pasa, medido ─────────────────────────────────────────────────────
 *
 * Un cliente puede ser visitado por su cobrador o por el supervisor de la ruta
 * —que también sale a cobrar—. Si cobra el supervisor,
 * `payments.service.ts` pisa el `cobradorId` del pago con el id del
 * supervisor. Lo hace en dos sitios, de forma explícita, descartando el
 * `cobradorId` que la propia pantalla del supervisor calcula y envía:
 *
 *     if (rolActor === RolUsuario.SUPERVISOR && actor?.id) {
 *       cobradorIdVal = actor.id;
 *     }
 *
 * Y tiene su razón: el efectivo entra a la caja del supervisor, no a la del
 * cobrador.
 *
 * **La meta de la ruta no se pierde.** El recaudo del día se calcula
 * filtrando por `prestamo.rutaId` y por la asignación del cliente a la ruta,
 * NO por `cobradorId` (`routes.service.ts`). Así que el avance de la ruta
 * cuenta ese pago igual. Lo que no lo cuenta es el informe por cobrador, y eso
 * es correcto: el dinero lo tiene el supervisor.
 *
 * ── Lo que faltaba ──────────────────────────────────────────────────────────
 *
 * Decirlo. El cobrador veía al cliente ya pagado, sin rastro de quién había
 * pasado por ahí, y su cifra por cobrador no cuadraba con el avance de su
 * ruta sin ninguna explicación en pantalla.
 *
 * Esta prueba vigila que el dato siga viajando y que la tarjeta lo enseñe.
 */

const RAIZ = path.join(__dirname, '..')
const BACKEND = path.join(RAIZ, '..', 'credito-sur_backend')

describe('el dato de quién cobró viaja hasta la pantalla', () => {
  it('el mapeador de visitas lo conserva', () => {
    const fuente = sinComentarios(
      fs.readFileSync(path.join(RAIZ, 'lib', 'ruta-visitas-mapper.ts'), 'utf8'),
    )

    expect(fuente).toContain('cobradoPor')
  })

  it('y el tipo de la visita lo declara', () => {
    /*
     * Declarado y no leído con un `as any`: en este proyecto lo que no está
     * declarado se pierde en silencio, y ya pasó con otros campos.
     */
    const fuente = fs.readFileSync(path.join(RAIZ, 'lib', 'types', 'cobranza.ts'), 'utf8')

    expect(fuente).toMatch(/cobradoPor\?:\s*\{[^}]*nombre/)
  })

  it('la tarjeta solo lo dice cuando NO es el cobrador de la ruta', () => {
    // Si lo dijera siempre, sería ruido en el 99% de las visitas.
    const fuente = sinComentarios(
      fs.readFileSync(
        path.join(RAIZ, 'components', 'dashboards', 'shared', 'CobradorElements.tsx'),
        'utf8',
      ),
    )

    expect(fuente).toMatch(/visita\.cobradoPor\.id !== visita\?\.cobradorId/)
    expect(fuente).toContain('lo cobró')
  })
})

describe('la regla del backend sigue siendo la que se documentó', () => {
  /*
   * Si alguien quita el pisado del `cobradorId`, el pago del supervisor pasará
   * a acreditarse al cobrador de la ruta y el efectivo quedará contado en la
   * caja equivocada. Esta prueba no lo prohíbe: avisa de que la explicación de
   * arriba —y el rótulo de la tarjeta— dejaron de corresponder al código.
   */
  const servicio = path.join(BACKEND, 'src', 'payments', 'payments.service.ts')

  it('encuentra el servicio de pagos', () => {
    expect(fs.existsSync(servicio)).toBe(true)
  })

  it('el supervisor sigue quedando acreditado con su propio pago', () => {
    const fuente = sinComentarios(fs.readFileSync(servicio, 'utf8'))
    const veces = (
      fuente.match(/rolActor === RolUsuario\.SUPERVISOR && actor\?\.id/g) || []
    ).length

    expect(veces).toBeGreaterThan(0)
  })

  it('y el recaudo de la ruta se sigue contando por ruta, no por cobrador', () => {
    // Es lo que hace que la meta no se pierda. Si esto cambia a filtrar por
    // `cobradorId`, el pago del supervisor desaparecería del avance del día.
    const rutas = sinComentarios(
      fs.readFileSync(path.join(BACKEND, 'src', 'routes', 'routes.service.ts'), 'utf8'),
    )

    expect(rutas).toMatch(/prestamo:\s*\{\s*rutaId\s*\}/)
  })
})
