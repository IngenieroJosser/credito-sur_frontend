import { expect, test } from '@playwright/test'

for (const [rol, ruta] of [
  ['COORDINADOR', '/coordinador/reportes'],
  ['SUPER_ADMINISTRADOR', '/admin/reportes/operativos'],
  ['SUPERVISOR', '/supervisor/reportes/operativos'],
] as const) {
  test(`conserva el reporte al cambiar de período: ${rol}`, async ({ page, context, baseURL }) => {
    const origen = new URL(baseURL!)
    if (!['localhost', '127.0.0.1'].includes(origen.hostname)) throw new Error('La prueba requiere un frontend local')
    const usuario = { id: 'coordinador-fixture', rol, nombres: 'Coord', apellidos: 'Prueba', permisos: [] }
    const token = 'e30.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url') + '.fixture'
    await context.addCookies([
      { name: 'token', value: token, url: origen.origin },
      { name: 'user_role', value: usuario.rol, url: origen.origin },
    ])
    await page.addInitScript(({ usuario, token }) => {
      localStorage.setItem('user', JSON.stringify(usuario))
      localStorage.setItem('token', token)
    }, { usuario, token })

    let liberarSemana!: () => void
    const esperaSemana = new Promise<void>((resolve) => { liberarSemana = resolve })
    let fallarMes = true
    await page.route('**/api-credisur/**', async (route) => {
      const url = new URL(route.request().url())
      if (!url.pathname.endsWith('/reports/operational/coordinator')) return route.fulfill({ json: [] })
      const periodo = url.searchParams.get('period')
      if (periodo === 'week') await esperaSemana
      if (periodo === 'month' && fallarMes) return route.fulfill({ status: 503, json: { message: 'Sin conexión' } })
      return route.fulfill({ json: {
        totalRecaudo: 12000, totalMeta: 15000, porcentajeGlobal: 80, totalPrestamosNuevos: 1, totalAfiliaciones: 1,
        totalMontoPrestamosNuevos: 35000, efectividadPromedio: 80,
        rendimientoRutas: [{ id: periodo, ruta: 'Ruta ' + periodo, cobrador: 'Cobrador de prueba',
          meta: 15000, recaudado: 12000, eficiencia: 80, nuevosPrestamos: 1, nuevosClientes: 1 }],
      } })
    })

    await page.goto(ruta)
    await expect(page.getByText('Ruta today', { exact: true }).filter({ visible: true }).first()).toBeVisible()
    try {
      await page.getByRole('button', { name: 'Semana', exact: true }).click()
      await expect(page.getByText(/Actualizando a Semana/i)).toBeVisible()
      await expect(page.getByText('Ruta today', { exact: true }).filter({ visible: true }).first()).toBeVisible()
      await page.getByRole('button', { name: 'Mes', exact: true }).click()
      await expect(page.getByText(/No se pudo actualizar a Mes/i)).toBeVisible()
      await expect(page.getByText('Ruta today', { exact: true }).filter({ visible: true }).first()).toBeVisible()
      fallarMes = false
      await page.getByRole('button', { name: 'Reintentar' }).click()
      await expect(page.getByText('Ruta month', { exact: true }).filter({ visible: true }).first()).toBeVisible()
    } finally {
      liberarSemana()
    }
    await page.getByRole('button', { name: 'Año', exact: true }).click()
    await expect(page.getByText('Ruta year', { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByText('Ruta week', { exact: true })).toHaveCount(0)
  })
}
