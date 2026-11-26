import { expect, test } from '@playwright/test'
import { createHmac, randomBytes } from 'node:crypto'

for (const [vista, width, height] of [['escritorio', 1440, 900], ['móvil', 375, 667]] as const) {
  test(`transferir entre cajas conserva el modo al invertir el sentido (${vista})`, async ({ page, context, baseURL }) => {
    const urlLocal = new URL(baseURL!)
    if (!['localhost', '127.0.0.1'].includes(urlLocal.hostname)) throw new Error('La prueba requiere un frontend local')
    const usuario = { id: 'admin-fixture', nombres: 'Admin', apellidos: 'Prueba', rol: 'SUPER_ADMINISTRADOR', permisos: [] }
    const claims = { sub: usuario.id, rol: usuario.rol, exp: Math.floor(Date.now() / 1000) + 600 }
    const cuerpo = [{ alg: 'HS256', typ: 'JWT' }, claims]
      .map((parte) => Buffer.from(JSON.stringify(parte)).toString('base64url')).join('.')
    const token = cuerpo + '.' + createHmac('sha256', randomBytes(32)).update(cuerpo).digest('base64url')
    await context.addCookies([
      { name: 'token', value: token, url: urlLocal.origin },
      { name: 'user_role', value: usuario.rol, url: urlLocal.origin },
    ])
    await page.addInitScript(({ usuario, token }) => {
      localStorage.setItem('user', JSON.stringify(usuario))
      localStorage.setItem('token', token)
    }, { usuario, token })
    await page.setViewportSize({ width, height })

    const solicitudes: unknown[] = []
    await page.route('**/api-credisur/**', (route) => {
      const ruta = new URL(route.request().url()).pathname
      if (ruta.endsWith('/accounting/transacciones') && route.request().method() === 'POST') {
        solicitudes.push(route.request().postDataJSON())
        return route.fulfill({ status: 201, json: { id: 'movimiento-fixture' } })
      }
      if (ruta.endsWith('/accounting/resumen')) {
        return route.fulfill({ json: { ingresosHoy: 0, egresosHoy: 0, saldoCajas: 60000 } })
      }
      if (ruta.endsWith('/accounting/cajas')) {
        const base = { tipo: 'PRINCIPAL', responsable: 'Admin Prueba', estado: 'ABIERTA' }
        return route.fulfill({ json: [
          { ...base, id: 'principal', codigo: 'CAJA-PRINCIPAL', nombre: 'Caja Principal', saldo: 10000 },
          { ...base, id: 'oficina', codigo: 'CAJA-OFICINA', nombre: 'Caja de Oficina', saldo: 50000 },
        ] })
      }
      if (ruta.endsWith('/accounting/transacciones') || ruta.endsWith('/accounting/ledger/movimientos')) {
        return route.fulfill({ json: { data: [], meta: { total: 0 } } })
      }
      return route.fulfill({ json: [] })
    })

    await page.goto('/admin/contable')
    await expect(page.getByText('Caja de Oficina', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Movimientos', exact: true }).click()
    const modal = page.getByRole('dialog', { name: 'Registrar movimiento' })
    const entreCajas = modal.getByRole('button', { name: 'Entre cajas' })
    const cajaOrigen = modal.getByRole('combobox', { name: 'Caja origen' })
    const cajaDestino = modal.getByRole('combobox', { name: 'Caja destino' })
    const monto = modal.getByRole('textbox', { name: /^Monto/ })
    const transferir = modal.getByRole('button', { name: 'Transferir', exact: true })

    await expect(entreCajas).toHaveAttribute('aria-pressed', 'true')
    await expect(modal.getByRole('region', { name: 'Vista previa de la transferencia' })).toBeVisible()
    await expect(cajaDestino).toHaveText('Caja Principal')
    await expect(transferir).toBeDisabled()
    await cajaOrigen.click()
    await expect(page.getByRole('option', { name: 'Caja Principal' })).toHaveAttribute('aria-disabled', 'true')
    await page.getByRole('option', { name: 'Caja de Oficina' }).click()
    await monto.fill('12500')
    await expect(modal.getByText(/^-\$\s*12\.500$/)).toBeVisible()

    await modal.getByRole('button', { name: 'Intercambiar origen y destino' }).click()
    await expect(entreCajas).toHaveAttribute('aria-pressed', 'true')
    await expect(cajaOrigen).toHaveText('Caja Principal')
    await expect(cajaDestino).toHaveText('Caja de Oficina')
    await expect(monto).toHaveValue('12.500')
    await expect(modal.getByRole('alert')).toHaveText('Saldo insuficiente en Caja Principal.')
    await expect(transferir).toBeDisabled()

    await modal.getByRole('button', { name: 'Externo', exact: true }).click()
    await modal.getByRole('button', { name: 'Egreso', exact: true }).click()
    await expect(modal.getByRole('combobox', { name: 'Caja que entrega' })).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Registrar egreso' })).toBeDisabled()
    await entreCajas.click()
    await expect(cajaOrigen).toHaveText('Caja Principal')
    await expect(cajaDestino).toHaveText('Caja de Oficina')
    await expect(monto).toHaveValue('12.500')
    await monto.fill('9500')

    expect(solicitudes).toHaveLength(0)
    await expect(modal.getByText(/^-\$\s*9\.500$/)).toBeVisible()
    await expect(modal.getByText(/^\+\$\s*9\.500$/)).toBeVisible()
    await expect(transferir).toBeInViewport()
    expect(await modal.evaluate((nodo) => nodo.scrollWidth <= nodo.clientWidth)).toBe(true)
    await transferir.click()
    await expect(modal).toHaveCount(0)
    expect(solicitudes).toEqual([expect.objectContaining({
      tipo: 'TRANSFERENCIA',
      tipoReferencia: 'TRANSFERENCIA',
      cajaOrigenId: 'principal',
      cajaId: 'oficina',
      monto: 9500,
    })])
  })
}
