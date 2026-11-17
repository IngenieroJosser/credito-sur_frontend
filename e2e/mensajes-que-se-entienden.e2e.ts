import { test, expect, type Page } from '@playwright/test'
import { entrarComo } from './sesion'

/**
 * Que la pantalla hable en el idioma de quien la usa.
 *
 * No son pruebas de aspecto: son de las dos cosas que medidas dejaban a una
 * persona sin saber qué hacer, y que por eso volvía a intentar lo mismo o
 * llamaba por teléfono.
 */

/**
 * Abre el formulario de cliente, que hoy es un modal.
 *
 * Antes estas pruebas iban a `/admin/clientes/nuevo`, una pantalla que se
 * retiró —era una segunda copia del mismo formulario— y que hoy redirige al
 * listado. Como el formulario no estaba, las pruebas se saltaban solas.
 */
async function abrirFormularioDeCliente(page: Page) {
  await page.goto('/clientes', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /nuevo cliente/i }).first().click()
  await page.getByLabel(/^Nombres/i).first().waitFor({ timeout: 30_000 })
}

test.describe('Lo que la pantalla le dice a la persona', () => {
  /**
   * Entrar en el módulo de otro rol te devuelve al tuyo, y te lo dice.
   *
   * ── Lo que esta prueba exigía antes, y por qué cambió ─────────────────
   *
   * Exigía la pantalla «Acceso restringido» de `ProtectedPage`, que nombra el
   * permiso que falta («Ver Módulo Contable») y deja el código para soporte.
   * Esa pantalla sigue existiendo y sigue estando bien.
   *
   * Lo que cambió es antes: `ArmazonAdmin` ahora saca al usuario de la raíz de
   * otro rol y lo lleva a la suya, en vez de dejarlo en una pantalla que no es
   * suya. Así que al bloqueo por permiso ya no se llega por esta vía.
   *
   * El traslado era MUDO, y eso se arregló con el mismo cambio que trajo esta
   * prueba al día: quien escribe a mano la dirección de otro módulo aparecía
   * de golpe en su pantalla sin saber si se había equivocado, si le habían
   * quitado un permiso o si el sistema había fallado.
   */
  test('el traslado a tu propio módulo no es mudo', async ({ page }) => {
    await entrarComo(page, 'COBRADOR')
    await page.goto('/contador', { waitUntil: 'domcontentloaded' })

    // Acaba en lo suyo, no en una pantalla ajena.
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
      .toBe('/cobranzas')

    // Y se le dice por qué, con qué hacer si de verdad necesita entrar.
    const texto = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    expect(texto).toContain('Esa pantalla es de otro módulo')
    expect(texto).toContain('pídele el permiso a tu administrador')
  })

  /**
   * Recargar no se lleva lo escrito.
   *
   * Medido antes: el formulario de cliente —cinco secciones— quedaba en blanco
   * al recargar. Y la recarga no es un accidente raro: el móvil gira, el
   * navegador descarta la pestaña, la app se actualiza, o alguien le da a F5
   * «porque se quedó pegado». Volver a escribirle los datos a alguien que está
   * esperando de pie es el desgaste que hace que la gente deje de usar el
   * sistema.
   *
   * Lo que NO se recupera son las fotos y los documentos: son archivos y no
   * caben en el almacenamiento del navegador. El aviso de la pantalla lo dice.
   */
  test('recargar a mitad del formulario de cliente no pierde lo escrito', async ({
    page,
  }) => {
    await abrirFormularioDeCliente(page)

    /*
     * Por etiqueta, no por marcador de posición.
     *
     * Antes se buscaban por `getByPlaceholder`, y esos campos no tienen
     * ninguno: la prueba no los encontraba y se SALTABA sola, así que llevaba
     * tiempo sin comprobar nada. Tampoco podía buscarlos por etiqueta, porque
     * las etiquetas no estaban unidas a sus campos —80 en 11 archivos—. Ya lo
     * están.
     */
    const nombres = page.getByLabel(/^Nombres/i).first()
    const apellidos = page.getByLabel(/^Apellidos/i).first()

    await nombres.fill('Yorleidy Prueba')
    await apellidos.fill('Moya Del Borrador')
    // Un respiro para que el borrador se guarde antes de recargar.
    await page.waitForTimeout(1200)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await abrirFormularioDeCliente(page)

    expect(await page.getByLabel(/^Nombres/i).first().inputValue()).toBe(
      'Yorleidy Prueba',
    )
    expect(await page.getByLabel(/^Apellidos/i).first().inputValue()).toBe(
      'Moya Del Borrador',
    )
  })

  /**
   * Un borrador no se le queda al siguiente cliente.
   *
   * Es el riesgo que trae guardar el borrador, y es peor que el problema que
   * resuelve: registrar a una persona con la dirección de otra. Se comprueba
   * que al salir y volver a entrar DESPUÉS de haber vaciado el formulario no
   * queda nada.
   */
  test('un formulario vaciado a mano no deja borrador', async ({ page }) => {
    await abrirFormularioDeCliente(page)

    const nombres = page.getByLabel(/^Nombres/i).first()
    await nombres.fill('Algo que se va a borrar')
    await page.waitForTimeout(800)
    await nombres.fill('')
    await page.waitForTimeout(1200)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await abrirFormularioDeCliente(page)

    expect(await page.getByLabel(/^Nombres/i).first().inputValue()).toBe('')
  })
})
