import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import {
  entrarComo,
  hayPantallaDeError,
  textoSospechoso,
  USUARIOS,
  vigilar,
  type Hallazgo,
  type Rol,
} from './sesion'

/**
 * Los siete roles usando el sistema A LA VEZ, cada uno en su propia ventana.
 *
 * Esto no es el barrido de pantallas de `pantallas-por-rol.e2e.ts`, que entra una por una
 * con un solo usuario. Aquí se abren siete contextos de navegador simultáneos —sesiones
 * independientes, cookies independientes— y se les hace trabajar en paralelo, como una
 * jornada de verdad: el cobrador en su ruta, el coordinador mirando rutas, el contador en
 * caja, el de ventas en el punto de venta.
 *
 * Atrapa una clase de fallo que la prueba secuencial no ve:
 *
 *  - Límites de peticiones compartidos. El limitador cuenta POR IP
 *    (`rate-limit.guard.ts:228`), no por usuario, y en la oficina todos salen por la misma:
 *    varios usuarios normales pueden agotarse el cupo entre ellos. Aquí se mide si pasa.
 *  - Datos que cambian debajo de otra pantalla mientras está abierta.
 *  - El socket de notificaciones con siete sesiones conectadas al mismo tiempo: el gateway
 *    verifica el token de cada una.
 *
 * Los 429 se cuentan APARTE de los errores: son una decisión de configuración del servidor,
 * no una pantalla rota, y mezclarlos ocultaría lo segundo detrás de lo primero.
 */

/** Por dónde se mueve cada rol, con las pantallas que de verdad usa en su día. */
const RECORRIDOS: Record<Rol, string[]> = {
  SUPER_ADMINISTRADOR: ['/admin', '/admin/usuarios', '/admin/rutas', '/admin/prestamos'],
  ADMIN: ['/admin', '/admin/clientes', '/admin/pagos', '/admin/notificaciones'],
  COORDINADOR: [
    '/coordinador',
    '/coordinador/rutas',
    '/coordinador/clientes',
    '/coordinador/cuentas-mora',
  ],
  SUPERVISOR: ['/supervisor', '/supervisor/rutas', '/supervisor/clientes'],
  COBRADOR: ['/cobranzas', '/cobranzas/clientes', '/cobranzas/historial'],
  CONTADOR: ['/contador', '/contador/caja', '/contador/movimientos'],
  PUNTO_DE_VENTA: ['/punto-de-venta', '/punto-de-venta/ventas'],
}

/** Cuántas vueltas da cada rol a su recorrido. */
const VUELTAS = 3

type Trabajador = {
  rol: Rol
  contexto: BrowserContext
  page: Page
  hallazgos: Hallazgo[]
  limitados: number
  visitadas: string[]
}

test.describe('Jornada simultánea', () => {
  test('los siete roles trabajan a la vez sin romper nada', async ({ browser }) => {
    test.setTimeout(25 * 60_000)

    const trabajadores: Trabajador[] = []

    // Siete contextos: sesiones de verdad independientes, como siete personas.
    for (const rol of Object.keys(USUARIOS) as Rol[]) {
      const contexto = await browser.newContext({
        locale: 'es-CO',
        timezoneId: 'America/Bogota',
      })
      const page = await contexto.newPage()
      const hallazgos = vigilar(page, rol)
      trabajadores.push({ rol, contexto, page, hallazgos, limitados: 0, visitadas: [] })
    }

    // Cuenta los 429 aparte, por lo dicho arriba.
    for (const t of trabajadores) {
      t.page.on('response', (res) => {
        if (res.status() === 429) t.limitados += 1
      })
    }

    try {
      // Todos entran AL MISMO TIEMPO: siete autenticaciones concurrentes.
      await Promise.all(trabajadores.map((t) => entrarComo(t.page, t.rol)))

      for (let vuelta = 1; vuelta <= VUELTAS; vuelta += 1) {
        await Promise.all(
          trabajadores.map(async (t) => {
            for (const pantalla of RECORRIDOS[t.rol]) {
              const antes = t.hallazgos.length
              let codigo = 0
              try {
                const res = await t.page.goto(pantalla, {
                  waitUntil: 'domcontentloaded',
                })
                codigo = res?.status() ?? 0
              } catch (error) {
                t.hallazgos.push({
                  pantalla,
                  tipo: 'navegacion',
                  detalle: String((error as Error).message).slice(0, 200),
                })
                continue
              }

              // Tiempo para que la pantalla pida sus datos y pinte, como un usuario que
              // la mira antes de seguir.
              await t.page.waitForTimeout(900)

              if (codigo >= 500) {
                t.hallazgos.push({
                  pantalla,
                  tipo: `http ${codigo}`,
                  detalle: `vuelta ${vuelta}`,
                })
              }
              if (await hayPantallaDeError(t.page)) {
                t.hallazgos.push({
                  pantalla,
                  tipo: 'pantalla de error',
                  detalle: `vuelta ${vuelta}`,
                })
              }
              for (const problema of await textoSospechoso(t.page)) {
                t.hallazgos.push({ pantalla, tipo: 'texto', detalle: problema })
              }
              // Marca la vuelta en lo que la vigilancia haya capturado aquí.
              for (const h of t.hallazgos.slice(antes)) {
                h.pantalla = `${pantalla} (v${vuelta})`
              }
              t.visitadas.push(pantalla)
            }
          }),
        )
      }
    } finally {
      const informe = trabajadores.map((t) => ({
        rol: t.rol,
        visitas: t.visitadas.length,
        limitados429: t.limitados,
        hallazgos: t.hallazgos,
      }))
      mkdirSync('test-results', { recursive: true })
      writeFileSync(
        'test-results/jornada-simultanea.json',
        JSON.stringify(informe, null, 1),
      )
      for (const t of informe) {
        console.log(
          `[${t.rol}] ${t.visitas} visitas · ${t.hallazgos.length} hallazgos · ${t.limitados429} respuestas 429`,
        )
      }
      await Promise.all(trabajadores.map((t) => t.contexto.close()))
    }

    // Los 429 NO tumban la prueba: se informan. Lo que la tumba es una pantalla rota.
    const problemas = trabajadores.flatMap((t) =>
      t.hallazgos.map((h) => `[${t.rol}] ${h.pantalla} {${h.tipo}} ${h.detalle}`),
    )
    expect(problemas, `Con los siete roles a la vez:\n${problemas.join('\n')}`).toEqual(
      [],
    )
  })
})
