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
        /*
         * La respuesta habla de ESTA persona.
         *
         * Antes este fixture devolvía `metricas` con `usuariosActivos: 15` y
         * `dineroCaja: 80000` —cifras de todo el sistema— y la prueba
         * comprobaba que el 15 saliera en pantalla. O sea que fijaba el
         * defecto: el detalle de un usuario enseñando el tablero. El
         * endpoint ya no devuelve eso.
         */
        return route.fulfill({ json: {
          usuarioId: admin.id, rol: admin.rol,
          hizo: {
            desde: '2026-05-02T18:00:00Z', dias: 30,
            pagosRegistrados: { cantidad: 0, monto: 0 },
            creditosCreados: { cantidad: 0, monto: 0 },
            creditosAprobados: { cantidad: 15, monto: 4500000 },
            clientesCreados: { cantidad: 0, monto: null },
            gastosRegistrados: { cantidad: 0, monto: 0 },
            movimientosDeCaja: { cantidad: 0, monto: 0 },
            arqueosDeCaja: { cantidad: 0, monto: null },
            visitasRegistradas: { cantidad: 0, monto: null },
            accionesEnElSistema: { cantidad: 7, monto: null },
          },
          aCargo: { rutasTotal: 0, rutasActivas: 0 },
          cifras: ['creditosAprobados', 'accionesEnElSistema'],
          actividadReciente: Array.from({ length: 7 }, (_, i) => ({
            time: '2026-06-01T18:00:00Z', action: 'Actividad ' + (i + 1), detail: '', type: 'neutral',
          })),
        } })
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
    // Lo que hizo ella: quince créditos aprobados, con su importe.
    await expect(dialogo.getByText('15 créditos')).toBeVisible()
    /*
     * Y NADA del sistema. Si alguien vuelve a meter aquí el dinero en caja de
     * la empresa, esto lo dice: el fixture ya no lo manda, así que la unica
     * forma de que aparezca es que la pantalla se lo invente.
     */
    await expect(dialogo.getByText(/dinero en caja/i)).toHaveCount(0)
    await expect(dialogo.getByText(/usuarios activos/i)).toHaveCount(0)
    await expect(dialogo.getByRole('button', { name: 'Editar datos' })).toHaveCount(0)
    await expect(dialogo.getByRole('button', { name: 'Permisos' })).toHaveCount(0)
    await expect(dialogo.locator('time').first()).toHaveAttribute('datetime', '2026-06-01T18:00:00Z')
    await dialogo.getByRole('button', { name: 'Siguiente' }).click()
    await expect(dialogo.getByText('Actividad 7')).toBeVisible()
    expect(await dialogo.evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialogo).toHaveCount(0)
    await expect(ver).toBeFocused()
  })
}
