import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * El caos donde duele: el dinero.
 *
 * Estas no pasan por la pantalla sino por la API, a propósito. Lo que se
 * persigue aquí no es si el botón está bien puesto, sino si el sistema se deja
 * cobrar dos veces, aceptar un importe negativo o guardar un pago mayor que la
 * deuda. Por la pantalla eso se tapa con validaciones de formulario; por la API
 * se ve lo que de verdad protege el servidor, que es lo único que protege cuando
 * el pago entra desde el móvil con mala conexión y se reintenta solo.
 *
 * ## Por qué monta sus propios datos
 *
 * La primera versión de este archivo mandaba los importes imposibles contra un
 * préstamo inventado (`00000000-…`), y era inútil sin que lo pareciera: todos
 * los casos «fallaban» con 404 porque el préstamo no existía, nunca porque la
 * validación de importe los rechazara. Los tres hallazgos que importaban
 * —¿hay tope?, ¿se aceptan centavos?, ¿para de verdad el cobro doble?— quedaban
 * sin respuesta y la prueba salía verde.
 *
 * Así que ahora crea un cliente, un crédito y lo aprueba, y solo entonces
 * ataca. Si el entorno no da para montarlo, se SALTA diciéndolo, en vez de
 * pasar sin haber comprobado nada.
 *
 * Se apoyan en el backend de pruebas (`credito_sur_e2e`), nunca en el de
 * desarrollo, y dejan datos detrás: están pensadas para una base desechable.
 */

const API = process.env.E2E_API || 'http://127.0.0.1:3001/api-credisur'

const USUARIOS = {
  SUPER_ADMINISTRADOR: ['superadmin@creditosur.com', 'SuperAdmin123!'],
  COBRADOR: ['cobrador@credisur.com', 'Cobrador123!'],
} as const

async function token(
  pedir: APIRequestContext,
  quien: keyof typeof USUARIOS,
): Promise<string> {
  const [identificador, contrasena] = USUARIOS[quien]
  const r = await pedir.post(`${API}/auth/login`, {
    data: { identificador, contrasena },
  })
  const j = await r.json()
  return j.access_token
}

/** Lo que hace falta para poder probar pagos de verdad. */
type Escenario = { prestamoId: string; saldo: number }

/**
 * Monta un crédito aprobado y devuelve su id, o `null` si el entorno no da.
 *
 * El orden importa y cada paso puede fallar por un motivo legítimo —no hay
 * ruta, la caja no tiene fondos—, así que cada uno se comprueba y, si falla, se
 * dice cuál fue en vez de arrastrar un `undefined` hasta el final.
 */
