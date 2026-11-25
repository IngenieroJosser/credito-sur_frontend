import { expect, test } from '@playwright/test'
import { createHmac, randomBytes } from 'node:crypto'

const admin = {
  id: 'administracion', nombres: 'Ana', apellidos: 'Prueba', rol: 'SUPER_ADMINISTRADOR',
  estado: 'ACTIVO', correo: 'ana@example.test', permisos: [], creadoEn: '2026-06-01T18:00:00Z',
}

for (const [vista, width, height] of [['escritorio', 1440, 900], ['móvil', 375, 667]] as const) {
  test(`detalle de usuario en ${vista}: error, reintento y actividad`, async ({ page, context, baseURL }) => {
    const url = new URL(baseURL!)
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Esta prueba solo se ejecuta en local')
    await page.setViewportSize({ width, height })
    // Token sintético firmado con una clave efímera, válido solo como fixture de UI.
    const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({ sub: admin.id, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')].join('.')
    const token = jwt + '.' + createHmac('sha256', randomBytes(32)).update(jwt).digest('base64url')
    await context.addCookies(['token', 'user_role'].map((name) => ({
      name, value: name === 'token' ? token : admin.rol, url: url.origin,
    })))
    await page.addInitScript(({ usuario, token }) => {
      localStorage.setItem('user', JSON.stringify(usuario))
      localStorage.setItem('token', token)
    }, { usuario: admin, token })
    let fallar = true
    await page.route('**/api-credisur/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/operational-detail')) {
        if (fallar) return route.fulfill({ status: 503, json: { message: 'No disponible' } })
        return route.fulfill({ json: { usuarioId: admin.id, rol: admin.rol, metricas: {
          usuariosActivos: 15, rutasActivas: 3, rutasTotal: 4, dineroCaja: 80000, balanceDia: 0,
          actividadReciente: Array.from({ length: 7 }, (_, i) => ({
            time: '2026-06-01T18:00:00Z', action: 'Actividad ' + (i + 1), detail: '', type: 'neutral',
          })),
        } } })
      }
      if (path.endsWith('/usuarios')) return route.fulfill({ json: [admin] })
      if (path.endsWith('/auth/perfil')) return route.fulfill({ json: admin })
      return route.fulfill({ json: [] })
    })
    await page.goto('/users')
    const ver = page.getByRole('button', { name: 'Ver detalle' }).first()
    await ver.click()
    const dialogo = page.getByRole('dialog', { name: 'Detalle de Ana Prueba' })
    await expect(dialogo.getByRole('alert')).toBeVisible()
    await expect(dialogo.getByText('Sin actividad registrada.')).toHaveCount(0)
    fallar = false
    await dialogo.getByRole('button', { name: 'Reintentar' }).click()
    await expect(dialogo.getByText('15', { exact: true })).toBeVisible()
    await expect(dialogo.getByRole('button', { name: 'Desactivar' })).toHaveCount(0)
    await expect(dialogo.locator('time').first()).toHaveAttribute('datetime', '2026-06-01T18:00:00Z')
    await dialogo.getByRole('button', { name: 'Siguiente' }).click()
    await expect(dialogo.getByText('Actividad 7')).toBeVisible()
    expect(await dialogo.evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialogo).toHaveCount(0)
    await expect(ver).toBeFocused()
  })
}
