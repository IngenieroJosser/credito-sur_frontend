import { expect, test } from '@playwright/test'
import { createHmac, randomBytes } from 'node:crypto'

// Datos sintéticos: se comprueba la proyección contable sin hacer movimientos reales.
test('Movimientos muestra importes COP y el resultado por cuenta en ambos historiales', async ({ page, context, baseURL }) => {
  const origen = new URL(baseURL!)
  if (!['localhost', '127.0.0.1'].includes(origen.hostname)) throw new Error('La prueba requiere un frontend local')
  const usuario = { id: 'admin-fixture', nombres: 'Admin', apellidos: 'Prueba', rol: 'SUPER_ADMINISTRADOR', permisos: [] }
  const cuerpo = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: usuario.id, rol: usuario.rol, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url'),
  ].join('.')
  const token = cuerpo + '.' + createHmac('sha256', randomBytes(32)).update(cuerpo).digest('base64url')
  await context.addCookies([{ name: 'token', value: token, url: origen.origin },
    { name: 'user_role', value: usuario.rol, url: origen.origin }])
  await page.addInitScript(({ usuario, token }) => {
    localStorage.setItem('user', JSON.stringify(usuario))
    localStorage.setItem('token', token)
  }, { usuario, token })

  await page.route('**/api-credisur/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/accounting/resumen')) {
      return route.fulfill({ json: { ingresosHoy: 18750, egresosHoy: 12000, saldoCajas: 350000 } })
    }
    if (url.pathname.endsWith('/accounting/ledger/movimientos')) {
      const fecha = (url.searchParams.get('fechaInicio') || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())) + 'T17:00:00Z'
      const base = { fecha, caja: 'Caja de Oficina', cajaId: 'caja', creadoPorId: 'admin-fixture', impactoCaja: 0 }
      const prefijo = url.searchParams.get('accountPrefix')
      const movimiento = prefijo === '3.' ? {
        ...base, id: 'intereses', tipo: 'PAGO', descripcion: 'Intereses de prueba', impactoCaja: 118750,
        accountCode: '1.1.1', accountName: 'Caja de Oficina',
        lineas: [
          { accountCode: '1.1.1', accountName: 'Caja de Oficina', debitAmount: 118750, creditAmount: 0 },
          { accountCode: '1.3.1', accountName: 'Capital', debitAmount: 0, creditAmount: 100000 },
          { accountCode: '3.1', accountName: 'Intereses', debitAmount: 0, creditAmount: 18750 },
        ],
      } : prefijo === '4.' ? {
        ...base, id: 'gasto', tipo: 'GASTO', descripcion: 'Gasto de prueba', accountCode: '4.1',
        lineas: [{ accountCode: '4.1', accountName: 'Gastos', debitAmount: 12000, creditAmount: 0 }],
      } : {
        ...base, id: 'inventario', tipo: 'AJUSTE', descripcion: 'Entrada de inventario por importación — 100084: 3 und a $87266',
        accountCode: '1.5', accountName: 'Inventario', lineas: [],
      }
      return route.fulfill({ json: { data: [movimiento], meta: { total: 1, totalPages: 1 } } })
    }
    return route.fulfill({ json: [] })
  })

  await page.goto('/admin/contable')
  const concepto = page.getByText(/Entrada de inventario por importación.*87\.266/).first()
  await concepto.hover()
  await expect(page.getByRole('tooltip')).toHaveText(/\$\s?87\.266/)
  for (const [tarjeta, titulo, fila, monto] of [
    ['Total Ingresos', 'Historial de Ingresos', 'Intereses de prueba', /18\.750/],
    ['Total Gastos', 'Historial de Egresos', 'Gasto de prueba', /12\.000/],
  ] as const) {
    await page.getByText(tarjeta, { exact: true }).click()
    const modal = page.locator('.capa-modal').filter({ hasText: titulo })
    await expect(modal.getByText(fila, { exact: true })).toBeVisible()
    await expect(modal.getByText(monto).first()).toBeVisible()
    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click()
  }
})