async function montarEscenario(
  pedir: APIRequestContext,
  t: string,
): Promise<{ escenario: Escenario | null; motivo: string }> {
  const h = { authorization: `Bearer ${t}` }
  const pedirJson = async (
    metodo: 'GET' | 'POST',
    ruta: string,
    data?: unknown,
  ) => {
    const r = await pedir.fetch(`${API}${ruta}`, {
      method: metodo,
      headers: h,
      data: data as never,
      failOnStatusCode: false,
    })
    return { estado: r.status(), cuerpo: await r.json().catch(() => null) }
  }

  // Una ruta para colgar el cliente. Si ya hay, se reutiliza.
  //
  // Cada listado de esta API envuelve la respuesta a su manera: `/routes`
  // devuelve `{ data, meta }`, `/clients` devuelve `{ clientes, estadisticas }`,
  // `/loans` devuelve `{ prestamos, … }`, `/payments` devuelve `{ pagos, … }` y
  // `/inventory`, `/usuarios` y `/accounting/cajas` devuelven el arreglo pelado.
  // Leer la clave equivocada no da error: da `undefined`, que se convierte en
  // lista vacía y deja la pantalla —o la prueba— en blanco sin decir por qué.
  // Pasó aquí mismo: leyendo `rutas` en vez de `data` esta prueba se saltaba
  // sola diciendo «no hay ninguna ruta» con dos rutas activas en la base.
  const rutas = await pedirJson('GET', '/routes')
  const listaRutas = Array.isArray(rutas.cuerpo)
    ? rutas.cuerpo
    : rutas.cuerpo?.data || rutas.cuerpo?.rutas || []
  if (!listaRutas.length) {
    return { escenario: null, motivo: 'no hay ninguna ruta en la base' }
  }

  const cliente = await pedirJson('POST', '/clients', {
    nombres: 'Caos',
    apellidos: 'Dinero',
    // Documento irrepetible: un documento repetido responde 409 «ya existe»,
    // que es correcto pero dejaría esta prueba sin cliente.
    dni: String(Date.now()).slice(-9),
    telefono: '3000000000',
    direccion: 'Calle del Caos 1',
    rutaId: listaRutas[0].id,
  })
  const clienteId = cliente.cuerpo?.clienteId || cliente.cuerpo?.id
  // Para aprobarlo hace falta el id de la APROBACIÓN, no el del cliente: la
  // ruta es `/clients/approve/:id` pero el `:id` es el de la solicitud. Pasarle
  // el del cliente responde «Aprobación no encontrada», que suena a que el
  // cliente no existe.
  const aprobacionId = cliente.cuerpo?.aprobacionId
  if (!clienteId) {
    return {
      escenario: null,
      motivo: `no se pudo crear el cliente (${cliente.estado})`,
    }
  }

  // El cliente nace «pendiente de aprobación», y mientras lo esté su
  // asignación de ruta no está activa. Sin aprobarlo, crear el crédito falla
  // con «El credito debe quedar asignado a una ruta», que es correcto y no
  // tiene nada que ver con lo que esta prueba quiere medir.
  const aprobadoCliente = await pedirJson(
    'POST',
    `/clients/approve/${aprobacionId}`,
    {},
  )
  if (aprobadoCliente.estado >= 400) {
    return {
      escenario: null,
      motivo: `no se pudo aprobar el cliente (${aprobadoCliente.estado}): ${aprobadoCliente.cuerpo?.message || ''}`,
    }
  }

  const credito = await pedirJson('POST', '/loans', {
    clienteId,
    // La ruta va explícita: aprobar al cliente no deja activa su asignación de
    // ruta al momento, y sin ella el crédito se rechaza con «El credito debe
    // quedar asignado a una ruta». El propio mensaje ofrece esta salida
    // («o indique la ruta»).
    rutaId: listaRutas[0].id,
    tipoPrestamo: 'EFECTIVO',
    monto: 600000,
    plazoMeses: 1,
    cantidadCuotas: 4,
    tasaInteres: 20,
    frecuenciaPago: 'SEMANAL',
    fechaInicio: new Date().toISOString(),
  })
  const prestamoId = credito.cuerpo?.id
  if (!prestamoId) {
    // El motivo más común y legítimo: la caja no tiene saldo para prestar.
    return {
      escenario: null,
      motivo: `no se pudo crear el crédito (${credito.estado}): ${credito.cuerpo?.message || ''}`,
    }
  }

  // Sin aprobar, TODO pago se rechaza por el estado del crédito y la
  // validación de importe no se llega a ejercitar. Fue justo lo que hacía
  // inútil la primera versión de estas pruebas.
  const aprobado = await pedirJson('POST', `/loans/${prestamoId}/approve`, {})
  if (aprobado.estado !== 200) {
    return {
      escenario: null,
      motivo: `no se pudo aprobar el crédito (${aprobado.estado})`,
    }
  }

  const detalle = await pedirJson('GET', `/loans/${prestamoId}`)
  const saldo = Number(
    detalle.cuerpo?.saldoPendiente ?? detalle.cuerpo?.montoPendiente ?? 0,
  )

  return { escenario: { prestamoId, saldo }, motivo: '' }
}

