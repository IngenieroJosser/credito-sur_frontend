import { expect, test } from '@playwright/test'
import { entrarComo, hayPantallaDeError } from './sesion'

/**
 * La pantalla de respaldos, mirada de verdad en el navegador.
 *
 * ── Por qué hacía falta verla ─────────────────────────────────────────────
 *
 * Porque lo que estaba mal no se veía leyendo el código salvo que uno lo
 * cruzara con el backend: la tarjeta decía «Nube VPS · Respaldo remoto ·
 * Conectado», con un punto verde parpadeando y un escudo, y bajo «Última
 * sincronización» repetía la fecha del respaldo LOCAL. Nada de eso existe: el
 * enum `BackupDestino` tiene un solo valor, `LOCAL`, y no hay una sola línea en
 * el módulo de respaldos que suba un archivo a ningún sitio.
 *
 * O sea que la pantalla le decía al dueño que tenía una copia fuera del
 * servidor de su financiera. En una pantalla de respaldos esa es la frase más
 * cara de equivocar, y se juntaba con que el disco de Render es efímero.
 *
 * Se reescribió la tarjeta, y como eso movió bastante JSX, esta prueba
 * comprueba en el navegador que la pantalla **se pinta** y que dice lo que
 * debe. Las pruebas de `__tests__` leen el archivo; esta lo ejecuta.
 */
test.describe('Respaldos', () => {
  test('la pantalla dice dónde queda el respaldo y no inventa una nube', async ({
    page,
  }) => {
    test.setTimeout(2 * 60_000)

    /*
     * SUPER_ADMINISTRADOR y no ADMIN, y el motivo vale anotarlo.
     *
     * El endpoint lleva `@Permisos('backups')`, y medido contra la base de
     * desarrollo ese permiso EXISTE pero no lo tiene asignado ningun rol:
     * `roles_permisos` no devuelve ninguna fila para el. El guard exime al
     * superadministrador (`permisos.guard.ts:34`), asi que es el unico que
     * puede abrir esta pantalla tal como esta la base hoy.
     *
     * Con ADMIN la peticion daba 403 y la prueba fallaba por falta de datos,
     * no por el codigo. Si algun dia se le concede el permiso a ADMIN, esta
     * prueba sigue valiendo igual.
     */
    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto('/admin/sistema/backups')

    // Que la pantalla exista antes de afirmar nada sobre su contenido.
    await expect(
      page.getByRole('heading', { name: /Respaldo y Recuperaci[oó]n/i }),
    ).toBeVisible({ timeout: 30_000 })
    expect(await hayPantallaDeError(page)).toBe(false)

    /*
     * Esperar a que el ESTADO haya llegado antes de mirar nada mas.
     *
     * La primera version de esta prueba tomaba el texto del cuerpo justo
     * despues de ver el titulo, y fallo: la pantalla estaba todavia cargando.
     * Peor que eso, las aserciones NEGATIVAS -«no dice Nube VPS»- sobre una
     * pagina a medio pintar habrian pasado en vacio. Asi que primero se exige
     * algo que solo aparece cuando `GET /backup/status` ya contesto.
     */
    await expect(
      page.getByText(
        /Volcado SQL disponible|no puede generar el volcado SQL/i,
      ),
    ).toBeVisible({ timeout: 30_000 })

    const cuerpo = (await page.locator('body').innerText()).trim()

    // ── 1. La nube inventada no esta ────────────────────────────────────
    expect(cuerpo).not.toMatch(/Nube VPS/i)
    expect(cuerpo).not.toMatch(/Respaldo remoto/i)
    expect(cuerpo).not.toMatch(/[ÚU]ltima sincronizaci[oó]n/i)

    // ── 2. Y si esta lo que de verdad pasa ──────────────────────────────
    await expect(
      page.getByText(/Copia fuera del servidor/i).first(),
    ).toBeVisible()
    await expect(page.getByText(/No configurada/i).first()).toBeVisible()
    await expect(
      page.getByText(/Solo en el disco de este servidor/i),
    ).toBeVisible()
    // Lo unico que de verdad hay que saber: si no se descarga, no hay copia.
    expect(cuerpo).toMatch(/ef[ií]mero/i)

    // ── 3. Lo que si funciona sigue ahi ─────────────────────────────────
    await expect(
      page.getByRole('button', { name: /Forzar respaldo manual/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Verificar integridad/i }),
    ).toBeVisible()
  })
})
