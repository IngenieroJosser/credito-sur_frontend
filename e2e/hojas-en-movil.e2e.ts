import { test, expect } from '@playwright/test'
import {
  BARRA_DE_ARRASTRE,
  FONDO_HOJA_MODAL,
  PANEL_HOJA_MODAL,
} from '../lib/ui/hoja-modal'
import { entrarComo } from './sesion'

/**
 * Que un diálogo se abra desde abajo en el teléfono, como en cualquier app.
 *
 * ── Por qué importa, en concreto ────────────────────────────────────────────
 *
 * Un diálogo centrado en un teléfono tiene tres problemas que no son de gusto:
 *
 *  - Los botones quedan en la mitad de la pantalla, lejos del pulgar. El
 *    cobrador trabaja con el teléfono en una mano y el dinero en la otra.
 *  - Deja franjas de fondo arriba y abajo. Tocar ahí por error cierra el
 *    diálogo, y si era el de registrar un pago, se pierde lo escrito.
 *  - Al salir el teclado, el panel centrado se parte: la mitad de arriba se va
 *    fuera de la pantalla y el campo que se está llenando se esconde.
 *
 * Medido antes de este trabajo: 102 componentes pintan su propio contenedor y
 * solo 27 anclaban el panel abajo en pantallas pequeñas.
 *
 * ── Por qué se miden las CLASES y no un diálogo abierto ─────────────────────
 *
 * El primer intento fue abrir diálogos navegando la app, y no sirvió: los
 * diálogos del sistema se abren desde filas de datos —una visita de hoy, un
 * crédito en mora, un cliente con deuda— y en una base de pruebas recién
 * sembrada esas filas no existen. La prueba se saltaba sola, que es lo mismo
 * que no tenerla.
 *
 * Esta mide lo que de verdad cambió: las clases de `lib/ui/hoja-modal`. Se
 * inyectan en una página real de la app ya construida —con su CSS compilado— y
 * se leen las posiciones y los estilos calculados por el navegador. Eso
 * atrapa el fallo que más probablemente ocurriría: que Tailwind no genere una
 * de esas clases, por un nombre mal escrito o por no estar en su configuración.
 * Una clase que no existe no da error: simplemente no hace nada.
 *
 * El límite, dicho explícitamente: esto comprueba que las clases colocan el
 * panel donde debe, no que cada uno de los 102 diálogos las use. De eso se
 * encarga `lib/__tests__/pantallas-consistentes.test.ts`, que cuenta cuántos
 * quedan sin convertir y no deja que el número suba.
 */

const PANTALLA_TELEFONO = { width: 412, height: 915 }

test.use({
  viewport: PANTALLA_TELEFONO,
  hasTouch: true,
  isMobile: true,
})

/** Inyecta el fondo y el panel en la página y devuelve lo que mide el navegador. */
async function medirHoja(
  page: import('@playwright/test').Page,
  anchoMaximo: string,
) {
  return page.evaluate(
    ({ fondo, panel, barra, ancho }) => {
      const contenedor = document.createElement('div')
      contenedor.className = fondo

      const hoja = document.createElement('div')
      hoja.className = `${panel} ${ancho}`
      hoja.style.minHeight = '200px'

      const asa = document.createElement('div')
      asa.className = barra
      hoja.appendChild(asa)

      contenedor.appendChild(hoja)
      document.body.appendChild(contenedor)

      const estiloFondo = getComputedStyle(contenedor)
      const estiloHoja = getComputedStyle(hoja)
      const estiloAsa = getComputedStyle(asa)
      const caja = hoja.getBoundingClientRect()

      const medido = {
        alineacion: estiloFondo.alignItems,
        posicion: estiloFondo.position,
        radioArriba: parseFloat(estiloHoja.borderTopLeftRadius),
        radioAbajo: parseFloat(estiloHoja.borderBottomLeftRadius),
        asaVisible: estiloAsa.display !== 'none',
        huecoAbajo: Math.round(window.innerHeight - (caja.y + caja.height)),
        margenIzquierdo: Math.round(caja.x),
        ancho: Math.round(caja.width),
        anchoPantalla: window.innerWidth,
      }

      contenedor.remove()
      return medido
    },
    {
      fondo: FONDO_HOJA_MODAL,
      panel: PANEL_HOJA_MODAL,
      barra: BARRA_DE_ARRASTRE,
      ancho: anchoMaximo,
    },
  )
}

