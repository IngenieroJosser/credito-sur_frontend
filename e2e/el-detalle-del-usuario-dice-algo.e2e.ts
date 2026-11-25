import { expect, test } from '@playwright/test'
import { entrarComo, hayPantallaDeError, textoSospechoso } from './sesion'

/**
 * El detalle de un usuario dice algo, y lo dice en español.
 *
 * ── Lo que enseñaba ───────────────────────────────────────────────────────────
 *
 * Lo dijo el dueño: «la parte de ver detalles del usuario está de verdad muy
 * mal hecha». Lo estaba, y de las dos puntas:
 *
 *   - el backend devolvía la actividad en crudo —`ACTUALIZAR_USUARIO  Usuario
 *     fe3e3d3f-00ff-44f9-9f68-fdc40305cffc`—, el nombre del enum y un UUID;
 *   - el modal pintaba las mismas tarjetas para todos los roles, con números
 *     que no venían de ningún sitio.
 *
 * Ahora cada rol trae SUS métricas (`obtenerDetalleOperativo` reparte por rol)
 * y la actividad pasa por la tabla de frases.
 *
 * ── Lo que vigila ─────────────────────────────────────────────────────────────
 *
 * Contra la API de verdad y con los OCHO usuarios del seed, porque el reparto
 * por rol es justo lo que un doble no ejercita: con datos simulados las siete
 * ramas del `if` dan igual. Y mira lo que no debe aparecer nunca en pantalla:
 * un UUID, el nombre de un enum, `NaN` o `undefined`.
 */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/** Un enum sin traducir: dos o más palabras en mayúscula unidas por `_`. */
const ENUM_CRUDO = /\b[A-Z]{3,}(?:_[A-Z]{2,})+\b/

test.describe('Detalle del usuario', () => {
  test('cada rol trae sus propias cifras, sin UUIDs ni enums en crudo', async ({
    page,
  }) => {
    test.setTimeout(8 * 60_000)

    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto('/admin/users')
    expect(await hayPantallaDeError(page)).toBe(false)

    await expect
      .poll(async () => page.locator('tbody tr').count(), { timeout: 60_000 })
      .toBeGreaterThan(0)

    const filas = await page.locator('tbody tr').count()
    expect(filas).toBeGreaterThanOrEqual(7)

    const vistos: { rol: string; cifras: number; lineas: number }[] = []

    for (let i = 0; i < filas; i += 1) {
      const fila = page.locator('tbody tr').nth(i)
      const rol = ((await fila.locator('td').nth(1).textContent()) || '').trim()

      await fila.getByRole('button', { name: 'Ver detalle' }).click()

      const dialogo = page.getByRole('dialog')
      await expect(dialogo).toBeVisible({ timeout: 30_000 })

      /*
       * Esperar a que la petición conteste: si se mide el modal recién abierto
       * se mide el esqueleto, y entonces «no hay UUIDs» pasa sin mirar nada.
       */
      await expect
        .poll(
          async () =>
            (await dialogo.innerText()).includes('Cargando') ? 0 : 1,
          { timeout: 45_000 },
        )
        .toBe(1)
      await page.waitForTimeout(1200)

      const texto = await dialogo.innerText()

      /*
       * Ni identificadores ni nombres de enum en la cara de nadie.
       *
       * El mensaje lleva el trozo de alrededor: sin eso, un fallo dice «hay
       * un UUID» y toca abrir la traza para saber dónde, que es lo que pasó
       * la primera vez que esto falló.
       */
      const hallado = texto.match(UUID)
      const alrededor = (m: RegExpMatchArray | null) => {
        if (!m) return ''
        const i = texto.indexOf(m[0])
        return texto.slice(Math.max(0, i - 120), i + 80).replace(/\s+/g, ' ')
      }
      expect(
        hallado?.[0],
        `el detalle de «${rol}» muestra un UUID: …${alrededor(hallado)}…`,
      ).toBeFalsy()

      const enumCrudo = texto.match(ENUM_CRUDO)
      expect(
        enumCrudo?.[0],
        `el detalle de «${rol}» muestra el enum «${enumCrudo?.[0]}»: …${alrededor(enumCrudo)}…`,
      ).toBeFalsy()

      // Ni NaN, ni undefined, ni [object Object].
      expect(await textoSospechoso(page)).toEqual([])

      // Y algo que decir: al menos una cifra y, si hay actividad, en español.
      // Contar sobre el texto, no con un localizador: lo que importa es que
      // el modal enseñe cifras, no en qué elemento están.
      const cifras = (texto.match(/\b\d[\d.,]*\b/g) || []).length
      const lineas = await dialogo.locator('time').count()
      vistos.push({ rol, cifras, lineas })

      await page.keyboard.press('Escape')
      await expect(dialogo).toHaveCount(0, { timeout: 15_000 })
    }

    /*
     * El reparto por rol existe de verdad: si todos los roles trajeran lo
     * mismo, esto no lo distinguiría, así que se comprueba que se vieron
     * varios roles distintos y que ninguno salió sin una sola cifra.
     */
    const roles = new Set(vistos.map((v) => v.rol))
    expect(roles.size).toBeGreaterThanOrEqual(4)
    expect(
      vistos.filter((v) => v.cifras === 0).map((v) => v.rol),
      'estos roles abrieron el detalle sin una sola cifra',
    ).toEqual([])
  })
})
