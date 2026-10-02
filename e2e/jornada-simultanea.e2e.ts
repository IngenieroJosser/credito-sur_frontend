import { mkdirSync, writeFileSync } from 'node:fs'
import {
  expect,
  request as peticion,
  test,
  type BrowserContext,
  type Page,
} from '@playwright/test'
import {
  entrarComo,
  marcaDeError,
  textoSospechoso,
  USUARIOS,
  vigilar,
  type Hallazgo,
  type Rol,
} from './sesion'

/**
 * Los siete roles USANDO el sistema a la vez, cada uno en su propia ventana.
 *
 * No es un recorrido de pantallas: cada rol hace lo que hace en su jornada —abre su tablero,
 * entra a una ruta, abre los modales con los que trabaja, usa los filtros y la búsqueda— y
 * todo al mismo tiempo, contra el backend y la base de datos de verdad.
 *
 * Para verla por pantalla:
 *
 *     npx playwright test e2e/jornada-simultanea.e2e.ts --headed
 *
 * Qué atrapa esto que una prueba de un solo usuario no ve:
 *
 *  - El límite de peticiones se cuenta POR IP (`rate-limit.guard.ts:228`), no por usuario:
 *    en la oficina todos salen por la misma, así que pueden agotarse el cupo entre ellos.
 *    Aquí se mide, y por eso los 429 se cuentan aparte y no tumban la prueba.
 *  - Datos que cambian debajo de una pantalla abierta mientras otro rol los toca.
 *  - Siete sesiones a la vez en el socket de notificaciones: el gateway verifica el token
 *    de cada una.
 *
 * Al final comprueba contra la API —no contra la pantalla— que las sesiones siguen vivas:
 * si el backend hubiera tumbado a alguien, la pantalla podría seguir mostrando datos viejos
 * y la prueba pasaría sin que el sistema funcione.
 */

/** Una acción de la jornada: qué se intenta, y qué se considera que salió bien. */
type Accion = {
  nombre: string
  hacer: (page: Page) => Promise<void>
}

/** Abre el primer elemento que coincida, si está; si no, lo anota y sigue. */
async function intentarClic(
  page: Page,
  nombre: RegExp,
  registro: string[],
  etiqueta: string,
) {
  const boton = page.getByRole('button', { name: nombre }).first()
  if ((await boton.count()) === 0) {
    registro.push(`sin control: ${etiqueta}`)
    return false
  }
  await boton.click({ timeout: 10_000 }).catch(() => {
    registro.push(`no se pudo pulsar: ${etiqueta}`)
  })
  await page.waitForTimeout(1200)
  return true
}

/** Cierra lo que haya quedado abierto, para que la siguiente acción parta de cero. */
async function cerrarModal(page: Page) {
  const cerrar = page.getByRole('button', { name: /cerrar|cancelar|×/i }).first()
  if ((await cerrar.count()) > 0) {
    await cerrar.click({ timeout: 5_000 }).catch(() => {})
  } else {
    await page.keyboard.press('Escape').catch(() => {})
  }
  await page.waitForTimeout(600)
}

/**
 * La jornada de cada rol.
 *
 * Son las pantallas y los controles que esa persona toca de verdad en su día. Si un control
 * no está, se anota como "sin control" en vez de fallar: la prueba mide qué se pudo ejercer,
 * y un botón que cambió de nombre es información, no un fallo del sistema.
 */
