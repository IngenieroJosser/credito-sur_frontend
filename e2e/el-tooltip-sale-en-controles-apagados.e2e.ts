import { expect, test } from '@playwright/test'
import { entrarComo, hayPantallaDeError } from './sesion'

/**
 * La ayuda sale también sobre un control deshabilitado.
 *
 * ── Lo que pasaba ─────────────────────────────────────────────────────────
 *
 * Al cambiar los 32 `title` nativos por el `Tooltip` del sistema se perdió
 * una cosa: un control deshabilitado NO dispara eventos de ratón, así que el
 * tooltip —que escucha `onMouseEnter` en el propio control— no salía. Medido
 * sobre el botón «Archivar» de un super administrador: cero tooltips.
 *
 * El `title` del navegador sí salía, porque lo pinta el navegador y no el
 * JavaScript. O sea que la migración borró la explicación justo donde más
 * falta hace, porque el texto de un control apagado casi siempre dice POR QUÉ
 * lo está: «Domingo no laborable», «Solo puedes importar cuando la validación
 * no tenga errores», «Escribe el precio total para agregarla».
 *
 * `Tooltip` ahora escucha en una envoltura cuando —y solo cuando— el hijo
 * está deshabilitado.
 *
 * ── Lo que vigila ─────────────────────────────────────────────────────────
 *
 * Se mide en el navegador porque es comportamiento del navegador: leyendo el
 * código, un `onMouseEnter` en un botón parece que funciona siempre.
 *
 * Comprobada al revés quitando la envoltura: vuelve a dar cero tooltips.
 */
test.describe('Tooltip', () => {
  test('explica también lo que está deshabilitado', async ({ page }) => {
    test.setTimeout(5 * 60_000)

    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto('/admin/users')
    expect(await hayPantallaDeError(page)).toBe(false)

    await expect
      .poll(async () => page.locator('tbody tr').count(), { timeout: 60_000 })
      .toBeGreaterThan(0)

    /*
     * A un super administrador no se le puede archivar, así que ese botón de
     * su fila está deshabilitado: es el caso que se quiere probar.
     */
    const fila = page
      .locator('tbody tr')
      .filter({ hasText: 'SuperAdministrador' })
      .first()
    const boton = fila.getByRole('button', { name: 'Archivar' }).first()
    await expect(boton).toBeVisible({ timeout: 20_000 })
    expect(
      await boton.isDisabled(),
      'el botón de archivar a un superadmin debería estar deshabilitado; sin eso esta prueba no prueba nada',
    ).toBe(true)

    await boton.hover({ force: true })

    await expect(
      page.getByRole('tooltip').filter({ hasText: 'Archivar' }),
    ).toBeVisible({ timeout: 10_000 })
  })
})
