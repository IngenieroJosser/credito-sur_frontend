import { test, expect, type Page } from '@playwright/test'
import { entrarComo, vigilar } from './sesion'

/**
 * Los formularios con alguien que no escribe lo que se espera.
 *
 * Las otras pruebas de caos atacan la API. Esta se queda en la pantalla, porque
 * hay un fallo que solo existe ahí y es el que más desgasta a quien usa el
 * sistema todos los días: **darle a guardar y que no pase nada**. No un error,
 * no un aviso: nada. La persona no sabe si se guardó, así que le da otra vez, y
 * en un sistema de dinero eso acaba en dos registros.
 *
 * Así que lo que se exige aquí no es que el sistema acepte la basura —no debe—,
 * sino que **diga algo** cuando la rechaza, y que no se rompa. Son dos
 * afirmaciones deliberadamente modestas, y cualquier cosa más fuerte sería
 * imponer un diseño: si el aviso sale arriba, abajo o en rojo es decisión de
 * producto, no de una prueba.
 *
 * Los casos no son inventados de la nada. Son lo que de verdad llega a un
 * formulario de créditos: el documento con puntos como lo trae la cédula, el
 * teléfono con prefijo y guiones, el nombre en mayúsculas con tilde, la
 * dirección entera pegada desde WhatsApp, y el campo de dinero con letras.
 */

/** Una señal de que la pantalla se rompió, no de que dijo «no». */
const SINTOMAS_DE_ROTURA = [
  /Application error/i,
  /Unhandled Runtime Error/i,
  /TypeError: .* is not a function/i,
  /Cannot read propert(y|ies) of (undefined|null)/i,
  /ChunkLoadError/i,
]

/**
 * ¿La pantalla dijo algo después de intentar guardar?
 *
 * Se busca cualquier cosa que una persona reconocería como respuesta: un aviso
 * del navegador por un campo `required`, un texto de error, un `role="alert"`,
 * o haber navegado a otra pantalla (que es la respuesta «se guardó»).
 *
 * Lo que NO cuenta: seguir en el mismo sitio, con el mismo texto, sin nada
 * nuevo. Eso es el silencio que se persigue.
 */
async function dijoAlgo(
  page: Page,
  textoAntes: string,
  rutaAntes: string,
): Promise<{ hablo: boolean; que: string }> {
  if (new URL(page.url()).pathname !== rutaAntes) {
    return { hablo: true, que: `navegó a ${new URL(page.url()).pathname}` }
  }

  // Validación nativa del navegador: un `required` vacío o un patrón que no
  // cuadra. Es un aviso de verdad, aunque no lo haya escrito la app.
  const invalido = await page
    .locator('input:invalid, select:invalid, textarea:invalid')
    .count()
  if (invalido > 0) {
    return { hablo: true, que: `${invalido} campo(s) marcados por el navegador` }
  }

  const alertas = await page.locator('[role="alert"]').allInnerTexts()
  const conTexto = alertas.map((a) => a.trim()).filter(Boolean)
  if (conTexto.length) {
    return { hablo: true, que: `alert: ${conTexto[0].slice(0, 80)}` }
  }

  const textoDespues = (await page.locator('body').innerText().catch(() => ''))
    .replace(/\s+/g, ' ')
    .trim()
  if (textoDespues !== textoAntes) {
    // Algo cambió en la pantalla. Se intenta nombrar qué, para el informe.
    const nuevo = textoDespues
      .split(' ')
      .filter((p) => !textoAntes.includes(p))
      .join(' ')
      .slice(0, 80)
    return { hablo: true, que: `cambió la pantalla${nuevo ? `: ${nuevo}` : ''}` }
  }

  return { hablo: false, que: 'nada: mismo sitio, mismo texto' }
}

/** El botón de guardar de un formulario, por lo que dice. */
function botonDeGuardar(page: Page) {
  return page
    .getByRole('button', {
      name: /guardar|crear|registrar|continuar|siguiente|aceptar/i,
    })
    .first()
}

