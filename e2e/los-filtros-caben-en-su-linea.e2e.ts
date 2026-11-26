import { expect, test } from '@playwright/test'
import { entrarComo, hayPantallaDeError } from './sesion'

/**
 * Ningún grupo de filtros se parte en varias líneas.
 *
 * ── Lo que pasaba ─────────────────────────────────────────────────────────
 *
 * Lo describió el dueño con una captura del listado de clientes: «ESTADO ·
 * Todos · Pendientes · … · Lista Negra · Todas», con DOS pastillas oscuras y
 * la última siendo de otro filtro. Arreglado el rótulo, quedaba la
 * colocación, y medida en el navegador a 1366 de ancho:
 *
 *     pantalla                    grupo        tiene  pide   alto
 *     ────────────────────────────────────────────────────────────
 *     /admin/clientes             Estado        627    713    49
 *     /admin/creditos-articulos   Estado        482    469    49
 *     /admin/creditos-articulos   Riesgo        523    510    49
 *     /admin/notificaciones       Lectura      1012    515    44
 *     /admin/archivados           Tipo          461    466    85
 *     /admin/auditoria            Ruta          231    247    83
 *
 * Un grupo de una línea mide 31 px. Todo lo que pase de ~40 es que se partió,
 * y entonces la última opción se queda huérfana debajo o, peor, se lee como
 * parte del grupo siguiente.
 *
 * ── Lo que vigila ─────────────────────────────────────────────────────────
 *
 * Que la regla de `BarraDeFiltros` esté puesta donde hace falta. Se mide en
 * el navegador porque es lo único que lo ve: leyendo el JSX, un `flex-wrap`
 * con tres hijos no parece nada.
 *
 * Comprobada al revés devolviendo los grupos a un mismo `flex-wrap`: falla
 * nombrando la pantalla y el grupo.
 */
const PANTALLAS = [
  '/admin/clientes',
  '/admin/creditos-articulos',
  '/admin/notificaciones',
  '/admin/archivados',
  '/admin/auditoria',
  // Esta ya cabia (31 px); va para que siga cabiendo.
  '/admin/prestamos',
]

/** Un grupo de una línea mide 31 px; se deja margen para una fuente mayor. */
const ALTO_DE_UNA_LINEA = 40

test.describe('Filtros', () => {
  test('ningún grupo se parte en dos líneas a 1366 de ancho', async ({
    page,
  }) => {
    test.setTimeout(10 * 60_000)

    await page.setViewportSize({ width: 1366, height: 900 })
    await entrarComo(page, 'SUPER_ADMINISTRADOR')

    const partidos: string[] = []
    let gruposVistos = 0

    for (const ruta of PANTALLAS) {
      await page.goto(ruta, { timeout: 60_000 })
      expect(await hayPantallaDeError(page), `${ruta} dio error`).toBe(false)

      // Esperar a que haya filtros: medir una pantalla vacía no mide nada.
      await expect
        .poll(async () => page.locator('[role="group"]').count(), {
          timeout: 45_000,
        })
        .toBeGreaterThan(0)
      await page.waitForTimeout(1200)

      const grupos = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>('[role="group"]'),
        ).map((g) => ({
          nombre: g.getAttribute('aria-label') ?? '(sin nombre)',
          alto: g.offsetHeight,
        })),
      )

      gruposVistos += grupos.length
      for (const g of grupos) {
        if (g.alto > ALTO_DE_UNA_LINEA) {
          partidos.push(`${ruta} → «${g.nombre}» mide ${g.alto} px`)
        }
      }
    }

    /*
     * Piso medido: son once grupos entre las cinco pantallas. Sin esto, un
     * fallo de carga dejaría la lista vacía y la prueba pasaría sin haber
     * mirado un solo filtro.
     */
    expect(gruposVistos).toBeGreaterThanOrEqual(8)

    expect(partidos).toEqual([])
  })
})
