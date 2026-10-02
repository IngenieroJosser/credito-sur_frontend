import { test } from '@playwright/test'
import { entrarComo } from './sesion'
test('mismo ancho, orden invertido', async ({ browser }) => {
  test.setTimeout(600_000)
  for (const ancho of [1440, 390, 390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, isMobile: ancho < 500, hasTouch: ancho < 500 })
    const page = await ctx.newPage()
    await entrarComo(page, 'COBRADOR')
    await page.goto('/cobranzas', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(12000)
    const t = (await page.locator('body').innerText().catch(() => '')) || ''
    console.log(`ancho=${ancho} texto=${t.trim().length} cargando=${/Cargando sesi/.test(t)}`)
    await ctx.close()
  }
})
