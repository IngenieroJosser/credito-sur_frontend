import { expect, test } from '@playwright/test'
import { createHmac, randomBytes } from 'node:crypto'

// Datos sintéticos: se comprueba la proyección contable sin hacer movimientos reales.
test('historiales de resultado y movimientos de caja conservan su clasificación y sus diálogos', async ({ page, context, baseURL }) => {
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

  await page.clock.setFixedTime(new Date('2026-11-26T17:00:00Z'))
  await page.route('**/api-credisur/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/accounting/resumen')) {
      return route.fulfill({ json: { ingresosHoy: 18750, egresosHoy: 12000, saldoCajas: 350000 } })
    }
    if (url.pathname.endsWith('/accounting/cajas')) {
      return route.fulfill({ json: [{
        id: 'caja', codigo: 'CAJA-OFICINA', nombre: 'Caja de Oficina', tipo: 'PRINCIPAL',
        responsable: 'Admin Prueba', saldo: 8300000, estado: 'ABIERTA',
      }] })
    }
    if (url.pathname.endsWith('/saldo-en-rango')) {
      return route.fulfill({ json: { saldoPrevio: 0, totalRegistrado: 8300000 } })
    }
    if (url.pathname.endsWith('/accounting/transacciones')) {
      return route.fulfill({ json: { data: [], meta: { total: 0 } } })
    }
    if (url.pathname.endsWith('/accounting/ledger/movimientos')) {
      if (url.searchParams.get('cajaId') === 'caja') {
        const diasAnteriores = (url.searchParams.get('fechaInicio') || '2026-11-26') <= '2026-10-20'
        const baseCaja = { caja: 'Caja de Oficina', cajaId: 'caja', creadoPorId: 'admin-fixture',
          fecha: '2026-10-20T19:38:00-05:00', accountCode: '1.1.1', lineas: [] }
        const data = diasAnteriores ? [
          { ...baseCaja, id: 'recepcion', tipo: 'CONSOLIDACION', direction: 'IN', impactoCaja: 15000000,
            descripcion: 'Consolidación de $15000000 de ruta a oficina' },
          { ...baseCaja, id: 'desembolso', tipo: 'DESEMBOLSO', direction: 'OUT', impactoCaja: -6700000,
            descripcion: 'Desembolso de préstamo por $6700000' },
          { ...baseCaja, id: 'sin-caja', tipo: 'AJUSTE', direction: 'IN', impactoCaja: 0, totalDebito: 800000,
            descripcion: 'Ajuste sin movimiento de caja' },
        ] : []
        return route.fulfill({ json: { data, meta: { total: data.length } } })
      }
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
  await page.getByRole('button', { name: 'Ver Asiento Contable', exact: true }).first().click()
  const asiento = page.getByRole('dialog', { name: 'Detalle de Movimiento' })
  await expect(asiento.getByText('Monto de la operación')).toBeVisible()
  await expect(asiento.getByText(/Entrada de inventario por importación.*87\.266/)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(asiento).toHaveCount(0)
  for (const [tarjeta, titulo, fila, monto] of [
    ['Total Ingresos', 'Historial de Ingresos', 'Intereses de prueba', /18\.750/],
    ['Total Gastos', 'Historial de Egresos', 'Gasto de prueba', /12\.000/],
  ] as const) {
    await page.getByText(tarjeta, { exact: true }).click()
    const modal = page.getByRole('dialog', { name: titulo })
    await expect(modal.getByText(fila, { exact: true })).toBeVisible()
    await expect(modal.getByText(monto).first()).toBeVisible()
    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click()
  }

  await page.getByRole('button', { name: 'Ver', exact: true }).click()
  const detalle = page.getByRole('dialog', { name: 'Detalle de Caja' })
  const movimientos = page.getByRole('dialog', { name: 'Movimientos de Caja' })
  const desdeOctubre = async () => {
    await movimientos.getByRole('button', { name: 'Desde' }).click()
    const calendario = page.getByRole('dialog', { name: 'Calendario de Desde' })
    await calendario.getByRole('button', { name: 'Mes anterior' }).click()
    await calendario.getByRole('button', { name: '20 de octubre de 2026', exact: true }).click()
  }

  await detalle.getByText('Entradas', { exact: true }).click()
  await expect(movimientos.getByText('No hay entradas de caja en el rango.')).toBeVisible()
  await desdeOctubre()
  await expect(movimientos.getByText(/Recepción de.*15\.000\.000/)).toBeVisible()
  await expect(movimientos.getByText('1 registro')).toBeVisible()
  await expect(movimientos.getByText(/Desembolso|Ajuste sin movimiento/)).toHaveCount(0)
  await movimientos.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(detalle.getByText(/8\.300\.000/).first()).toBeVisible()

  await detalle.getByText('Salidas', { exact: true }).click()
  await desdeOctubre()
  await expect(movimientos.getByText(/Desembolso de préstamo por.*6\.700\.000/)).toBeVisible()
  await expect(movimientos.getByText(/^\-\$\s*6\.700\.000$/)).toBeVisible()
  await expect(movimientos.getByText(/Recepción de/)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(movimientos).toHaveCount(0)
  await expect(detalle).toBeVisible()
})
