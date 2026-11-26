import { expect, test } from '@playwright/test'
import { createHmac, randomBytes } from 'node:crypto'

test('seguimiento de Punto de Venta muestra contado, cliente y método, con más páginas', async ({ page, context, baseURL }) => {
  const origen = new URL(baseURL!)
  if (!['localhost', '127.0.0.1'].includes(origen.hostname)) throw new Error('La prueba requiere un frontend local')
  const usuario = { id: 'admin-fixture', nombres: 'Admin', apellidos: 'Prueba', rol: 'SUPER_ADMINISTRADOR', permisos: [] }
  const cuerpo = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: usuario.id, rol: usuario.rol, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url'),
  ].join('.')
  const token = cuerpo + '.' + createHmac('sha256', randomBytes(32)).update(cuerpo).digest('base64url')
  await context.addCookies([
    { name: 'token', value: token, url: origen.origin },
    { name: 'user_role', value: usuario.rol, url: origen.origin },
  ])
  await page.addInitScript(({ token, usuario }) => {
    localStorage.setItem('user', JSON.stringify(usuario))
    localStorage.setItem('token', token)
  }, { token, usuario })

  const paginasConsultadas: string[] = []
  await page.route('**/api-credisur/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/sales/cash')) {
      const pagina = url.searchParams.get('page') || ''
      paginasConsultadas.push(pagina)
      expect(url.searchParams.get('limit')).toBe('50')
      expect(url.searchParams.get('soloPuntoVenta')).toBe('true')
      const ventas = pagina === '1'
        ? [{ id: 'contado-1', cliente: 'Ana Compradora', monto: 750000, metodoPago: 'TRANSFERENCIA', descripcion: 'Venta de contado TRANSFERENCIA: Nevera', fecha: '2026-11-25T14:00:00Z' }]
        : [{ id: 'contado-2', cliente: 'Luis Comprador', monto: 400000, metodoPago: 'EFECTIVO', descripcion: 'Venta de contado EFECTIVO: Celular', fecha: '2026-11-24T14:00:00Z' }]
      return route.fulfill({
        json: {
          ventas: ventas.map((venta) => ({ ...venta, vendedor: 'Vendedor Prueba', vendedorId: 'pdv-1' })),
          paginacion: { pagina: Number(pagina), limite: 50, total: 51, totalPaginas: 2 },
        },
      })
    }
    if (url.pathname.endsWith('/loans')) {
      return route.fulfill({ json: { prestamos: [], paginacion: { total: 0 } } })
    }
    if (url.pathname.endsWith('/auth/perfil')) return route.fulfill({ json: usuario })
    return route.fulfill({ json: [] })
  })

  await page.goto('/admin/operaciones/punto-de-venta')
  const fila = page.getByRole('row').filter({ hasText: 'Ana Compradora' })
  await expect(fila.getByText('Contado', { exact: true })).toBeVisible()
  await fila.getByRole('button', { name: 'Ver detalle' }).click()
  const detalle = page.getByRole('dialog', { name: 'Ana Compradora' })
  await expect(detalle.getByText('Transferencia', { exact: true })).toBeVisible()
  await expect(detalle.getByText('Progreso de Cuotas', { exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(detalle).toHaveCount(0)
  await page.getByRole('button', { name: 'Cargar más ventas de contado' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Luis Comprador' })).toBeVisible()
  expect(paginasConsultadas).toContain('2')
})