test.describe('Formularios con quien no escribe lo que se espera', () => {
  test.describe.configure({ mode: 'serial' })

  /**
   * Darle a guardar sin escribir nada.
   *
   * Es lo primero que hace cualquiera para ver qué pide el formulario. La
   * respuesta no puede ser el silencio.
   */
  test('un formulario vacío no se guarda en silencio', async ({ page }) => {
    await entrarComo(page, 'SUPER_ADMINISTRADOR')

    const silenciosos: string[] = []

    for (const ruta of [
      '/admin/clientes/nuevo',
      '/admin/users/nuevo',
      '/admin/articulos/nuevo',
    ]) {
      const hallazgos = vigilar(page, ruta)
      await page.goto(ruta, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2500)

      const boton = botonDeGuardar(page)
      if (!(await boton.count())) {
        // No hay botón reconocible: no es un fallo de la pantalla, es que esta
        // prueba no sabe operarla. Se dice, en vez de dar un falso verde.
        test.info().annotations.push({
          type: 'sin-boton',
          description: `${ruta}: no se encontró botón de guardar`,
        })
        continue
      }

      const textoAntes = (await page.locator('body').innerText())
        .replace(/\s+/g, ' ')
        .trim()
      const rutaAntes = new URL(page.url()).pathname

      await boton.click({ force: true }).catch(() => undefined)
      await page.waitForTimeout(2500)

      const texto = await page.locator('body').innerText().catch(() => '')
      const roto = SINTOMAS_DE_ROTURA.find((r) => r.test(texto))
      if (roto) silenciosos.push(`${ruta}: la pantalla se rompió (${roto})`)

      const { hablo, que } = await dijoAlgo(page, textoAntes, rutaAntes)
      if (!hablo) silenciosos.push(`${ruta}: no dijo ${que}`)

      test.info().annotations.push({
        type: 'vacio',
        description: `${ruta}: ${hablo ? que : 'SILENCIO'}`,
      })

      const reventones = hallazgos.filter((h) => h.tipo === 'excepcion')
      if (reventones.length) {
        silenciosos.push(`${ruta}: excepción ${reventones[0].detalle}`)
      }
    }

    expect(`silenciosos: ${silenciosos.join(' | ') || 'ninguno'}`).toBe(
      'silenciosos: ninguno',
    )
  })

  /**
   * Escribir lo que escribe la gente de verdad.
   *
   * El documento tal como viene impreso en la cédula —con puntos—, el teléfono
   * con prefijo de país y guiones, el nombre a gritos y con tilde, y la
   * dirección entera pegada de un mensaje. Nada de esto es un ataque: es cómo
   * la gente copia los datos del papel que tiene delante.
   *
   * Lo que se exige sigue siendo lo mismo: que no se rompa y que diga algo.
   * Que ACEPTE estos valores limpiándolos es lo deseable, y por eso se anota
   * aparte qué hizo con cada uno, para poder leerlo en el informe.
   */
  test('los datos como los escribe la gente no rompen el formulario', async ({
    page,
  }) => {
    await entrarComo(page, 'SUPER_ADMINISTRADOR')

    const hallazgos = vigilar(page, 'clientes/nuevo con datos reales')
    await page.goto('/admin/clientes/nuevo', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const escribir = async (placeholder: RegExp, valor: string) => {
      const campo = page.getByPlaceholder(placeholder).first()
      if (await campo.count()) await campo.fill(valor)
    }

    // El documento con los puntos de la cédula, el teléfono con prefijo, el
    // nombre en mayúsculas con tilde y apóstrofo, y la dirección pegada.
    await escribir(/1\.020|documento|c[eé]dula/i, '1.020.345.678')
    await escribir(/310 123|tel[eé]fono/i, '+57 (310) 123-4567')
    await escribir(/Juan Carlos|nombres?/i, "MARÍA JOSÉ D'ANGELO")
    await escribir(/P[eé]rez|apellidos?/i, 'ÑÁÑEZ MOYA')
    await escribir(
      /Calle, n[uú]mero|direcci[oó]n/i,
      'Hola buenas, mi casa es la de la esquina frente a la tienda de doña Rosa, barrio El Carmen, al lado del poste azul. Gracias!!!',
    )
    await escribir(/cliente@ejemplo|correo|email/i, 'MARIA JOSE@ejemplo .com')

    const textoAntes = (await page.locator('body').innerText())
      .replace(/\s+/g, ' ')
      .trim()
    const rutaAntes = new URL(page.url()).pathname

    const boton = botonDeGuardar(page)
    test.skip(!(await boton.count()), 'no se encontró botón de guardar')
    await boton.click({ force: true })
    await page.waitForTimeout(4000)

    const texto = await page.locator('body').innerText().catch(() => '')
    const problemas: string[] = []

    const roto = SINTOMAS_DE_ROTURA.find((r) => r.test(texto))
    if (roto) problemas.push(`la pantalla se rompió (${roto})`)

    const { hablo, que } = await dijoAlgo(page, textoAntes, rutaAntes)
    if (!hablo) problemas.push(`no dijo ${que}`)
    test.info().annotations.push({ type: 'datos-reales', description: que })

    const reventones = hallazgos.filter((h) => h.tipo === 'excepcion')
    problemas.push(...reventones.map((r) => `excepción: ${r.detalle}`))

    const cincos = hallazgos.filter((h) => h.tipo.startsWith('http 5'))
    problemas.push(...cincos.map((c) => `${c.tipo} en ${c.detalle}`))

    expect(`problemas: ${problemas.join(' | ') || 'ninguno'}`).toBe(
      'problemas: ninguno',
    )
  })

  /**
   * Recargar a mitad de escribir.
   *
   * Pasa solo: el móvil gira, la app se actualiza, alguien le da a F5 porque
   * «se quedó pegado». Lo que no puede pasar es que la pantalla vuelva rota.
   */
  test('recargar a mitad de llenar un formulario no lo rompe', async ({
    page,
  }) => {
    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto('/admin/clientes/nuevo', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const campo = page.getByPlaceholder(/Juan Carlos|nombres?/i).first()
    if (await campo.count()) await campo.fill('A medio escribir')

    const hallazgos = vigilar(page, 'recarga a mitad')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const texto = await page.locator('body').innerText().catch(() => '')
    const roto = SINTOMAS_DE_ROTURA.find((r) => r.test(texto))
    const reventones = hallazgos.filter((h) => h.tipo === 'excepcion')

    // Se anota si el formulario conservó lo escrito, sin exigirlo: perderlo es
    // molesto pero es una decisión de producto, no un fallo.
    const quedo = (await campo.count())
      ? await campo.inputValue().catch(() => '')
      : ''
    test.info().annotations.push({
      type: 'recarga',
      description: quedo ? 'conservó lo escrito' : 'se perdió lo escrito',
    })

    expect(
      `roto: ${roto ? String(roto) : 'no'} | excepciones: ${reventones.length}`,
    ).toBe('roto: no | excepciones: 0')
  })

  /**
   * Darle dos veces al botón de guardar.
   *
   * El doble clic de quien no está seguro de haber pulsado. Lo que se exige es
   * que no se creen dos registros: se cuenta antes y después.
   */
  test('darle dos veces a guardar no crea dos clientes', async ({
    page,
    request,
  }) => {
    await entrarComo(page, 'SUPER_ADMINISTRADOR')

    // El recuento se pide a la API con la misma sesión del navegador, que es la
    // única forma de contar lo que de verdad quedó guardado.
    const token = await page.evaluate(() => {
      try {
        return (
          localStorage.getItem('token') ||
          localStorage.getItem('access_token') ||
          ''
        )
      } catch {
        return ''
      }
    })
    test.skip(!token, 'no se pudo leer la sesión para contar clientes')

    const API = process.env.E2E_API || 'http://127.0.0.1:3001/api-credisur'
    const contar = async () => {
      const r = await request.get(`${API}/clients?limit=500`, {
        headers: { authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      })
      const j = await r.json().catch(() => null)
      const a = Array.isArray(j) ? j : j?.clientes || j?.data || []
      return Array.isArray(a) ? a.length : -1
    }

    const antes = await contar()
    test.skip(antes < 0, 'no se pudo contar los clientes')

    await page.goto('/admin/clientes/nuevo', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const unico = String(Date.now()).slice(-9)
    const escribir = async (placeholder: RegExp, valor: string) => {
      const campo = page.getByPlaceholder(placeholder).first()
      if (await campo.count()) await campo.fill(valor)
    }
    await escribir(/1\.020|documento|c[eé]dula/i, unico)
    await escribir(/310 123|tel[eé]fono/i, '3001234567')
    await escribir(/Juan Carlos|nombres?/i, 'Doble')
    await escribir(/P[eé]rez|apellidos?/i, 'Clic')
    await escribir(/Calle, n[uú]mero|direcci[oó]n/i, 'Calle del doble clic 2')

    const boton = botonDeGuardar(page)
    test.skip(!(await boton.count()), 'no se encontró botón de guardar')

    // Dos clics seguidos, sin esperar en medio: es lo que hace la mano.
    await boton.click({ force: true }).catch(() => undefined)
    await boton.click({ force: true, timeout: 2000 }).catch(() => undefined)
    await page.waitForTimeout(6000)

    const despues = await contar()
    const creados = despues - antes

    // 0 vale: puede que la pantalla lo rechazara por algo. Lo que no vale es 2.
    expect(`clientes creados por dos clics: ${creados}`).not.toBe(
      'clientes creados por dos clics: 2',
    )
    expect(creados).toBeLessThan(2)
  })
})
