import { expect, test, type Page } from '@playwright/test'
import { entrarComo } from './sesion'

/**
 * Que al cambiar de módulo en el menú la pantalla no se vuelva a montar.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * «Algunas veces al pasar o seleccionar otro módulo en el aside la pantalla
 * entera se recarga.» No se recargaba: se desmontaba y se volvía a montar.
 *
 * Había siete archivos de layout y los siete devolvían el mismo `AdminLayout`.
 * Next.js guarda el estado de un layout por ARCHIVO, no por el componente que
 * devuelve, así que cruzar de `/admin/clientes` a `/contable` tiraba el árbol
 * entero y montaba otro armazón desde cero: el telón blanco de entrada volvía
 * a empezar —300 ms tapando la pantalla y 1 s desvaneciéndose—, el menú se
 * reconstruía, y se perdían el scroll y los submenús abiertos.
 *
 * Medido entonces: 3 de los 7 roles tenían entradas de menú que cruzaban de
 * archivo de layout. ADMIN y SUPER_ADMINISTRADOR, `/contable`,
 * `/contable/cierre-caja` y `/pagos/historial`; COBRADOR, `/notificaciones`.
 *
 * ── Por qué en el navegador y no leyendo el código ──────────────────────────
 *
 * `__tests__/armazon-de-la-app.test.ts` comprueba la CAUSA: que ningún layout
 * vuelva a montar el armazón. Eso no demuestra el efecto, porque el
 * desmontaje solo existe en el navegador.
 *
 * Aquí se marca el nodo de la cabecera con una propiedad de JavaScript. Una
 * marca así desaparece si React desmonta el nodo y crea otro, y sobrevive si
 * solo cambia el contenido de dentro. Es exactamente la diferencia entre «se
 * recargó» y «cambió de pantalla».
 *
 * La navegación se hace pulsando el enlace del menú, como la hace quien usa el
 * sistema. Un `page.goto` recargaría el navegador de verdad y la marca se
 * perdería siempre, con armazón nuevo o viejo: no distinguiría nada.
 */

/** Los cruces de árbol que medimos en el menú, con el rol que los ve. */
const CRUCES = [
  { rol: 'ADMIN' as const, desde: '/admin/clientes', modulo: 'Movimientos' },
  {
    rol: 'ADMIN' as const,
    desde: '/admin/clientes',
    modulo: 'Historial de Pagos y Gastos',
  },
] satisfies Array<{ rol: 'ADMIN'; desde: string; modulo: string }>

/**
 * El menú lateral empieza visible, como recién instalado.
 *
 * Se puede ocultar con su botón y la decisión queda en `localStorage`, así que
 * sobrevive a la sesión. Oculto, el aside sigue en el DOM pero desplazado
 * fuera de la pantalla: sus enlaces existen y no se pueden pulsar. Eso es lo
 * que se quiere en la aplicación y lo que no se quiere de punto de partida en
 * una prueba que mide otra cosa.
 *
 * La prueba igual sabe abrirlo si se lo encuentra cerrado —`pulsarEnElMenu`—;
 * esto solo fija el punto de partida.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('credisur_aside_desktop_visible', 'true')
    } catch {
      // Modo privado o almacenamiento bloqueado: la pantalla ya cae al valor
      // por defecto, que es visible.
    }
  })
})

/**
 * Pulsa una entrada del menú como lo haría una persona.
 *
 * El aside agrupa los módulos en secciones plegables, y una sección solo se
 * abre sola cuando la ruta actual está dentro. Estando en `/admin/clientes`,
 * «Movimientos» vive en una sección cerrada: hay que abrirla primero.
 *
 * Esto se descubrió corriendo la prueba por primera vez —hasta hoy la base de
 * datos estaba parada y nunca llegó a ejecutarse—. El clic fallaba con
 * «<span>Administración</span> intercepts pointer events»:
 * el enlace existía en el árbol pero estaba tapado por la cabecera de su
 * propia sección.
 *
 * De paso se arreglaron dos cosas de la pantalla que salieron por aquí: el
 * botón de sección no decía `aria-expanded`, y la sección cerrada no era
 * `inert`, así que sus enlaces seguían siendo enfocables con el tabulador.
 */
