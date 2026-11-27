import { expect, test } from '@playwright/test'
import { createHmac, randomBytes } from 'node:crypto'

test('prepara un consolidado en móvil y escritorio sin confirmar importaciones', async ({ page, context, baseURL }) => {
  const origen = new URL(baseURL!)
  if (!['localhost', '127.0.0.1'].includes(origen.hostname)) throw new Error('La prueba requiere un frontend local')
  const usuario = { id: 'admin-prueba', nombres: 'Admin', apellidos: 'Prueba', rol: 'SUPER_ADMINISTRADOR', permisos: [] }
  const cuerpo = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: usuario.id, rol: usuario.rol, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url'),
  ].join('.')
  const token = cuerpo + '.' + createHmac('sha256', randomBytes(32)).update(cuerpo).digest('base64url')
  await context.addCookies([
    { name: 'token', value: token, url: origen.origin },
    { name: 'user_role', value: usuario.rol, url: origen.origin },
  ])
  await page.addInitScript(({ usuario, token }) => {
    localStorage.setItem('user', JSON.stringify(usuario))
    localStorage.setItem('token', token)
  }, { usuario, token })

  const posteos: string[] = []
  const uuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const creditoPrueba = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  let revision = 1
  let importado = false
  const expediente = () => ({
    id: uuid, estado: importado ? 'IMPORTADO' : 'EN_REVISION', revision, huellaCartera: 'abcdef1234c21', actualizadoEn: '2026-11-27T06:00:00Z',
  })
  const respuesta = () => ({
    expediente: expediente(), total: 2, huella: 'hash-fixture',
    decisiones: { version: 2, versiones: { preparador: '4.0.0', esquema: 2, reglas: 'historicos-4' },
      fuentes: { cartera: 'a', inventario: 'b' }, reglas: {}, filas: [],
      ...(revision > 1 ? { responsable: 'admin-prueba', aprobadasEn: '2026-11-27T05:00:00Z' } : {}),
    },
    casos: revision > 1 ? [] : [{ referencia: 'CREDITO_ARTICULO-fixture-7', tipo: 'CREDITO_ARTICULO',
      hoja: 'Créditos de artículo', fila: 7, excepciones: [{
        campo: 'interpretacion_monto', motivo: 'El monto admite dos interpretaciones', original: 0, propuesta: null,
      }],
    }],
  })
  await page.route('**/api-credisur/**', async (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === 'POST' && url.pathname.includes('/importaciones/')) posteos.push(url.pathname)
    if (url.pathname.endsWith(`/historicos/expedientes/${uuid}/revisiones`) && route.request().method() === 'POST') {
      expect(route.request().postDataJSON().revision).toBe(1)
      expect(route.request().postData()).toContain('Tarjeta sintética revisada')
      expect(route.request().postDataJSON().decisiones.rechazos[0].campo).toBe('interpretacion_monto')
      revision = 2
      return route.fulfill({ json: respuesta() })
    }
    if (url.pathname.endsWith('/creditos-prueba')) return route.fulfill({ json: [
      { id: creditoPrueba, numeroPrestamo: 'HIST-001-REFERENCIA-HISTORICA-SINTETICA-2026-PARA-UNA-VENTA-DE-INVENTARIO-EN-CUOTAS', tipoPrestamo: 'ARTICULO', saldoPendiente: 1250 },
    ] })
    if (url.pathname.endsWith('/simular-abono')) {
      expect(route.request().postDataJSON()).toEqual({ prestamoId: creditoPrueba, monto: 1000 })
      return route.fulfill({ json: { soloSimulacion: true, saldoAnterior: 1250, saldoProyectado: 250,
        capital: 1000, interes: 0, cuotasAfectadas: 1 } })
    }
    if (url.pathname.endsWith('/historicos/expedientes')) return route.fulfill({ json: [expediente()] })
    if (url.pathname.endsWith(`/historicos/expedientes/${uuid}`)) return route.fulfill({ json: respuesta() })
    if (url.pathname.endsWith('/historicos/preparar')) {
      const payload = route.request().postData()
      expect(payload).toContain('filename="cartera-prueba.xlsx"')
      expect(payload).toContain('filename="inventario-prueba.xlsx"')
      if (url.searchParams.get('modo') === 'revisar') return route.fulfill({ json: respuesta() })
      expect(payload).not.toContain('name="decisiones"')
      return route.fulfill({
        body: Buffer.from('respuesta sintética'),
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': 'attachment; filename="consolidado-historico-revision.xlsx"',
        },
      })
    }
    if (url.pathname.endsWith('/auth/perfil')) return route.fulfill({ json: usuario })
    return route.fulfill({ json: [] })
  })

  for (const width of [390, 1280]) {
    revision = 1
    importado = false
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/admin/sistema/importaciones')
    const preparacion = page.getByRole('region', { name: 'Preparación histórica' })
    await expect(preparacion).toBeVisible()
    const bounds = await preparacion.boundingBox()
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1)
    await expect(page.getByRole('button', { name: 'Descargar Plantilla integral' })).toBeVisible()
    const excel = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    await preparacion.getByLabel('Archivo de cartera').setInputFiles({ name: 'cartera-prueba.xlsx', mimeType: excel, buffer: Buffer.from('fixture') })
    await preparacion.getByLabel('Archivo de inventario').setInputFiles({ name: 'inventario-prueba.xlsx', mimeType: excel, buffer: Buffer.from('fixture') })
    const descargando = page.waitForEvent('download')
    await preparacion.getByRole('button', { name: 'Descargar consolidado' }).click()
    expect((await descargando).suggestedFilename()).toBe('consolidado-historico-revision.xlsx')
    await expect(preparacion.getByRole('status')).toContainText('No se registró una importación')
    await preparacion.getByRole('button', { name: 'Revisar archivos' }).click()
    await expect(preparacion.getByText('Original: 0')).toBeVisible()
    await preparacion.getByLabel('Evidencia', { exact: true }).fill('Tarjeta sintética revisada')
    await preparacion.getByRole('button', { name: 'Añadir decisión' }).click()
    await preparacion.getByRole('button', { name: 'Registrar y reevaluar' }).click()
    await expect(preparacion.getByRole('button', { name: 'Descargar decisiones registradas' })).toBeVisible()
    await expect(preparacion.getByText('0 por revisar')).toBeVisible()

    importado = true
    await page.reload()
    await preparacion.getByRole('button', { name: 'Expedientes guardados' }).click()
    await preparacion.getByRole('combobox', { name: 'Expediente', exact: true }).click()
    await page.getByRole('option', { name: /abcdef1234/ }).click()
    await preparacion.getByRole('button', { name: 'Abrir expediente' }).click()
    await expect(preparacion.getByText('Expediente abcdef1234 · Revisión 2', { exact: true })).toBeVisible()
    await expect(preparacion.getByText('0 por revisar')).toBeVisible()
    const simulacion = preparacion.getByRole('region', { name: 'Simulación de abonos' })
    await simulacion.getByRole('button', { name: 'Consultar créditos de prueba' }).click()
    await simulacion.getByRole('combobox', { name: 'Crédito de prueba' }).click()
    await page.getByRole('option', { name: /HIST-001.*Artículo/ }).click()
    await simulacion.getByLabel('Monto en COP').fill('1251')
    await expect(simulacion.getByRole('button', { name: 'Proyectar abono' })).toBeDisabled()
    await simulacion.getByLabel('Monto en COP').fill('1000')
    await simulacion.getByRole('button', { name: 'Proyectar abono' }).click()
    await expect(simulacion.getByRole('status')).toContainText('No se registró un pago ni un movimiento de caja.')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1)
  }
  expect(posteos).toHaveLength(8)
  expect(posteos.filter(url => url.endsWith('/simular-abono'))).toHaveLength(2)
  expect(posteos.filter(url => url.endsWith('/revisiones'))).toHaveLength(2)
  expect(posteos.every(url => !url.includes('confirmar'))).toBe(true)
})
