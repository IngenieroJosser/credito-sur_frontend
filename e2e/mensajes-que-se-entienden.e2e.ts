import { test, expect } from '@playwright/test'
import { entrarComo } from './sesion'

/**
 * Que la pantalla hable en el idioma de quien la usa.
 *
 * No son pruebas de aspecto: son de las dos cosas que medidas dejaban a una
 * persona sin saber qué hacer, y que por eso volvía a intentar lo mismo o
 * llamaba por teléfono.
 */

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
    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto('/admin/clientes/nuevo', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3500)

    // Los dos campos de la primera sección, que es la que está abierta al
    // entrar. Los de otras secciones no están en el DOM hasta pulsar su
    // pestaña, y probarlos aquí mediría la navegación, no el borrador.
    const nombres = page.getByPlaceholder(/Juan Carlos/i).first()
    const apellidos = page.getByPlaceholder(/P[eé]rez/i).first()
    test.skip(
      !(await nombres.count()) || !(await apellidos.count()),
      'no se encontraron los campos del formulario',
    )

    await nombres.fill('Yorleidy Prueba')
    await apellidos.fill('Moya Del Borrador')
    // Un respiro para que el borrador se guarde antes de recargar.
    await page.waitForTimeout(1200)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)

    expect(
      await page.getByPlaceholder(/Juan Carlos/i).first().inputValue(),
    ).toBe('Yorleidy Prueba')
    expect(await page.getByPlaceholder(/P[eé]rez/i).first().inputValue()).toBe(
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
    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto('/admin/clientes/nuevo', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3500)

    const nombres = page.getByPlaceholder(/Juan Carlos/i).first()
    test.skip(!(await nombres.count()), 'no se encontró el campo de nombres')

    await nombres.fill('Algo que se va a borrar')
    await page.waitForTimeout(800)
    await nombres.fill('')
    await page.waitForTimeout(1200)

    await page.goto('/admin/clientes', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.goto('/admin/clientes/nuevo', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)

    expect(
      await page.getByPlaceholder(/Juan Carlos/i).first().inputValue(),
    ).toBe('')
  })
})
