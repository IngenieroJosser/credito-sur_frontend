import { expect, test } from '@playwright/test'

test('el coordinador cobra en el modal sin salir del listado, en móvil', async ({ page, context, baseURL }) => {
  const origen = new URL(baseURL!)
  if (!['localhost', '127.0.0.1'].includes(origen.hostname)) throw new Error('La prueba requiere un frontend local')
  const usuario = { id: 'coordinador-fixture', rol: 'COORDINADOR', nombres: 'Coord', apellidos: 'Prueba', permisos: [] }
  // La API está simulada: el token no es una credencial de ningún entorno.
  const token = 'e30.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url') + '.fixture'
  await context.addCookies([
    { name: 'token', value: token, url: origen.origin },
    { name: 'user_role', value: usuario.rol, url: origen.origin },
  ])
  await page.addInitScript(({ usuario, token }) => {
    localStorage.setItem('user', JSON.stringify(usuario))
    localStorage.setItem('token', token)
  }, { usuario, token })
  await page.setViewportSize({ width: 375, height: 667 })
  const cliente = { id: 'cliente-fixture', nombres: 'Ana', apellidos: 'Prueba', dni: '101010', telefono: '3001234567',
    nivelRiesgo: 'VERDE', estadoAprobacion: 'APROBADO', fechaRegistro: '2026-01-01', prestamosActivos: 2 }
  const creditos = ['PRES-001', 'ART-002'].map((numeroPrestamo) => ({
    id: numeroPrestamo, numeroPrestamo, clienteId: cliente.id, montoPendiente: 50000, estado: 'ACTIVO',
    producto: numeroPrestamo.startsWith('ART') ? 'Televisor' : 'Préstamo en efectivo', rutaNombre: 'Ruta Uno',
  }))
  await page.route('**/api-credisur/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    if (path.endsWith('/clients')) return route.fulfill({ json: [cliente] })
    if (path.endsWith('/loans')) return route.fulfill({ json: { prestamos: creditos, paginacion: { totalPaginas: 1 } } })
    if (path.endsWith('/payments') && req.method() === 'POST') {
      expect(req.postDataJSON()).toMatchObject({ clienteId: cliente.id, prestamoId: 'ART-002', montoTotal: 17000, metodoPago: 'EFECTIVO' })
      return route.fulfill({ status: 201, json: { pago: { id: 'pago-fixture' }, descomposicion: { saldoNuevo: 33000 } } })
    }
    return route.fulfill({ json: [] })
  })
  await page.goto('/coordinador/clientes')
  await page.getByRole('button', { name: 'Registrar pago en oficina' }).click()
  const modal = page.getByRole('dialog')
  await expect(modal.getByText('Registrar pago en oficina', { exact: true })).toBeVisible()
  const credito = modal.getByRole('combobox', { name: 'Crédito' })
  await expect(credito).toContainText('Selecciona el crédito')
  await credito.click()
  await expect(page.getByRole('listbox', { name: 'Crédito' }).getByRole('option')).toHaveCount(2)
  await page.getByRole('option', { name: /ART-002/ }).click()
  await expect(modal.getByText('Caja de Oficina', { exact: true })).toBeVisible()
  expect(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  await modal.getByLabel('Monto recibido (COP)').fill('17000')
  await modal.getByRole('button', { name: 'Registrar pago en efectivo' }).click()
  await expect(modal.getByText('Pago registrado', { exact: true })).toBeVisible()
  await expect(modal.getByText(/Saldo restante:.*33\.000/)).toBeVisible()
  await expect(page).toHaveURL(/\/coordinador\/clientes$/)
})