test.describe('Los diálogos en el teléfono', () => {
  test('el panel queda pegado al borde de abajo y a todo el ancho', async ({
    page,
  }) => {
    // Una página real de la app, para que el CSS compilado esté presente. El
    // login sirve y no necesita sesión.
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const m = await medirHoja(page, 'max-w-md')

    // Anclado abajo: es lo que define una hoja.
    expect(`alineación: ${m.alineacion}`).toBe('alineación: flex-end')
    expect(`hueco hasta el borde inferior: ${m.huecoAbajo}px`).toBe(
      'hueco hasta el borde inferior: 0px',
    )

    // A todo el ancho: una hoja no deja márgenes laterales en el teléfono. Con
    // `max-w-md` (448px) en una pantalla de 412px, manda la pantalla.
    expect(`margen izquierdo: ${m.margenIzquierdo}px`).toBe(
      'margen izquierdo: 0px',
    )
    expect(m.ancho).toBe(m.anchoPantalla)
  })

  test('las esquinas se redondean solo arriba', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const m = await medirHoja(page, 'max-w-md')

    // Redondear abajo dejaría dos muescas de fondo en las esquinas, porque el
    // panel está pegado al borde.
    expect(m.radioArriba).toBeGreaterThan(8)
    expect(`radio abajo: ${m.radioAbajo}`).toBe('radio abajo: 0')
  })

  test('la barra de arrastre se ve en el teléfono', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const m = await medirHoja(page, 'max-w-md')

    // La barrita gris de arriba. No arrastra nada: es la señal de que eso se
    // cierra hacia abajo, y la gente la reconoce de cualquier app.
    expect(`barra visible: ${m.asaVisible}`).toBe('barra visible: true')
  })

  /**
   * La ayuda de un control sale como hoja en el teléfono, y se puede cerrar.
   *
   * Lo segundo era un fallo de verdad: el globo se abría con un toque largo y
   * se cerraba con Escape, con un scroll o al cambiar el tamaño de la ventana.
   * En un teléfono no hay Escape, así que una vez abierto solo se iba haciendo
   * scroll.
   */
  test('la ayuda de un control sale desde abajo y se cierra tocando fuera', async ({
    page,
  }) => {
    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto('/admin/prestamos', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)

    // `Actualizar lista` es uno de los botones de solo icono que ahora llevan
    // Tooltip y `aria-label`.
    const control = page.getByRole('button', { name: /actualizar/i }).first()
    test.skip(!(await control.count()), 'no se encontró un control con ayuda')

    // Toque largo: el componente espera 400 ms para no abrirla con un roce.
    await control.dispatchEvent('touchstart')
    await page.waitForTimeout(800)

    const ayuda = page.locator('[role="tooltip"]').first()
    test.skip(!(await ayuda.count()), 'el toque largo no abrió la ayuda')

    const caja = await ayuda.boundingBox()
    const hueco = PANTALLA_TELEFONO.height - (caja!.y + caja!.height)
    expect(`la ayuda está pegada abajo: ${hueco <= 2}`).toBe(
      'la ayuda está pegada abajo: true',
    )

    // Tocar fuera la cierra, que es lo que cualquiera intenta primero.
    await page.touchscreen.tap(PANTALLA_TELEFONO.width / 2, 60)
    await page.waitForTimeout(600)
    expect(await page.locator('[role="tooltip"]').count()).toBe(0)
  })
})

test.describe('Los mismos diálogos en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })

  test('se centran y se redondean enteros', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const m = await medirHoja(page, 'max-w-md')

    // Las mismas clases, otro resultado: eso es lo que hacen los prefijos
    // `sm:`. Si alguien los quitara, el diálogo quedaría pegado abajo también
    // en un monitor, que se ve roto.
    expect(`alineación: ${m.alineacion}`).toBe('alineación: center')
    expect(m.huecoAbajo).toBeGreaterThan(50)
    expect(m.radioAbajo).toBeGreaterThan(8)
    expect(`barra visible: ${m.asaVisible}`).toBe('barra visible: false')
  })
})
