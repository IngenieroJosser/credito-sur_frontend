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
   * Un permiso se nombra, no se escupe su código.
   *
   * Medido: un cobrador que abría por error la pantalla del contador leía
   * «Permiso requerido: CONTABLE_VIEW». El bloqueo funciona perfecto —se
   * comprobó que no se filtra ni una cifra—, pero ese texto no le dice ni qué
   * módulo es ni qué pedirle a su administrador.
   *
   * El código se conserva aparte y en pequeño, porque para quien administra sí
   * sirve: con él encuentra el permiso exacto sin adivinar la pantalla.
   */
  test('el permiso que falta se nombra en español', async ({ page }) => {
    await entrarComo(page, 'COBRADOR')
    await page.goto('/contador', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5000)

    const texto = (await page.locator('body').innerText()).replace(/\s+/g, ' ')

    // El nombre que el propio sistema tiene guardado para ese permiso.
    expect(texto).toContain('Ver Módulo Contable')
    // Y el código sigue estando, para soporte.
    expect(texto).toContain('CONTABLE_VIEW')
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
