import { mkdirSync } from 'node:fs'
import { test } from '@playwright/test'
import { entrarComo, type Rol } from './sesion'

/**
 * Capturas del estado ACTUAL, para poder comparar antes y después de un rediseño.
 *
 * Se guardan en `capturas/` y NO en `test-results/`: Playwright vacía `test-results/` al
 * empezar cada corrida, así que las capturas de una corrida se las llevaba la siguiente.
 *
 * No afirma nada ni comprueba nada: documenta. Se separan a propósito del resto de las
 * pruebas porque no fallan nunca; su salida son las imágenes de `capturas/`.
 *
 * El viewport móvil es el que importa para cobrador y supervisor: trabajan en la calle, con
 * una mano, y es donde el diseño tiene que rendir.
 */

const MOVIL = { width: 390, height: 844 } // iPhone 14, el tamaño más común en campo
const ESCRITORIO = { width: 1440, height: 900 }

const OBJETIVOS: Array<{ rol: Rol; pantallas: string[]; movil: boolean }> = [
  { rol: 'COBRADOR', pantallas: ['/cobranzas', '/cobranzas/clientes'], movil: true },
  { rol: 'SUPERVISOR', pantallas: ['/supervisor', '/supervisor/rutas'], movil: true },
  { rol: 'COORDINADOR', pantallas: ['/coordinador', '/coordinador/rutas'], movil: false },
  { rol: 'CONTADOR', pantallas: ['/contador', '/contador/caja'], movil: false },
]

test('captura el estado actual de las pantallas candidatas a rediseño', async ({
  browser,
}) => {
  test.setTimeout(15 * 60_000)
  mkdirSync('capturas', { recursive: true })

  for (const objetivo of OBJETIVOS) {
    const contexto = await browser.newContext({
      viewport: objetivo.movil ? MOVIL : ESCRITORIO,
      deviceScaleFactor: 2,
      isMobile: objetivo.movil,
      hasTouch: objetivo.movil,
      locale: 'es-CO',
      timezoneId: 'America/Bogota',
    })
    const page = await contexto.newPage()
    await entrarComo(page, objetivo.rol)

    for (const pantalla of objetivo.pantallas) {
      await page.goto(pantalla, { waitUntil: 'domcontentloaded' })
      // Espera a que la pantalla pida sus datos y pinte: una captura del esqueleto de carga
      // no serviría para juzgar el diseño.
      await page.waitForTimeout(3500)
      const nombre = `${objetivo.rol}${pantalla.replace(/\//g, '-')}${
        objetivo.movil ? '-movil' : '-escritorio'
      }`
      await page.screenshot({
        path: `capturas/${nombre}.png`,
        fullPage: true,
      })
      console.log(`capturada ${nombre}.png`)
    }
    await contexto.close()
  }
})
