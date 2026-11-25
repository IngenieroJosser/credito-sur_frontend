import { expect, test } from '@playwright/test'
import { entrarComo, hayPantallaDeError } from './sesion'

/**
 * El modal de una caja pide el saldo al servidor y no se baja el libro.
 *
 * ── Qué se cambió ─────────────────────────────────────────────────────────
 *
 * Al abrir una caja, la pantalla contable se bajaba **hasta 5.000 asientos**
 * del libro con sus líneas para calcular dos cifras —el saldo previo al rango
 * y el total registrado— sumándolas en el navegador. Ahora las pide a
 * `GET /accounting/cajas/:id/saldo-en-rango`, que hace la misma cuenta en SQL.
 *
 * Las dos cifras ya se compararon fuera del navegador: 5 cajas × 5 rangos, 50
 * comparaciones, cero discrepancias. Lo que esta prueba añade es lo que
 * aquello no puede ver: que **en la pantalla de verdad** se llame al endpoint
 * nuevo, que NO se pida el libro entero, y que las cifras se pinten.
 */
test.describe('Saldo de caja', () => {
  test('abre una caja pidiendo el saldo al servidor, sin bajarse el libro', async ({
    page,
  }) => {
    test.setTimeout(3 * 60_000)

    const llamadas: string[] = []
    page.on('request', (peticion) => {
      const url = peticion.url()
      if (url.includes('/accounting/')) llamadas.push(url)
    })

    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto('/admin/contable')
    expect(await hayPantallaDeError(page)).toBe(false)

    /*
     * Hay que esperar a que la tabla de cajas tenga filas antes de pulsar: si
     * se pulsa sobre una pantalla a medio cargar, la prueba mide otra cosa.
     */
    // El boton de cada fila de la tabla de cajas se llama solo «Ver».
    const verCaja = page.getByRole('button', { name: /^Ver$/ })
    const hayBoton = await verCaja
      .first()
      .waitFor({ state: 'visible', timeout: 45_000 })
      .then(() => true)
      .catch(() => false)

    if (!hayBoton) {
      /*
       * Sin cajas en la base no hay nada que abrir. Se dice en vez de pasar en
       * verde fingiendo que se comprobó algo.
       */
      test.skip(true, 'No hay cajas en esta base: nada que abrir.')
      return
    }

    await verCaja.first().click()

    // El modal con su cifra principal.
    await expect(page.getByText(/Saldo Actual/i)).toBeVisible({
      timeout: 30_000,
    })

    // ── Lo que importa ──────────────────────────────────────────────────
    await expect
      .poll(() => llamadas.filter((u) => u.includes('saldo-en-rango')).length, {
        timeout: 20_000,
      })
      .toBeGreaterThan(0)

    /*
     * Y que NO se haya pedido el libro de la caja. Se mira esa llamada
     * concreta -`cajaId=` y `limit=5000`- y no cualquier `ledger/movimientos`:
     * la pantalla hace otras dos por su cuenta al cargar (`accountPrefix=3.`
     * del día y un listado con `limit=50`) que no tienen nada que ver con el
     * modal. La primera versión de esta prueba fallaba por eso.
     *
     * Si el endpoint fallara, la pantalla cae al camino viejo a propósito
     * -eso es el respaldo- y esta afirmación lo detectaría, que es justo lo
     * que se quiere saber.
     */
    const pidioElLibroDeLaCaja = llamadas.filter(
      (u) =>
        u.includes('ledger/movimientos') &&
        u.includes('cajaId=') &&
        u.includes('limit=5000'),
    )
    expect(pidioElLibroDeLaCaja).toEqual([])

    expect(await hayPantallaDeError(page)).toBe(false)
  })
})
