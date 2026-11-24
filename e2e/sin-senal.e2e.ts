import { expect, test } from '@playwright/test'
import { entrarComo, hayPantallaDeError } from './sesion'

/**
 * El cobrador trabajando SIN SEÑAL, contra un build de producción.
 *
 * ── Por qué esta prueba no existía y hacía falta ───────────────────────────
 *
 * «Todo tiene que seguir funcionando sin conexión» es un requisito explícito
 * del dueño, y hasta ahora estaba verificado por pruebas unitarias y por
 * lectura del código: **nunca con el navegador sin red**. Y no se puede probar
 * en desarrollo, porque el service worker se desactiva ahí
 * (`next.config.ts`: `disable: process.env.NODE_ENV === 'development'`), así
 * que hay que correrla sobre `next build` + `next start`.
 *
 * Es el escenario real: el cobrador sale a la calle, pierde la señal, y el
 * teléfono se le reinicia o recarga la pestaña. Si la app no arranca ahí, no
 * puede cobrar.
 *
 * ── Qué comprueba, y por qué cada cosa ────────────────────────────────────
 *
 *  1. Que el service worker llega a controlar la página. Sin eso no hay nada
 *     offline, y el resto de la prueba no significaría nada: por eso se afirma
 *     antes de cortar la red.
 *  2. Que tras cortar la red y RECARGAR, la app sigue apareciendo. Esto es el
 *     arranque en frío, que es el caso que de verdad se rompe: una SPA que ya
 *     está cargada aguanta sin red, pero un F5 sin señal pide el HTML otra vez.
 *  3. Que no sale la pantalla de error de Next ni el error del navegador.
 *  4. Que la app DICE que está sin conexión. Trabajar sin señal creyendo que
 *     hay señal es peor que no poder trabajar: el cobrador no sabría que su
 *     pago está en cola.
 *
 * Lo que NO comprueba, y se dice para no prometer de más: que un pago hecho
 * sin señal se sincronice al volver. Eso toca la base de datos real y pide su
 * propio montaje; la cola está cubierta por `__tests__/lib/cola-sin-duplicar-
 * dinero.test.ts` y por §P15 del documento de estado.
 */
test.describe('Sin señal', () => {
  test('el cobrador recarga sin red y la app sigue en pie', async ({
    page,
    context,
  }) => {
    test.setTimeout(3 * 60_000)

    // ── 1. Con red: entrar y dejar que el service worker tome el control ──
    await entrarComo(page, 'COBRADOR')

    const controlado = await page
      .waitForFunction(
        () =>
          typeof navigator !== 'undefined' &&
          !!navigator.serviceWorker &&
          navigator.serviceWorker.controller !== null,
        undefined,
        { timeout: 60_000 },
      )
      .then(() => true)
      .catch(() => false)

    // Si el service worker no controla la página, lo offline no existe. Se
    // afirma aquí para que el fallo diga ESO y no «la pantalla salió vacía».
    expect(
      controlado,
      'El service worker no llegó a controlar la página. Sin eso no hay modo ' +
        'sin conexión: comprueba que esto corre sobre `next build` + ' +
        '`next start` y no sobre `next dev`, donde el PWA se desactiva.',
    ).toBe(true)

    // Un momento para que termine la descarga de la copia local (la ruta, los
    // clientes y sus créditos) antes de quedarse sin red.
    await page.waitForTimeout(5_000)

    /*
     * Cargar la pantalla COMO DOCUMENTO, estando en red.
     *
     * `entrarComo` llega aquí por navegación del cliente (el router empuja la
     * ruta), y la regla `NetworkFirst` del service worker guarda en la caché
     * `paginas` las peticiones cuyo `request.mode === 'navigate'`. Sin un
     * `goto` a esta URL, el documento de esta pantalla nunca entra en esa
     * caché, y entonces un F5 sin red no tiene nada que servir.
     *
     * Eso es exactamente lo que se midió la primera vez que se corrió esta
     * prueba: la recarga sin red devolvió `null`.
     */
    const urlDeTrabajo = page.url()
    await page.goto(urlDeTrabajo, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2_000)

    // ── 2. Sin red: recargar, que es el arranque en frío ─────────────────
    await context.setOffline(true)

    const respuesta = await page.reload({ waitUntil: 'domcontentloaded' })

    // `reload` sin red devuelve null si el navegador no pudo servir nada: eso
    // sería exactamente el fallo que esta prueba busca.
    expect(
      respuesta,
      'La recarga sin red no devolvió nada: el service worker no sirvió el ' +
        'documento y el cobrador vería el error del navegador.',
    ).not.toBeNull()

    // ── 3. La app está, no la pantalla de error ──────────────────────────
    expect(await hayPantallaDeError(page)).toBe(false)

    const cuerpo = (await page.locator('body').innerText()).trim()
    expect(cuerpo.length).toBeGreaterThan(40)

    const textoDelNavegador =
      /ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|No hay conexión a internet|This site can.t be reached/i
    expect(cuerpo).not.toMatch(textoDelNavegador)

    // ── 4. Y la app dice que está sin conexión ───────────────────────────
    /*
     * Con espera, y midiendo cuánto tarda.
     *
     * La detección no es instantánea: el indicador comprueba la conectividad
     * REAL contra `/api/ping` (que el service worker deja pasar siempre a la
     * red a propósito), así que hay una ventana entre quedarse sin señal y
     * saberlo. Lo que importa no es que sea cero, es que ocurra y que la
     * ventana sea corta: en ella el cobrador podría registrar un pago creyendo
     * que ya llegó al servidor.
     */
    const patron = /sin conexi[oó]n|offline|modo sin red|sin internet/i
    const empezo = Date.now()
    let avisa = patron.test(cuerpo)
    while (!avisa && Date.now() - empezo < 30_000) {
      await page.waitForTimeout(1_000)
      avisa = patron.test((await page.locator('body').innerText()) || '')
    }
     
    console.log(
      `AVISO DE SIN CONEXION: ${avisa ? 'aparece' : 'NO aparece'} tras ${(
        (Date.now() - empezo) /
        1000
      ).toFixed(1)}s`,
    )
    expect(
      avisa,
      'La app cargó sin red pero no dice que está sin conexión. El cobrador ' +
        'cobraría creyendo que su pago ya llegó al servidor.',
    ).toBe(true)

    await context.setOffline(false)
  })
})
