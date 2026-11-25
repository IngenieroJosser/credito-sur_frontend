import { expect, test } from '@playwright/test'
import { entrarComo, hayPantallaDeError } from './sesion'

/**
 * Cada permiso tiene UNA casilla, y marcarla no marca otra.
 *
 * ── Lo que pasaba ─────────────────────────────────────────────────────────
 *
 * Lo describió el dueño: «la gestión de permisos tiene dos check, y al darle
 * clic a uno se selecciona el otro».
 *
 * Eran, en efecto, dos: la casilla dibujada a mano y la casilla NATIVA, que
 * debía estar escondida y no lo estaba. Las dos son el mismo control, así que
 * tocar una movía «la otra».
 *
 * La causa estaba en `globals.css`. La regla que da estilo a las casillas,
 * `input[type='checkbox']:not([data-nativa])`, pone `display: inline-grid` y
 * tiene especificidad (0,2,1); la clase `hidden` de Tailwind tiene (0,1,0).
 * Así que el `hidden` del modal **perdía**. Medido en el navegador antes de
 * arreglarlo: 18 casillas y **las 18 visibles**.
 *
 * De paso: las dieciocho compartían el mismo `id="page-rol-2"`, escrito a mano
 * dentro de un `.map()`. Un `id` duplicado es HTML inválido y deja a un lector
 * de pantalla sin saber qué casilla anuncia. Se quitó —el `input` va dentro de
 * su `label`, así que la asociación es implícita— y se le puso `aria-label`.
 *
 * Nada de esto se ve leyendo el código: el `className="hidden"` está ahí y
 * parece correcto. Hizo falta mirarlo en el navegador, y por eso la prueba
 * vive aquí y no en `__tests__`.
 */
test.describe('Permisos', () => {
  test('una sola casilla por permiso, y marcarla no marca otra', async ({
    page,
  }) => {
    test.setTimeout(3 * 60_000)

    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto('/admin/users')
    expect(await hayPantallaDeError(page)).toBe(false)

    const abrir = page.getByRole('button', { name: /permiso/i }).first()
    await abrir.waitFor({ state: 'visible', timeout: 45_000 })
    await abrir.click()

    // Esperar a que el modal tenga sus casillas antes de medir nada.
    await expect
      .poll(
        async () => page.locator('input[type=checkbox]').count(),
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0)

    const estado = await page.evaluate(() => {
      const casillas = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[type=checkbox]'),
      )
      const visibles = casillas.filter((c) => {
        const r = c.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      }).length
      // Los `id` vacíos no cuentan: no hay duplicado si no hay identificador.
      const ids = casillas.map((c) => c.id).filter(Boolean)
      return {
        total: casillas.length,
        visibles,
        duplicados: ids.length - new Set(ids).size,
      }
    })

    expect(estado.total).toBeGreaterThan(1)

    /*
     * La afirmación que importa: la casilla nativa está escondida, así que no
     * se ven dos por permiso.
     */
    expect(estado.visibles).toBe(0)
    expect(estado.duplicados).toBe(0)

    /*
     * Y lo que de verdad se quejaba el dueño: marcar uno no marca otro.
     *
     * Se cuentan las marcadas antes y después de pulsar una: tiene que
     * cambiar exactamente en una.
     */
    const marcadas = () =>
      page.evaluate(
        () =>
          Array.from(
            document.querySelectorAll<HTMLInputElement>(
              'input[type=checkbox]',
            ),
          ).filter((c) => c.checked).length,
      )

    const antes = await marcadas()
    await page.locator('label:has(input[type=checkbox])').first().click()
    await page.waitForTimeout(300)
    const despues = await marcadas()

    expect(Math.abs(despues - antes)).toBe(1)
  })
})
