import { expect, test } from '@playwright/test'
import { entrarComo, hayPantallaDeError } from './sesion'

/**
 * El estado del detalle de usuario es un interruptor, no un adorno.
 *
 * ── Lo que pasaba ─────────────────────────────────────────────────────────
 *
 * Lo dijo el dueño: «ese Activo debe funcionar de verdad». No funcionaba: la
 * pastilla de estado era un `span`, y el botón «Desactivar» que había al lado
 * CERRABA el detalle para abrir otro modal de confirmación encima del
 * listado. Tres pantallas para un interruptor, y al volver había que buscar
 * la fila otra vez.
 *
 * Ahora la pastilla es el control: se pulsa, pregunta ahí mismo, y al
 * confirmar llama a la API y se actualiza en el sitio —y el listado de detrás
 * se entera sin recargar la vista—.
 *
 * ── Lo que vigila ─────────────────────────────────────────────────────────
 *
 * Contra la API de verdad, porque lo que se rompía era precisamente el viaje
 * al backend. Cambia el estado y lo DEVUELVE a como estaba, para que la
 * prueba se pueda correr dos veces seguidas.
 */
test.describe('Detalle del usuario', () => {
  test('la pastilla de estado cambia el estado de verdad', async ({ page }) => {
    test.setTimeout(6 * 60_000)

    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto('/admin/users')
    expect(await hayPantallaDeError(page)).toBe(false)

    await expect
      .poll(async () => page.locator('tbody tr').count(), { timeout: 60_000 })
      .toBeGreaterThan(0)

    /*
     * Un cobrador: a un super administrador NO se le puede cambiar el estado
     * —esa es la regla— así que con él la prueba pasaría sin probar nada.
     */
    const fila = page.locator('tbody tr').filter({ hasText: 'Cobrador' }).first()
    await fila.getByRole('button', { name: 'Ver detalle' }).click()

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible({ timeout: 30_000 })

    const pastilla = dialogo.getByRole('button', { name: /^Estado:/ })
    await expect(pastilla).toBeVisible({ timeout: 20_000 })
    const antes = ((await pastilla.textContent()) || '').trim()
    expect(['ACTIVO', 'INACTIVO']).toContain(antes.toUpperCase())

    const volverA = async (desde: string) => {
      const esperado = desde.toUpperCase() === 'ACTIVO' ? 'Inactivo' : 'Activo'
      await dialogo.getByRole('button', { name: /^Estado:/ }).click()
      // Pregunta antes de hacerlo: desactivar deja a alguien sin entrar.
      await expect(
        dialogo.getByText(/¿(Des)?[Aa]ctivar a /),
      ).toBeVisible({ timeout: 10_000 })
      await dialogo
        .getByRole('button', { name: /^Sí, (des)?activar$/ })
        .click()
      await expect(
        dialogo.getByRole('button', { name: /^Estado:/ }),
      ).toContainText(new RegExp(esperado, 'i'), { timeout: 30_000 })
      return esperado
    }

    // Ida: cambia de verdad y se ve en el sitio, sin cerrar el modal.
    const despues = await volverA(antes)
    expect(despues.toUpperCase()).not.toBe(antes.toUpperCase())

    /*
     * Y persiste: se cierra, se reabre y sigue cambiado. Sin esto, un cambio
     * que solo tocara el estado de React pasaría la prueba.
     */
    await page.keyboard.press('Escape')
    await expect(dialogo).toHaveCount(0, { timeout: 15_000 })
    await page.waitForTimeout(1500)
    await page
      .locator('tbody tr')
      .filter({ hasText: 'Cobrador' })
      .first()
      .getByRole('button', { name: 'Ver detalle' })
      .click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByRole('dialog').getByRole('button', { name: /^Estado:/ }),
    ).toContainText(new RegExp(despues, 'i'), { timeout: 20_000 })

    // Vuelta: se deja como estaba.
    await volverA(despues)
    await expect(
      page.getByRole('dialog').getByRole('button', { name: /^Estado:/ }),
    ).toContainText(new RegExp(antes, 'i'), { timeout: 20_000 })
  })
})
