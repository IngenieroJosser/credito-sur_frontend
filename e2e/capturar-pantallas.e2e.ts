import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { test } from '@playwright/test'
import { PANTALLAS_ESTATICAS } from './pantallas.generado'
import { entrarComo, USUARIOS, type Rol } from './sesion'

/**
 * Capturas de todas las pantallas, con los siete roles, en móvil y escritorio.
 *
 * Para mirar el sistema entero de un vistazo y para comparar el antes y el
 * después de cada cambio de interfaz.
 *
 * Cómo se usa:
 *
 *     CAPTURAS=antes   npx playwright test e2e/capturar-pantallas.e2e.ts
 *     CAPTURAS=despues npx playwright test e2e/capturar-pantallas.e2e.ts
 *
 * Las imágenes van FUERA de los dos repositorios, a
 * `Creditos del Sur/capturas-ux/<antes|despues>/<rol>/<movil|escritorio>/`,
 * así que no entran en git ni engordan el historial. La carpeta se puede
 * borrar entera sin consecuencias.
 *
 * No corre con el resto de la suite: no comprueba nada, solo retrata. Se queda
 * fuera porque tarda —son siete sesiones y cientos de páginas— y porque
 * ensuciaría el informe de las pruebas que sí afirman algo.
 */

/** Dónde se guardan. Hermana de los dos repos, fuera de git. */
const RAIZ_CAPTURAS = path.join(
  process.cwd(),
  '..',
  'capturas-ux',
  process.env.CAPTURAS || 'antes',
)

const TAMANOS = [
  // El teléfono del cobrador, que es donde más se usa el sistema.
  { nombre: 'movil', viewport: { width: 390, height: 844 } },
  { nombre: 'escritorio', viewport: { width: 1440, height: 900 } },
] as const

/** Pantallas que no se retratan, con el motivo. */
const EXCLUIDAS = new Map<string, string>([
  ['/test', 'pantalla de pruebas del propio desarrollo'],
  ['/logout', 'cierra la sesión y deja el recorrido sin ella'],
])

/** `/admin/clientes/nuevo` -> `admin-clientes-nuevo`. */
function nombreDeArchivo(pantalla: string): string {
  const limpio = pantalla.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9]+/g, '-')
  return limpio || 'inicio'
}

const ROLES = Object.keys(USUARIOS) as Rol[]

for (const rol of ROLES) {
  for (const tamano of TAMANOS) {
    test(`capturas ${rol} en ${tamano.nombre}`, async ({ page }) => {
      // Generoso: son más de cien páginas por sesión, y cada una espera a que
      // la red se calme antes de la foto.
      test.setTimeout(30 * 60 * 1000)

      await page.setViewportSize(tamano.viewport)
      await entrarComo(page, rol)

      const carpeta = path.join(RAIZ_CAPTURAS, rol.toLowerCase(), tamano.nombre)
      mkdirSync(carpeta, { recursive: true })

      let hechas = 0
      let saltadas = 0

      for (const pantalla of PANTALLAS_ESTATICAS) {
        if (EXCLUIDAS.has(pantalla)) continue

        try {
          await page.goto(pantalla, { waitUntil: 'domcontentloaded' })
          // La red se calma o pasan 6 s: hay pantallas que mantienen un socket
          // abierto y con `networkidle` a secas no llegarían nunca.
          await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})

          await page.screenshot({
            path: path.join(carpeta, `${nombreDeArchivo(pantalla)}.png`),
            fullPage: true,
          })
          hechas += 1
        } catch {
          // Una pantalla que no se deja retratar no corta el recorrido: lo que
          // importa es tener el resto. Las que fallen se ven por ausencia.
          saltadas += 1
        }
      }

      console.log(
        `[${rol} / ${tamano.nombre}] ${hechas} capturas, ${saltadas} saltadas -> ${carpeta}`,
      )
    })
  }
}
