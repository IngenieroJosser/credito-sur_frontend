import { expect, test } from '@playwright/test'
import { createHmac, randomBytes } from 'node:crypto'

/**
 * El camino normal de importación: descargar la plantilla, subir el libro
 * integral, ver la vista previa y —solo cuando el entorno lo permite— confirmar
 * la carga de prueba.
 *
 * Se corren dos anchos porque la pantalla es la misma para el contador en el
 * escritorio y para quien la mira en el teléfono: en el ancho de móvil el libro
 * habilita la confirmación; en el de escritorio el servidor no la devuelve, y lo
 * que se comprueba es que la pantalla lo dice en vez de inventar un botón.
 *
 * No se toca ningún backend real: todas las rutas de `/api-credisur/**` van
 * contra dobles, así que la prueba no importa ni escribe datos de nadie.
 */
test('sube el libro integral y confirma solo cuando el servidor lo permite', async ({ page, context, baseURL }) => {
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
  let habilitaConfirmacion = true
  const excel = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const expediente = () => ({
    id: uuid, estado: importado ? 'IMPORTADO' : 'EN_REVISION', revision, huellaCartera: 'abcdef1234c21', actualizadoEn: '2026-11-27T06:00:00Z',
  })
  const decisiones = () => ({ version: 2, versiones: { preparador: '4.0.0', esquema: 2, reglas: 'historicos-4' },
    fuentes: { cartera: 'a', inventario: 'b' }, reglas: {}, filas: [],
    ...(revision > 1 ? { responsable: 'admin-prueba', aprobadasEn: '2026-11-27T05:00:00Z' } : {}),
  })
  const preparacion = () => ({
    expediente: expediente(), total: 2, huella: 'hash-fixture', decisiones: decisiones(),
    casos: revision > 1 ? [] : [{ referencia: 'CREDITO_ARTICULO-fixture-7', tipo: 'CREDITO_ARTICULO',
      hoja: 'Créditos de artículo', fila: 7, excepciones: [{
        campo: 'interpretacion_monto', motivo: 'El monto admite dos interpretaciones', original: 0, propuesta: null,
      }],
    }],
    vistaIntegral: {
      conteos: { inventario: 209, clientes: 143, dinero: 45, articulos: 94 },
      totalErrores: 0, totalAdvertencias: 0, errores: [], advertencias: [],
      filasPorResolver: 0, cuadre: true,
      ...(habilitaConfirmacion ? { seleccion: { inventario: ['ARTICULO-a'], clientes: ['CLIENTE-b'], referencias: ['DINERO-c'] } } : {}),
    },
  })
  const expedienteAbierto = () => ({ expediente: expediente(), total: 2, huella: 'hash-fixture', decisiones: decisiones(), casos: [] })

  await page.route('**/api-credisur/**', async (route) => {
    const url = new URL(route.request().url())
    const metodo = route.request().method()
    if (metodo === 'POST' && url.pathname.includes('/importaciones/')) posteos.push(url.pathname)
    if (url.pathname.endsWith('/plantilla/integral')) {
      return route.fulfill({ contentType: excel, body: Buffer.from([0x50, 0x4b, 0x03, 0x04]) })
    }
    if (url.pathname.endsWith('/integral/validar')) {
      const payload = route.request().postData()
      expect(payload).toContain('name="integral"')
      if (payload?.includes('filename="operativo.xlsx"')) {
        return route.fulfill({ json: {
          operativa: { ...preparacion().vistaIntegral, confirmable: true, seleccion: undefined },
        } })
      }
      expect(payload).toContain('filename="libro-integral-prueba.xlsx"')
      return route.fulfill({ json: preparacion() })
    }
    if (url.pathname.endsWith('/integral/confirmar')) {
      expect(route.request().postData()).toContain('filename="operativo.xlsx"')
      return route.fulfill({ json: { inventario: {}, creditos: {} } })
    }
    if (url.pathname.endsWith('/confirmar-prueba')) {
      expect(route.request().postDataJSON().evidencia).toBe('Carga sintética autorizada')
      importado = true
      return route.fulfill({ json: { ok: true } })
    }
    if (url.pathname.endsWith(`/historicos/expedientes/${uuid}/revisiones`) && metodo === 'POST') {
      expect(route.request().postDataJSON().revision).toBe(1)
      expect(route.request().postData()).toContain('Tarjeta sintética revisada')
      revision = 2
      return route.fulfill({ json: { ...expedienteAbierto(), casos: [] } })
    }
    if (url.pathname.endsWith('/creditos-prueba')) return route.fulfill({ json: [
      { id: creditoPrueba, numeroPrestamo: 'HIST-001-REFERENCIA-HISTORICA-SINTETICA-2026', tipoPrestamo: 'ARTICULO', saldoPendiente: 1250 },
    ] })
    if (url.pathname.endsWith('/simular-abono')) {
      expect(route.request().postDataJSON()).toEqual({ prestamoId: creditoPrueba, monto: 1000 })
      return route.fulfill({ json: { soloSimulacion: true, saldoAnterior: 1250, saldoProyectado: 250,
        capital: 1000, interes: 0, cuotasAfectadas: 1 } })
    }
    if (url.pathname.endsWith('/historicos/expedientes')) return route.fulfill({ json: [expediente()] })
    if (url.pathname.endsWith(`/historicos/expedientes/${uuid}`)) return route.fulfill({ json: expedienteAbierto() })
    if (url.pathname.endsWith('/auth/perfil')) return route.fulfill({ json: usuario })
    return route.fulfill({ json: [] })
  })

  for (const width of [390, 1280]) {
    revision = 1
    importado = false
    habilitaConfirmacion = width === 390
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/admin/sistema/importaciones')

    const integral = page.getByRole('region', { name: 'Importación integral' })
    await expect(integral).toBeVisible()
    const bounds = await integral.boundingBox()
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1)

    // Una sola acción de descarga y una sola zona de arrastre.
    const descargar = page.getByRole('button', { name: 'Descargar plantilla integral' })
    await expect(descargar).toHaveCount(1)
    const descarga = page.waitForEvent('download')
    await descargar.click()
    expect((await descarga).suggestedFilename()).toBe('plantilla-integral-credisur.xlsx')
    await expect(integral.locator('input[type="file"]')).toHaveCount(1)

    await integral.locator('input[type="file"]').setInputFiles({
      name: 'libro-integral-prueba.xlsx', mimeType: excel, buffer: Buffer.from('fixture'),
    })
    await integral.getByRole('button', { name: 'Validar archivo' }).click()

    // La vista previa reutiliza el formato de resultado: conteos y avisos.
    await expect(page.getByText('Vista previa de la importación')).toBeVisible()
    await expect(page.getByText('209')).toBeVisible()
    await expect(page.getByText('143')).toBeVisible()

    if (habilitaConfirmacion) {
      await expect(page.getByText('Listo para confirmar')).toBeVisible()
      await page.getByLabel('Evidencia de autorización de prueba').fill('Carga sintética autorizada')
      await page.getByRole('button', { name: 'Confirmar carga' }).click()
      await expect(integral.getByRole('status')).toContainText('Carga de prueba confirmada')
    } else {
      await expect(page.getByText('este entorno no habilita la carga de prueba', { exact: false })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Confirmar carga' })).toHaveCount(0)
      await page.getByRole('button', { name: 'Cerrar' }).first().click()
    }

    // Consulta un expediente anterior, incluso donde no se puede confirmar otro.
    revision = 2
    importado = true
    await integral.getByText('Herramientas técnicas').click()
    await integral.getByRole('button', { name: 'Expedientes guardados' }).click()
    await integral.getByRole('combobox', { name: 'Expediente', exact: true }).click()
    await page.getByRole('option', { name: /abcdef1234/ }).click()
    await integral.getByRole('button', { name: 'Abrir expediente' }).click()
    await expect(integral.getByText('Expediente abcdef1234 · Revisión 2', { exact: true })).toBeVisible()

    const simulacion = integral.getByRole('region', { name: 'Simulación de abonos' })
    await simulacion.getByRole('button', { name: 'Consultar créditos de prueba' }).click()
    await simulacion.getByRole('combobox', { name: 'Crédito de prueba' }).click()
    await page.getByRole('option', { name: /HIST-001.*Artículo/ }).click()
    await simulacion.getByLabel('Monto en COP').fill('1251')
    await expect(simulacion.getByRole('button', { name: 'Proyectar abono' })).toBeDisabled()
    await simulacion.getByLabel('Monto en COP').fill('1000')
    await simulacion.getByRole('button', { name: 'Proyectar abono' }).click()
    await expect(simulacion.getByRole('status')).toContainText('No se registró un pago ni un movimiento de caja.')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1)

    const archivos = await page.evaluateHandle((tipo) => {
      const transferencia = new DataTransfer()
      transferencia.items.add(new File(['fixture'], 'operativo.xlsx', { type: tipo }))
      return transferencia
    }, excel)
    await integral.getByText('Arrastra el Excel aquí', { exact: true }).dispatchEvent('drop', { dataTransfer: archivos })
    await expect(integral.getByText('operativo.xlsx')).toBeVisible()
    await integral.getByRole('button', { name: 'Validar archivo' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Vista previa de la importación' })
    await expect(dialogo).toBeVisible()
    await expect(dialogo.getByLabel('Evidencia de autorización de prueba')).toHaveCount(0)
    await dialogo.getByRole('button', { name: 'Confirmar carga' }).click()
    await expect(integral.getByRole('status').filter({ hasText: 'Importación confirmada.' })).toBeVisible()
  }

  expect(posteos.filter(url => url.endsWith('/integral/validar'))).toHaveLength(4)
  expect(posteos.filter(url => url.endsWith('/integral/confirmar'))).toHaveLength(2)
  expect(posteos.filter(url => url.endsWith('/confirmar-prueba'))).toHaveLength(1)
})
