import { expect, test } from '@playwright/test'
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

    // El enlace del menú. En anchos de escritorio el aside está abierto; si no
    // lo estuviera, se abre primero con el botón del menú.
    const enlace = page.getByRole('link', { name: modulo }).first()
    if (!(await enlace.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /men[úu]/i }).first().click()
    }
    await enlace.click()

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

  await page.getByRole('link', { name: 'Movimientos' }).first().click()
  await page.waitForTimeout(400)

  if (await telon.count()) {
    // Si volviera a empezar, aquí estaría opaco: el telón tarda 300 ms en
    // bajar y 1 s en desvanecerse.
    await expect(telon).toHaveCSS('opacity', '0')
  }
})