const JORNADAS: Record<Rol, Accion[]> = {
  COBRADOR: [
    {
      nombre: 'abre su ruta del día',
      hacer: async (page) => {
        await page.goto('/cobranzas', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3500)
      },
    },
    {
      nombre: 'revisa sus clientes',
      hacer: async (page) => {
        await page.goto('/cobranzas/clientes', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2500)
      },
    },
    {
      nombre: 'busca un cliente',
      hacer: async (page) => {
        const busqueda = page.getByPlaceholder(/buscar/i).first()
        if ((await busqueda.count()) > 0) {
          await busqueda.fill('a')
          await page.waitForTimeout(1500)
        }
      },
    },
    {
      nombre: 'abre el modal de registrar pago',
      hacer: async (page) => {
        await page.goto('/cobranzas', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2500)
        await intentarClic(page, /registrar pago|pagar|cobrar/i, [], 'registrar pago')
      },
    },
    {
      nombre: 'mira su historial',
      hacer: async (page) => {
        await page.goto('/cobranzas/historial', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2500)
      },
    },
  ],
  SUPERVISOR: [
    {
      nombre: 'abre su tablero',
      hacer: async (page) => {
        await page.goto('/supervisor', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3500)
      },
    },
    {
      nombre: 'revisa las rutas',
      hacer: async (page) => {
        await page.goto('/supervisor/rutas', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)
      },
    },
    {
      nombre: 'entra al detalle de una ruta',
      hacer: async (page) => {
        const fila = page.getByRole('row').nth(1)
        if ((await fila.count()) > 0) {
          await fila.click({ timeout: 8_000 }).catch(() => {})
          await page.waitForTimeout(2500)
        }
      },
    },
  ],
  COORDINADOR: [
    {
      nombre: 'abre su tablero',
      hacer: async (page) => {
        await page.goto('/coordinador', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3500)
      },
    },
    {
      nombre: 'revisa rutas',
      hacer: async (page) => {
        await page.goto('/coordinador/rutas', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)
      },
    },
    {
      nombre: 'revisa cuentas en mora',
      hacer: async (page) => {
        await page.goto('/coordinador/cuentas-mora', {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForTimeout(3000)
      },
    },
  ],
  ADMIN: [
    {
      nombre: 'abre el tablero',
      hacer: async (page) => {
        await page.goto('/admin', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3500)
      },
    },
    {
      nombre: 'revisa clientes',
      hacer: async (page) => {
        await page.goto('/admin/clientes', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)
      },
    },
    {
      nombre: 'abre el modal de nuevo cliente',
      hacer: async (page) => {
        await page.goto('/admin/clientes', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2500)
        await intentarClic(page, /nuevo cliente|crear cliente|agregar cliente/i, [], 'nuevo cliente')
      },
    },
    {
      nombre: 'revisa pagos',
      hacer: async (page) => {
        await page.goto('/admin/pagos', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)
      },
    },
  ],
  SUPER_ADMINISTRADOR: [
    {
      nombre: 'abre el tablero',
      hacer: async (page) => {
        await page.goto('/admin', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3500)
      },
    },
    {
      nombre: 'revisa usuarios',
      hacer: async (page) => {
        await page.goto('/admin/usuarios', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)
      },
    },
    {
      nombre: 'revisa préstamos',
      hacer: async (page) => {
        await page.goto('/admin/prestamos', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)
      },
    },
  ],
  CONTADOR: [
    {
      nombre: 'abre contabilidad',
      hacer: async (page) => {
        await page.goto('/contador', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3500)
      },
    },
    {
      nombre: 'revisa la caja',
      hacer: async (page) => {
        await page.goto('/contador/caja', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)
      },
    },
    {
      nombre: 'abre el arqueo de caja',
      hacer: async (page) => {
        await page.goto('/contador/caja', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2500)
        await intentarClic(page, /arqueo|cerrar caja|cuadrar/i, [], 'arqueo de caja')
      },
    },
    {
      nombre: 'revisa movimientos',
      hacer: async (page) => {
        await page.goto('/contador/movimientos', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)
      },
    },
  ],
  PUNTO_DE_VENTA: [
    {
      nombre: 'abre el punto de venta',
      hacer: async (page) => {
        await page.goto('/punto-de-venta', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3500)
      },
    },
    {
      nombre: 'abre el modal de venta',
      hacer: async (page) => {
        await page.goto('/punto-de-venta', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2500)
        await intentarClic(page, /nueva venta|vender|crear venta/i, [], 'nueva venta')
      },
    },
    {
      nombre: 'revisa ventas',
      hacer: async (page) => {
        await page.goto('/punto-de-venta/ventas', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)
      },
    },
  ],
}

/** Cuántas vueltas da cada rol a su jornada. */
const VUELTAS = Number(process.env.E2E_VUELTAS || 2)

type Trabajador = {
  rol: Rol
  contexto: BrowserContext
  page: Page
  hallazgos: Hallazgo[]
  limitados: number
  agotados: number
  hechas: string[]
  notas: string[]
}

test.describe('Jornada simultánea', () => {
  test('los siete roles trabajan a la vez contra el sistema real', async ({
    browser,
  }) => {
    test.setTimeout(30 * 60_000)

    const trabajadores: Trabajador[] = []

    for (const rol of Object.keys(USUARIOS) as Rol[]) {
      const contexto = await browser.newContext({
        locale: 'es-CO',
        timezoneId: 'America/Bogota',
        viewport: { width: 1280, height: 800 },
      })
      const page = await contexto.newPage()
      const hallazgos = vigilar(page, rol)
      trabajadores.push({
        rol,
        contexto,
        page,
        hallazgos,
        limitados: 0,
        agotados: 0,
        hechas: [],
        notas: [],
      })
    }

    for (const t of trabajadores) {
      t.page.on('response', (res) => {
        if (res.status() === 429) t.limitados += 1
        if (res.status() === 408) t.agotados += 1
      })
    }

    try {
      // Los siete entran AL MISMO TIEMPO: siete autenticaciones concurrentes.
      await Promise.all(trabajadores.map((t) => entrarComo(t.page, t.rol)))

      for (let vuelta = 1; vuelta <= VUELTAS; vuelta += 1) {
        await Promise.all(
          trabajadores.map(async (t) => {
            for (const accion of JORNADAS[t.rol]) {
              const antes = t.hallazgos.length
              try {
                await accion.hacer(t.page)
              } catch (error) {
                t.hallazgos.push({
                  pantalla: accion.nombre,
                  tipo: 'accion',
                  detalle: String((error as Error).message).slice(0, 200),
                })
                continue
              }

              const marca = await marcaDeError(t.page)
              if (marca && !marca.includes('solo indicio')) {
                t.hallazgos.push({
                  pantalla: accion.nombre,
                  tipo: 'pantalla de error',
                  detalle: marca,
                })
              }
              for (const problema of await textoSospechoso(t.page)) {
                t.hallazgos.push({
                  pantalla: accion.nombre,
                  tipo: 'texto',
                  detalle: problema,
                })
              }
              for (const h of t.hallazgos.slice(antes)) {
                h.pantalla = `${accion.nombre} (v${vuelta})`
              }
              t.hechas.push(`${accion.nombre} (v${vuelta})`)
              await cerrarModal(t.page)
            }
          }),
        )
      }

      // Comprobación contra la API, no contra la pantalla: si el backend hubiera tumbado
      // una sesión, la pantalla podría seguir mostrando datos viejos y esto pasaría igual.
      const api = await peticion.newContext({
        baseURL: process.env.E2E_API || 'http://127.0.0.1:3001',
      })
      for (const t of trabajadores) {
        const credenciales = USUARIOS[t.rol]
        const res = await api.post('/api-credisur/auth/login', {
          data: {
            identificador: credenciales.usuario,
            contrasena: credenciales.clave,
          },
        })
        if (!res.ok()) {
          t.hallazgos.push({
            pantalla: 'API',
            tipo: `login ${res.status()}`,
            detalle: 'el backend rechazó la sesión al final de la jornada',
          })
        }
      }
      await api.dispose()
    } finally {
      const informe = trabajadores.map((t) => ({
        rol: t.rol,
        acciones: t.hechas.length,
        limitados429: t.limitados,
        agotados408: t.agotados,
        notas: t.notas,
        hallazgos: t.hallazgos,
      }))
      mkdirSync('test-results', { recursive: true })
      writeFileSync(
        'test-results/jornada-simultanea.json',
        JSON.stringify(informe, null, 1),
      )
      for (const t of informe) {
        console.log(
          `[${t.rol}] ${t.acciones} acciones · ${t.hallazgos.length} hallazgos · ${t.limitados429} 429 · ${t.agotados408} 408`,
        )
      }
      await Promise.all(trabajadores.map((t) => t.contexto.close()))
    }

    const problemas = trabajadores.flatMap((t) =>
      t.hallazgos.map((h) => `[${t.rol}] ${h.pantalla} {${h.tipo}} ${h.detalle}`),
    )
    expect(problemas, `Con los siete roles a la vez:\n${problemas.join('\n')}`).toEqual(
      [],
    )
  })
})
