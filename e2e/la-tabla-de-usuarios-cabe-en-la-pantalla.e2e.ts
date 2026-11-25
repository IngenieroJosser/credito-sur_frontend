import { expect, test } from '@playwright/test'
import { entrarComo, hayPantallaDeError } from './sesion'

/**
 * En la gestión de usuarios se ven las cinco columnas y se alcanzan los botones.
 *
 * ── Lo que pasaba ─────────────────────────────────────────────────────────────
 *
 * Medido en el navegador a 1280 de ancho —un portátil normal, no un caso
 * raro—: la tabla pedía 1037 px y tenía 958, así que la columna de ACCIONES se
 * quedaba 79 px fuera. El contenedor tiene `overflow-x-auto`, de modo que
 * scrollaba, pero nada en la pantalla decía que hubiera algo más a la derecha:
 * los botones de editar, permisos y ver detalle de cada usuario simplemente no
 * estaban. A 1366 y a 1920 sí entraba, que es por lo que no se veía.
 *
 * Dos cosas más, medidas en la misma pasada:
 *
 *   - la etiqueta «ADMINISTRADORES» de su tarjeta terminaba EXACTAMENTE donde
 *     empezaba el icono —hueco de 0 px a 1366 y a 1280—, que es lo que en una
 *     captura se lee como que se solapan;
 *   - con seis filas por página y ocho usuarios había una segunda página con
 *     dos filas.
 *
 * ── Lo que vigila ─────────────────────────────────────────────────────────────
 *
 * Lo mide en el navegador porque es lo único que lo ve: leyendo el JSX, cinco
 * columnas con `px-8`/`px-6` no parecen nada.
 *
 * Comprobada al revés devolviendo los rellenos anchos (`px-8`/`px-6`): falla
 * diciendo que la tabla pide 1037 y tiene 958.
 */
const ANCHOS = [
  { ancho: 1280, alto: 800 },
  { ancho: 1366, alto: 768 },
  { ancho: 1920, alto: 1080 },
] as const

test.describe('Gestión de usuarios', () => {
  test('la tabla entra, el icono no toca la etiqueta y los 8 caben en una página', async ({
    page,
  }) => {
    test.setTimeout(5 * 60_000)

    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto('/admin/users')
    expect(await hayPantallaDeError(page)).toBe(false)

    // Esperar a que la tabla tenga filas antes de medir nada: medir una tabla
    // vacía da «cabe» sin haber mirado.
    await expect
      .poll(async () => page.locator('tbody tr').count(), { timeout: 60_000 })
      .toBeGreaterThan(0)

    /*
     * Las ocho filas en una sola página. Si la empresa crece y pasa de diez,
     * esto deja de valer: entonces el número correcto es el de `itemsPerPage`,
     * no ocho, y hay que cambiar la aserción a `toBeLessThanOrEqual(10)`.
     */
    const filas = await page.locator('tbody tr').count()
    expect(filas).toBeGreaterThanOrEqual(7)
    expect(filas).toBeLessThanOrEqual(10)

    for (const { ancho, alto } of ANCHOS) {
      await page.setViewportSize({ width: ancho, height: alto })
      await page.waitForTimeout(700)

      const medida = await page.evaluate(() => {
        const tabla = document.querySelector('table')
        const caja = tabla?.parentElement as HTMLElement | null
        const etiqueta = Array.from(document.querySelectorAll('p')).find((p) =>
          /^administradores$/i.test((p.textContent || '').trim()),
        ) as HTMLElement | undefined
        const icono = etiqueta?.parentElement
          ?.nextElementSibling as HTMLElement | null
        const re = etiqueta?.getBoundingClientRect()
        const ri = icono?.getBoundingClientRect()
        return {
          pide: caja ? caja.scrollWidth : -1,
          tiene: caja ? caja.clientWidth : -1,
          hueco: re && ri ? Math.round(ri.left - re.right) : -1,
        }
      })

      // La tabla cabe: nada queda fuera a la derecha.
      expect(
        medida.pide,
        `a ${ancho} de ancho la tabla pide ${medida.pide} y tiene ${medida.tiene}`,
      ).toBeLessThanOrEqual(medida.tiene + 1)

      // Y la etiqueta de la tarjeta no toca su icono.
      expect(
        medida.hueco,
        `a ${ancho} de ancho el hueco entre «ADMINISTRADORES» y su icono es ${medida.hueco} px`,
      ).toBeGreaterThanOrEqual(8)
    }

    // Los botones de acciones de la primera fila están donde se puede pulsarlos.
    const ver = page.getByRole('button', { name: 'Ver detalle' }).first()
    await expect(ver).toBeVisible()
    const caja = await ver.boundingBox()
    expect(caja).not.toBeNull()
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(1920)
  })
})
