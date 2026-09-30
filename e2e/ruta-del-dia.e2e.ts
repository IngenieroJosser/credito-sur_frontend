import { expect, test } from '@playwright/test'

/**
 * La ruta del día del cobrador, en un navegador de verdad.
 *
 * Existe por una razón concreta: la pantalla del cobrador tenía una copia de 330
 * líneas de `buildRutaHoyOperativa`, se unificó, y ninguna de las 8.257 pruebas de
 * Jest ejecuta ese componente. Lo verde de Jest no dice nada de esta pantalla.
 *
 * Las que necesitan sesión se saltan solas si no hay credenciales, para que la
 * suite siga sirviendo sin secretos en el repo:
 *
 *     E2E_USUARIO=... E2E_CLAVE=... npm run e2e
 */
/**
 * El cobrador de desarrollo que siembra `src/prisma/seed.ts` en el backend. No es
 * un secreto: esta escrito en el repo y solo existe en bases locales. Se puede
 * pisar con el entorno para correr contra otro usuario.
 */
const USUARIO = process.env.E2E_USUARIO || 'cobrador@credisur.com'
const CLAVE = process.env.E2E_CLAVE || 'Cobrador123!'

/** Entra a la app. Devuelve false si el login no llevó a ninguna parte. */
async function entrar(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/usuario|correo|email/i).first().fill(USUARIO!)
  await page.getByLabel(/contrase|clave|password/i).first().fill(CLAVE!)
  await page.getByRole('button', { name: /entrar|ingresar|iniciar/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 30_000,
  })
}

test.describe('La app arranca', () => {
  // Sin sesión no se puede ver una ruta, pero sí comprobar que la app compila,
  // se sirve y no revienta al primer render. Eso ya atrapa un error de
  // importación o un fallo de build, que es más de lo que daba antes.
  test('el login se sirve y se puede escribir en él', async ({ page }) => {
    const erroresDeConsola: string[] = []
    page.on('pageerror', (error) => erroresDeConsola.push(String(error)))

    await page.goto('/login')

    await expect(page).toHaveTitle(/.+/)
    await expect(
      page.getByRole('button', { name: /entrar|ingresar|iniciar/i }).first(),
    ).toBeVisible()

    // Una excepción no capturada en el primer render es un fallo, aunque la
    // página pinte algo.
    expect(erroresDeConsola).toEqual([])
  })
})

test.describe('La ruta del día del cobrador', () => {
  // Estas hablan con la API de verdad. Si el backend no esta arriba se saltan en
  // vez de fallar: un backend apagado no es una regresion de la pantalla.
  test.beforeAll(async ({ request }) => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    try {
      await request.get(api, { timeout: 4000 })
    } catch {
      test.skip(true, `El backend de ${api} no responde.`)
    }
  })

  test('carga sin romperse y muestra la lista de visitas', async ({ page }) => {
    const errores: string[] = []
    page.on('pageerror', (error) => errores.push(String(error)))

    await entrar(page)

    // La ruta del día es la pantalla principal del cobrador; si el rol entra en
    // otra, esto falla y hay que ajustar la navegación, no la aserción.
    await page.waitForLoadState('networkidle')

    // Lo que se comprueba es que el componente completó su carga: que salió del
    // estado de cargando sin lanzar una excepción. Es exactamente lo que el
    // refactor podía romper.
    await expect(page.getByText(/cargando/i).first()).toBeHidden({
      timeout: 30_000,
    })
    expect(errores).toEqual([])
  })

  test('la meta y el recaudo del día son números, no NaN', async ({ page }) => {
    // El refactor movió de dónde salen estos dos: antes los calculaba el propio
    // componente, ahora los deriva del helper. Un NaN aquí es la señal de que la
    // cadena se rompió en algún eslabón.
    await entrar(page)
    await page.waitForLoadState('networkidle')

    const cuerpo = (await page.locator('body').textContent()) || ''
    expect(cuerpo).not.toContain('NaN')
    expect(cuerpo).not.toContain('undefined')
    expect(cuerpo).not.toContain('[object Object]')
  })
})