test.describe('El dinero bajo caos', () => {
  test.describe.configure({ mode: 'serial' })

  let escenario: Escenario | null = null
  let motivo = 'todavía no se intentó'

  test.beforeAll(async ({ playwright }) => {
    const pedir = await playwright.request.newContext()
    const t = await token(pedir, 'SUPER_ADMINISTRADOR')
    const r = await montarEscenario(pedir, t)
    escenario = r.escenario
    motivo = r.motivo
    await pedir.dispose()

    // Se dice en voz alta montara o no. Una prueba que se salta sin explicar
    // por qué es un agujero silencioso: el informe sale en verde y nadie sabe
    // que los importes imposibles no se comprobaron. Pasó: se saltaba sola
    // porque leía la clave equivocada del listado de rutas.
    console.log(
      escenario
        ? `[caos-dinero] escenario listo: crédito ${escenario.prestamoId}, saldo ${escenario.saldo}`
        : `[caos-dinero] SIN ESCENARIO, las pruebas de importes NO se ejecutan -> ${motivo}`,
    )
  })

  /**
   * Importes imposibles contra un crédito que SÍ existe.
   *
   * Lo que se exige: que ninguno entre. Un pago negativo resta deuda que nadie
   * pagó; uno de cero ensucia el historial; uno absurdo descuadra la caja del
   * día. Lo que no se exige es QUÉ código devuelve: 400 y 422 valen igual; lo
   * que no vale es un 2xx ni un 500.
   */
  test('la API rechaza importes imposibles en un pago', async ({ request }) => {
    test.skip(!escenario, `sin escenario de pruebas: ${motivo}`)
    const t = await token(request, 'SUPER_ADMINISTRADOR')

    const IMPOSIBLES: Array<[string, unknown]> = [
      ['negativo', -50000],
      ['cero', 0],
      ['texto', 'mucho dinero'],
      ['absurdo', 999999999999999],
      ['nulo', null],
      ['infinito', 1e309],
      ['notacion cientifica', '1e9'],
      // Mayor que la deuda: el crédito se creó por 600.000, así que esto no
      // cabe. Si entrara, el cliente quedaría con saldo a favor inventado.
      ['mayor que la deuda', 99000000],
    ]

    const aceptados: string[] = []
    const reventados: string[] = []

    for (const [nombre, monto] of IMPOSIBLES) {
      const r = await request.post(`${API}/payments`, {
        headers: { authorization: `Bearer ${t}` },
        data: {
          prestamoId: escenario!.prestamoId,
          montoTotal: monto,
          metodoPago: 'EFECTIVO',
        },
        failOnStatusCode: false,
      })
      const s = r.status()
      if (s >= 200 && s < 300) aceptados.push(`${nombre} (${monto}) -> ${s}`)
      if (s >= 500) reventados.push(`${nombre} (${monto}) -> ${s}`)
    }

    expect(
      `aceptados: ${aceptados.join(' | ') || 'ninguno'}`,
    ).toBe('aceptados: ninguno')
    expect(
      `reventados: ${reventados.join(' | ') || 'ninguno'}`,
    ).toBe('reventados: ninguno')
  })

  /**
   * El mismo pago enviado dos veces a la vez.
   *
   * Es el doble clic, y también el reintento automático del móvil cuando la
   * conexión se corta justo después de enviar. Si el sistema no lo detiene, el
   * cliente queda con dos abonos y la caja del cobrador con un descuadre que
   * nadie sabe de dónde salió.
   *
   * Se envían EN PARALELO a propósito: en serie, cualquier comprobación de «ya
   * existe» funciona; en paralelo es donde se ve si hay una llave de
   * idempotencia de verdad.
   *
   * Importante sobre lo que esta prueba afirma: se manda la MISMA
   * `idempotencyKey` en los dos envíos, que es lo que el backend necesita para
   * reconocerlos como el mismo pago. Con llaves distintas el servidor no tiene
   * forma de saberlo y los dos entran —medido: el saldo bajó el doble—. Que las
   * pantallas manden una llave estable, o bloqueen el botón mientras envían, es
   * cosa de cada pantalla y se comprueba aparte.
   */
  test('el mismo pago con la misma llave no entra dos veces', async ({
    request,
  }) => {
    test.skip(!escenario, `sin escenario de pruebas: ${motivo}`)
    const t = await token(request, 'SUPER_ADMINISTRADOR')
    const h = { authorization: `Bearer ${t}` }

    const saldoDe = async () => {
      const r = await request.get(`${API}/loans/${escenario!.prestamoId}`, {
        headers: h,
      })
      const j = await r.json()
      return Number(j.saldoPendiente ?? j.montoPendiente ?? 0)
    }

    const idem = `e2e-doble-${Date.now()}`
    const cuerpo = {
      prestamoId: escenario!.prestamoId,
      montoTotal: 50000,
      metodoPago: 'EFECTIVO',
      idempotencyKey: idem,
    }

    const antes = await saldoDe()

    const [a, b] = await Promise.all([
      request.post(`${API}/payments`, {
        headers: h,
        data: cuerpo,
        failOnStatusCode: false,
      }),
      request.post(`${API}/payments`, {
        headers: h,
        data: cuerpo,
        failOnStatusCode: false,
      }),
    ])

    const despues = await saldoDe()
    const bajo = antes - despues

    // Lo que se vigila es el DINERO, no los códigos: dos respuestas 201 están
    // bien si la segunda devolvió el pago que ya existía. Lo que no puede
    // pasar es que la deuda baje dos veces.
    expect(
      `codigos ${a.status()}/${b.status()}, la deuda bajo ${bajo}`,
    ).toBe(`codigos ${a.status()}/${b.status()}, la deuda bajo 50000`)
  })

  /**
   * Un préstamo con cifras imposibles.
   *
   * Mismo criterio: plazo cero, cuotas negativas, tasa de mil por ciento. Si
   * entra, el cuadro de amortización sale con divisiones por cero o cuotas
   * negativas, y eso llega al contrato que firma el cliente.
   */
  test('la API rechaza un crédito con cifras imposibles', async ({
    request,
  }) => {
    const t = await token(request, 'SUPER_ADMINISTRADOR')

    const CASOS: Array<[string, Record<string, unknown>]> = [
      ['monto negativo', { monto: -100000, cantidadCuotas: 4, tasaInteres: 20 }],
      ['monto cero', { monto: 0, cantidadCuotas: 4, tasaInteres: 20 }],
      ['cero cuotas', { monto: 100000, cantidadCuotas: 0, tasaInteres: 20 }],
      ['cuotas negativas', { monto: 100000, cantidadCuotas: -3, tasaInteres: 20 }],
      ['tasa negativa', { monto: 100000, cantidadCuotas: 4, tasaInteres: -5 }],
      ['tasa absurda', { monto: 100000, cantidadCuotas: 4, tasaInteres: 100000 }],
      [
        'cuotas con decimales',
        { monto: 100000, cantidadCuotas: 2.5, tasaInteres: 20 },
      ],
    ]

    const aceptados: string[] = []
    const reventados: string[] = []

    for (const [nombre, extra] of CASOS) {
      const r = await request.post(`${API}/loans`, {
        headers: { authorization: `Bearer ${t}` },
        data: {
          clienteId: '00000000-0000-4000-8000-000000000000',
          tipoPrestamo: 'EFECTIVO',
          plazoMeses: 1,
          frecuenciaPago: 'MENSUAL',
          fechaInicio: new Date().toISOString(),
          ...extra,
        },
        failOnStatusCode: false,
      })
      const s = r.status()
      if (s >= 200 && s < 300) aceptados.push(`${nombre} -> ${s}`)
      if (s >= 500) reventados.push(`${nombre} -> ${s}`)
    }

    expect(`aceptados: ${aceptados.join(' | ') || 'ninguno'}`).toBe(
      'aceptados: ninguno',
    )
    expect(`reventados: ${reventados.join(' | ') || 'ninguno'}`).toBe(
      'reventados: ninguno',
    )
  })

  /**
   * Un movimiento de caja con importe negativo.
   *
   * El hallazgo más grave de todo el barrido, y el único que creaba dinero: un
   * EGRESO de −3.000.000 sobre una caja con fondos respondía 201 y SUBÍA el
   * saldo en tres millones. La dirección del movimiento la lleva su tipo, no el
   * signo de la cifra, y la única validación que había —`monto >
   * saldoDisponible`— se cumple sola con un negativo. El libro de doble entrada
   * tampoco lo veía, porque las dos patas se invierten juntas y cuadran igual.
   */
  test('un movimiento de caja con importe negativo no mueve el saldo', async ({
    request,
  }) => {
    const t = await token(request, 'SUPER_ADMINISTRADOR')
    const h = { authorization: `Bearer ${t}` }

    const cajas = await request.get(`${API}/accounting/cajas`, { headers: h })
    const lista = await cajas.json().catch(() => [])
    const conFondos = (Array.isArray(lista) ? lista : lista?.cajas || []).find(
      (c: { saldo?: number }) => Number(c.saldo) > 5_000_000,
    )
    test.skip(!conFondos, 'no hay ninguna caja con fondos para la prueba')

    const saldoDe = async () => {
      const r = await request.get(`${API}/accounting/cajas`, { headers: h })
      const l = await r.json()
      const arr = Array.isArray(l) ? l : l?.cajas || []
      return Number(
        arr.find((c: { id: string }) => c.id === conFondos.id)?.saldo ?? NaN,
      )
    }

    const antes = await saldoDe()
    const problemas: string[] = []

    for (const [nombre, tipo, monto] of [
      ['egreso negativo', 'EGRESO', -3_000_000],
      ['ingreso negativo', 'INGRESO', -3_000_000],
      ['cero', 'INGRESO', 0],
    ] as const) {
      const r = await request.post(`${API}/accounting/transacciones`, {
        headers: h,
        data: {
          cajaId: conFondos.id,
          tipo,
          monto,
          descripcion: `caos e2e ${nombre}`,
        },
        failOnStatusCode: false,
      })
      if (r.status() >= 200 && r.status() < 300) {
        problemas.push(`${nombre} fue ACEPTADO (${r.status()})`)
      }
      if (r.status() >= 500) {
        problemas.push(`${nombre} REVENTÓ (${r.status()})`)
      }
    }

    const despues = await saldoDe()
    if (antes !== despues) {
      problemas.push(`el saldo de la caja cambió: ${antes} -> ${despues}`)
    }

    expect(`problemas: ${problemas.join(' | ') || 'ninguno'}`).toBe(
      'problemas: ninguno',
    )
  })

  /**
   * Un cobrador intentando lo que no le toca.
   *
   * No es desconfianza: es que el teléfono del cobrador es el que más se pierde
   * y el que más manos toca. Lo que se exige es que el servidor diga que no,
   * aunque la pantalla nunca le ofrezca el botón.
   */
  test('el cobrador no puede tocar lo que no le toca', async ({ request }) => {
    const t = await token(request, 'COBRADOR')

    const PROHIBIDAS: Array<[string, string, Record<string, unknown> | undefined]> =
      [
        [
          'POST',
          '/usuarios',
          {
            nombres: 'Intruso',
            apellidos: 'Intruso',
            correo: 'x@x.com',
            password: 'Xxxxxxx1!',
            nombreUsuario: 'intruso',
            rol: 'SUPER_ADMINISTRADOR',
          },
        ],
        ['POST', '/roles', { nombre: 'ROL_FALSO' }],
        ['GET', '/backup/status', undefined],
        ['GET', '/reports/financial/summary', undefined],
        [
          'POST',
          '/accounting/transacciones',
          { cajaId: 'x', tipo: 'INGRESO', monto: 1000, descripcion: 'x' },
        ],
        ['POST', '/configuracion', { clave: 'x', valor: 'y' }],
      ]

    const pasaron: string[] = []
    for (const [metodo, ruta, data] of PROHIBIDAS) {
      const r = await request.fetch(`${API}${ruta}`, {
        method: metodo,
        headers: { authorization: `Bearer ${t}` },
        data: data as never,
        failOnStatusCode: false,
      })
      const s = r.status()
      // 401/403 es el sistema diciendo que no. 404 también vale: la ruta no
      // existe para él. Un 400 significa que ATRAVESÓ el permiso y solo falló
      // por los datos, así que cuenta como que pasó.
      if (s !== 401 && s !== 403 && s !== 404) pasaron.push(`${metodo} ${ruta} -> ${s}`)
    }

    expect(`atravesó: ${pasaron.join(' | ') || 'nada'}`).toBe('atravesó: nada')
  })
})
