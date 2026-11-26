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
    /*
     * Es lo que hace que la meta no se pierda. Si esto cambiara a filtrar por
     * `cobradorId`, el pago del supervisor desapareceria del avance del dia.
     *
     * La consulta se MOVIO: antes era un `prestamo: { rutaId }` de Prisma en
     * `routes.service.ts` y ahora el listado la hace en SQL dentro de
     * `estadisticas-listado.ts`, por pagina en vez de por ruta. La intencion es
     * la misma, asi que la prueba mira donde vive ahora, en los dos sitios que
     * cuentan recaudo de una ruta: el listado y el detalle.
     */
    const listado = sinComentarios(
      fs.readFileSync(
        path.join(BACKEND, 'src', 'routes', 'estadisticas-listado.ts'),
        'utf8',
      ),
    )
    const rutas = sinComentarios(
      fs.readFileSync(
        path.join(BACKEND, 'src', 'routes', 'routes.service.ts'),
        'utf8',
      ),
    )

    // El listado: el pago se une al prestamo y se agrupa por la ruta DEL
    // PRESTAMO, no por quien cobro.
    expect(listado).toMatch(/JOIN "Prestamo" l ON l\.id=p\."prestamoId"/)
    expect(listado).toMatch(/l\."rutaId" IN/)
    expect(listado).not.toMatch(/p\."cobradorId"/)

    // El detalle: la misma regla, en Prisma.
    expect(rutas).toMatch(/prestamo:\s*\{\s*rutaId(\s*\}|:\s*id\s*\})/)
  })
})

/**
 * El segundo caso en que no cobro el cobrador: el cliente pago en la OFICINA.
 *
 * Lo pidio el negocio —muchos clientes no esperan al cobrador y van a pagar a
 * la sede, donde los recibe el coordinador— y es mas silencioso que el del
 * supervisor, porque aqui el `cobradorId` del pago NO se pisa: se fuerza al
 * cobrador de la RUTA para que el recaudo y la meta lo cuenten. Asi que por ese
 * campo el pago de oficina es indistinguible de un cobro en la calle, y
 * `cobradoPorOtro` —que compara contra `visita.cobradorId`— no se activaba
 * nunca.
 *
 * La marca va en `origenGestion`, la pone el servidor por el rol de quien
 * registra, y la ruta la traduce a un `cobradoPor` con el centinela `OFICINA`.
 */
describe('el pago recibido en la oficina se dice', () => {
  const pagos = path.join(BACKEND, 'src', 'payments', 'payments.service.ts')
  const rutas = path.join(BACKEND, 'src', 'routes', 'routes.service.ts')
  const origen = path.join(BACKEND, 'src', 'payments', 'origen-de-gestion.ts')

  it('existen los tres archivos que lo sostienen', () => {
    for (const f of [pagos, rutas, origen]) {
      expect(fs.existsSync(f)).toBe(true)
    }
  })

  it('el pago nace marcado, y no copiando lo que mande el cliente', () => {
    const fuente = sinComentarios(fs.readFileSync(pagos, 'utf8'))

    // El DTO solo admite CIERRE_PENDIENTE, asi que copiar el campo tal cual
    // era la via por la que la marca no podia entrar nunca.
    expect(fuente).not.toMatch(/origenGestion: paymentDto\.origenGestion/)
    expect(
      (fuente.match(/origenGestion: resolverOrigenDeGestion\(/g) || []).length,
    ).toBe(2)
  })

  it('el coordinador cuenta como oficina, y el cobrador y el supervisor no', () => {
    const fuente = sinComentarios(fs.readFileSync(origen, 'utf8'))

    expect(fuente).toMatch(/RolUsuario\.COORDINADOR/)
    expect(fuente).toMatch(/RolUsuario\.ADMIN/)
    expect(fuente).toMatch(/RolUsuario\.SUPER_ADMINISTRADOR/)
    expect(fuente).not.toMatch(/RolUsuario\.COBRADOR/)
    expect(fuente).not.toMatch(/RolUsuario\.SUPERVISOR/)
  })

  it('la ruta lo traduce a un `cobradoPor` que la tarjeta ya sabe pintar', () => {
    const fuente = sinComentarios(fs.readFileSync(rutas, 'utf8'))

    expect(fuente).toMatch(/origenGestion \|\| ''\)\.toUpperCase\(\) === ORIGEN_OFICINA/)
    expect(fuente).toMatch(/nombre: 'la oficina'/)
  })

  it('y la ayuda de la tarjeta explica los DOS casos, no solo el del supervisor', () => {
    const ayuda = fs.readFileSync(
      path.join(RAIZ, 'lib', 'ayudas', 'textos-de-ayuda.ts'),
      'utf8',
    )
    const texto = ayuda.split('cobradoPorOtro:')[1]?.slice(0, 600) || ''

    expect(texto).toContain('supervisor')
    expect(texto).toContain('oficina')
  })

  it('la oficina registra desde el modal y conserva la URL anterior', () => {
    const lista = sinComentarios(
      fs.readFileSync(path.join(RAIZ, 'components', 'clientes', 'ClientesFeature.tsx'), 'utf8'),
    )

    expect(lista).toMatch(/setClienteParaCobro\(cliente\)/)
    expect(lista).toMatch(/<PagoOficinaModal/)
    expect(lista).toMatch(/cobraEnOficina/)

    expect(
      fs.existsSync(
        path.join(RAIZ, 'app', 'admin', 'pagos', 'registrar', '[clienteId]', 'page.tsx'),
      ),
    ).toBe(true)
  })
})