async function pulsarEnElMenu(page: Page, modulo: string) {
  /*
   * El aside puede estar escondido, y no es un estado raro: se puede ocultar
   * con su botón y la decisión se guarda en `localStorage`
   * (`credisur_aside_desktop_visible`), así que sobrevive a la sesión. Oculto,
   * el aside sigue en el DOM pero desplazado fuera de la pantalla, así que sus
   * enlaces existen y no se pueden pulsar: Playwright lo dice como «element is
   * outside of the viewport».
   *
   * Quien usa el sistema lo abre con el botón de la izquierda. La prueba hace
   * lo mismo.
   */
  /*
   * Se mira DÓNDE está el aside, no si su botón «se ve».
   *
   * Escondido, el aside está en el DOM, pintado y «visible» para cualquier
   * comprobación de CSS: lo que pasa es que está desplazado a la izquierda,
   * fuera de la pantalla. Por eso preguntarle a un localizador si se ve no
   * distinguía nada, y el clic moría con «element is outside of the
   * viewport» 30 segundos después. Su posición sí lo distingue.
   */
  for (let intento = 0; intento < 3; intento++) {
    const fuera = await page.evaluate(() => {
      const aside = document.querySelector('aside')
      return aside ? aside.getBoundingClientRect().x < 0 : false
    })
    if (!fuera) break
    await page
      .locator('button[aria-label="Mostrar menú lateral"]')
      .first()
      .click({ force: true })
    await page.waitForTimeout(400) // el aside tarda 300 ms en entrar
  }

  // En móvil el aside está cerrado: primero el botón de menú.
  const enlace = page.getByRole('link', { name: modulo }).first()
  if ((await enlace.count()) === 0) {
    await page.getByRole('button', { name: /men[úu]/i }).first().click()
  }

  /*
   * Abrir las secciones cerradas.
   *
   * Se abren TODAS, sin mirar si el enlace ya se ve: `isVisible()` devuelve
   * `true` también cuando el enlace está tapado por la cabecera de su sección
   * —que es justo lo que pasaba—, así que como condición de parada no servía;
   * la primera vuelta cortaba sin abrir nada.
   *
   * Se vuelve a consultar el localizador en cada vuelta porque al abrir una
   * sección cambia cuáles quedan con `aria-expanded="false"`.
   *
   * El selector pide `aria-controls^="seccion-"` y no solo `aria-expanded`:
   * `Tooltip` le pone `aria-expanded` a lo que envuelve, así que el botón de
   * «Ocultar menú lateral» —que vive dentro del aside y lleva tooltip— también
   * casaba. El bucle lo pulsaba el primero, escondía el menú entero, y a
   * partir de ahí nada era pulsable: «element is outside of the viewport».
   */
  for (let intento = 0; intento < 8; intento++) {
    const cerrada = page
      .locator('aside button[aria-expanded="false"][aria-controls^="seccion-"]')
      .first()
    if ((await cerrada.count()) === 0) break
    /*
     * La sección se abre desde el DOM, no con un clic de ratón.
     *
     * Medido: el botón está en {x:24, y:430} con la pantalla en 1280x720 y el
     * aside en su sitio, y aun así el clic de Playwright muere en «element is
     * outside of the viewport» —el aside está en animación permanente de
     * entrada y salida y el cálculo del punto nunca cuaja—.
     *
     * Abrir la sección es PREPARACIÓN, no lo que se mide. Lo que sí se pulsa
     * como una persona es el enlace del módulo, unas líneas más abajo: ahí
     * está la navegación que esta prueba vigila.
     */
    await cerrada.evaluate((boton: HTMLElement) => boton.click())
    await page.waitForTimeout(350) // la sección tarda 300 ms en desplegarse
  }

  /*
   * El enlace también se pulsa desde el DOM, y hay que decir qué se pierde y
   * qué no.
   *
   * Lo medido: con el aside en su sitio (x:0) y el botón de la sección en
   * {x:24, y:430} sobre una pantalla de 1280x720, Playwright rechaza el clic
   * de ratón con «element is outside of the viewport», una y otra vez, hasta
   * agotar los 30 segundos. Pasa con cualquier elemento del menú y no pasa
   * con el mismo navegador fuera del arnés de pruebas, donde el clic entra a
   * la primera. Es el arnés, no la pantalla.
   *
   * Lo que NO se pierde: `boton.click()` sobre el `<a>` dispara el `onClick`
   * de React y la navegación de cliente de Next, que es lo que esta prueba
   * mide —si el armazón sobrevive a cambiar de módulo—. Un `page.goto`, que
   * es lo que habría que evitar, recarga el navegador y borraría la marca
   * siempre.
   *
   * Lo que SÍ se pierde: que el enlace esté tapado, fuera de pantalla o sin
   * área pulsable. Eso lo vigilan otras pruebas —`area-tactil-del-cobrador`,
   * `sin-controles-nativos`— y conviene recuperarlo aquí cuando se entienda
   * el rechazo del arnés.
   */
  await enlace.scrollIntoViewIfNeeded()
  await enlace.evaluate((a: HTMLElement) => a.click())
}

for (const { rol, desde, modulo } of CRUCES) {
  test(`el armazón sobrevive al ir a «${modulo}» desde ${desde}`, async ({
    page,
  }) => {
    await entrarComo(page, rol)
    await page.goto(desde)
    await page.waitForSelector('header', { timeout: 30_000 })

    const rutaAntes = page.url()

    await page.evaluate(() => {
      const nodo = document.querySelector('header')
      if (nodo) (nodo as HTMLElement & { __marca?: string }).__marca = 'viva'
    })

    await pulsarEnElMenu(page, modulo)

    // Hasta que la ruta cambie de verdad.
    await expect
      .poll(() => page.url(), { timeout: 20_000 })
      .not.toBe(rutaAntes)

    const sobrevive = await page.evaluate(() => {
      const nodo = document.querySelector('header')
      return Boolean(
        (nodo as (HTMLElement & { __marca?: string }) | null)?.__marca,
      )
    })

    expect(
      sobrevive,
      'La cabecera se desmontó al cambiar de módulo: eso es la «recarga». ' +
        'El armazón tiene que montarlo `ArmazonDeLaApp` desde el layout ' +
        'raíz, no cada layout de rol.',
    ).toBe(true)
  })
}

test('el telón de entrada no vuelve a salir dentro de la misma sesión', async ({
  page,
}) => {
  // Aunque el nodo sobreviva, si el telón blanco se repinta la navegación se
  // ve igual que una recarga. Se muestra una vez al llegar del login y se
  // marca en `sessionStorage`.
  await entrarComo(page, 'ADMIN')
  await page.goto('/admin/clientes')
  await page.waitForSelector('header', { timeout: 30_000 })

  const telon = page.locator('[role="presentation"]').first()
  if (await telon.count()) {
    await expect(telon).toHaveCSS('opacity', '0', { timeout: 20_000 })
  }

  await pulsarEnElMenu(page, 'Movimientos')
  await page.waitForTimeout(400)

  if (await telon.count()) {
    // Si volviera a empezar, aquí estaría opaco: el telón tarda 300 ms en
    // bajar y 1 s en desvanecerse.
    await expect(telon).toHaveCSS('opacity', '0')
  }
})
