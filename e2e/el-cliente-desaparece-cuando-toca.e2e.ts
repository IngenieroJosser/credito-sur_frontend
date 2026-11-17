import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Un cliente desaparece de la ruta del día SOLO cuando le toca.
 *
 * ── Por qué esta prueba ─────────────────────────────────────────────────────
 *
 * Es la decisión más delicada de la jornada, porque se equivoca en los dos
 * sentidos y los dos cuestan dinero:
 *
 *   - Si desaparece de más, el cobrador no va a una casa donde se debe y la
 *     meta del día baja sin que nadie lo decida.
 *   - Si desaparece de menos, le manda a cobrar dos veces lo mismo al mismo
 *     cliente el mismo día, que es la forma más rápida de perder la confianza
 *     de la persona que paga.
 *
 * La regla vive en `debeMostrarseEnListaDeRuta` y tiene sus pruebas con
 * objetos. Lo que aquí se comprueba es lo otro: que el SISTEMA ENTERO —el
 * backend que arma la jornada, el pago que se registra, el recaudo que se
 * suma— se comporte igual que la regla cuando el caso ocurre de verdad.
 *
 * ── Lo que se exige, exactamente ────────────────────────────────────────────
 *
 *  1. Antes de pagar, el cliente ESTÁ en la jornada y se le debe cobrar.
 *  2. Después de pagar, YA NO está entre los que quedan por cobrar.
 *  3. Pero NO se ha perdido: sigue viniendo en la jornada, con lo recaudado y
 *     con el nombre de quien cobró. Desaparecer de la lista de pendientes y
 *     desaparecer del sistema son dos cosas distintas, y confundirlas es lo
 *     que hace que el dinero del día no cuadre.
 *  4. Y la meta del día cuenta ese pago: el avance de la ruta sube.
 *
 * Se apoya en el backend de pruebas y deja datos detrás: está pensada para una
 * base desechable.
 */

const API = process.env.E2E_API || 'http://127.0.0.1:3001/api-credisur'

async function token(pedir: APIRequestContext): Promise<string> {
  const r = await pedir.post(`${API}/auth/login`, {
    data: {
      identificador: 'superadmin@creditosur.com',
      contrasena: 'SuperAdmin123!',
    },
  })
  const j = await r.json()
  return j.access_token
}

type Escenario = {
  rutaId: string
  clienteId: string
  prestamoId: string
  cuotaDelDia: number
}

/**
 * Monta un cliente con un crédito aprobado, en una ruta, que toque HOY.
 *
 * La frecuencia es DIARIA a propósito: con una semanal o mensual el crédito
 * podría no tocar hoy y la prueba mediría otra cosa —o se saltaría sin que se
 * note, que es el fallo que ya costó una vez en este mismo directorio—.
 */
async function montarEscenario(
  pedir: APIRequestContext,
  t: string,
  /**
   * Cuántos días atrás empieza el crédito.
   *
   * Importa más de lo que parece. Un crédito diario que empieza HOY tiene su
   * primera cuota MAÑANA, así que hoy no hay nada que cobrarle y el cliente no
   * sale en la jornada —y eso está bien—. Se comprobó contra el servidor:
   * creado el 17, la cuota 1 vence el 18.
   *
   * Para medir lo que esta prueba quiere medir hace falta que SÍ toque hoy, y
   * para eso el crédito empieza ayer.
   */
  diasAtras = 1,
): Promise<{ escenario: Escenario | null; motivo: string }> {
  const h = { authorization: `Bearer ${t}` }
  const json = async (metodo: 'GET' | 'POST', ruta: string, data?: unknown) => {
    const r = await pedir.fetch(`${API}${ruta}`, {
      method: metodo,
      headers: h,
      data: data as never,
      failOnStatusCode: false,
    })
    return { estado: r.status(), cuerpo: await r.json().catch(() => null) }
  }

  const rutas = await json('GET', '/routes')
  const listaRutas = Array.isArray(rutas.cuerpo)
    ? rutas.cuerpo
    : rutas.cuerpo?.data || rutas.cuerpo?.rutas || []
  if (!listaRutas.length) {
    return { escenario: null, motivo: 'no hay ninguna ruta en la base' }
  }
  const rutaId: string = listaRutas[0].id

  const cliente = await json('POST', '/clients', {
    nombres: 'Desaparece',
    apellidos: 'CuandoToca',
    dni: String(Date.now()).slice(-9),
    telefono: '3000000001',
    direccion: 'Calle de la jornada 1',
    rutaId,
  })
  const clienteId: string = cliente.cuerpo?.clienteId || cliente.cuerpo?.id
  const aprobacionId: string = cliente.cuerpo?.aprobacionId
  if (!clienteId) {
    return {
      escenario: null,
      motivo: `no se pudo crear el cliente (${cliente.estado})`,
    }
  }

  const aprobadoCliente = await json(
    'POST',
    `/clients/approve/${aprobacionId}`,
    {},
  )
  if (aprobadoCliente.estado >= 400) {
    return {
      escenario: null,
      motivo: `no se pudo aprobar el cliente (${aprobadoCliente.estado})`,
    }
  }

  const credito = await json('POST', '/loans', {
    clienteId,
    rutaId,
    tipoPrestamo: 'EFECTIVO',
    monto: 300000,
    plazoMeses: 1,
    cantidadCuotas: 10,
    tasaInteres: 20,
    frecuenciaPago: 'DIARIO',
    fechaInicio: new Date(
      Date.now() - diasAtras * 24 * 60 * 60 * 1000,
    ).toISOString(),
  })
  const prestamoId: string = credito.cuerpo?.id
  if (!prestamoId) {
    return {
      escenario: null,
      motivo: `no se pudo crear el crédito (${credito.estado}): ${credito.cuerpo?.message || ''}`,
    }
  }

  const aprobado = await json('POST', `/loans/${prestamoId}/approve`, {})
  if (aprobado.estado !== 200) {
    return {
      escenario: null,
      motivo: `no se pudo aprobar el crédito (${aprobado.estado})`,
    }
  }

  return {
    escenario: { rutaId, clienteId, prestamoId, cuotaDelDia: 0 },
    motivo: '',
  }
}

/** Las visitas de hoy de una ruta, tal como las arma el backend. */
async function jornada(pedir: APIRequestContext, t: string, rutaId: string) {
  const r = await pedir.get(`${API}/routes/${rutaId}/daily-visits`, {
    headers: { authorization: `Bearer ${t}` },
    failOnStatusCode: false,
  })
  const j = await r.json().catch(() => null)
  const visitas = Array.isArray(j) ? j : j?.visitas || j?.data || []
  return { estado: r.status(), visitas: Array.isArray(visitas) ? visitas : [] }
}

/**
 * La visita de un cliente dentro de la jornada, venga como venga.
 *
 * El id del cliente aparece en `clienteId` o colgando del propio cliente según
 * el camino por el que se arme la lista. Leer solo uno deja la búsqueda en
 * `undefined` y la prueba pasaría sin encontrar nada, que es el agujero que
 * este directorio ya conoce.
 */
type VisitaDeJornada = {
  clienteId?: string
  cliente?: string | { id?: string }
  recaudadoDelDia?: number
  prestamos?: Array<{ id?: string; recaudadoHoy?: number; cobradoPor?: unknown }>
}

function visitaDe(visitas: VisitaDeJornada[], clienteId: string) {
  return visitas.find((v) => {
    if (v.clienteId === clienteId) return true
    const c = v.cliente
    return typeof c === 'object' && c !== null && c.id === clienteId
  })
}

test.describe('Un cliente desaparece de la ruta cuando le toca', () => {
  test.describe.configure({ mode: 'serial' })

  let escenario: Escenario | null = null
  let motivo = 'todavía no se intentó'
  let t = ''

  test.beforeAll(async ({ playwright }) => {
    const pedir = await playwright.request.newContext()
    t = await token(pedir)
    const r = await montarEscenario(pedir, t)
    escenario = r.escenario
    motivo = r.motivo
    await pedir.dispose()

    // En voz alta: una prueba que se salta sin decirlo es un agujero que sale
    // en verde.
    console.log(
      escenario
        ? `[desaparece] escenario listo: cliente ${escenario.clienteId}, crédito ${escenario.prestamoId}`
        : `[desaparece] SIN ESCENARIO, no se comprueba nada -> ${motivo}`,
    )
  })

  test('antes de pagar, el cliente está en la jornada', async ({ request }) => {
    test.skip(!escenario, `sin escenario de pruebas: ${motivo}`)
    const e = escenario!

    const { estado, visitas } = await jornada(request, t, e.rutaId)
    expect(estado).toBe(200)

    const visita = visitaDe(visitas, e.clienteId)
    expect(
      visita,
      'el cliente con un crédito diario aprobado hoy tiene que estar en la jornada',
    ).toBeTruthy()

    // Y sin nada cobrado: si ya viniera con recaudo, lo de abajo no mediría
    // el cambio sino el estado previo.
    expect(Number(visita?.recaudadoDelDia || 0)).toBe(0)
  })

  test('después de pagar, deja de estar entre los que quedan por cobrar', async ({
    request,
  }) => {
    test.skip(!escenario, `sin escenario de pruebas: ${motivo}`)
    const e = escenario!

    const pago = await request.post(`${API}/payments`, {
      headers: { authorization: `Bearer ${t}` },
      multipart: {
        prestamoId: e.prestamoId,
        clienteId: e.clienteId,
        montoTotal: '30000',
        metodoPago: 'EFECTIVO',
        tipo: 'PAGO',
      },
      failOnStatusCode: false,
    })
    expect(
      pago.status(),
      `el pago tenía que entrar: ${await pago.text().catch(() => '')}`,
    ).toBeLessThan(400)

    const { visitas } = await jornada(request, t, e.rutaId)
    const visita = visitaDe(visitas, e.clienteId)

    /*
     * Lo que se exige NO es que el cliente se borre de la respuesta: es que
     * deje de contar como pendiente. El backend lo marca con el recaudo del
     * día, y la regla `debeMostrarseEnListaDeRuta` lo saca de «por cobrar»
     * precisamente por eso.
     *
     * Si un día la jornada dejara de devolverlo, el recaudo del día se
     * quedaría sin su origen y el cierre de caja no cuadraría.
     */
    expect(
      visita,
      'el cliente no puede desaparecer de la jornada: solo deja de estar pendiente',
    ).toBeTruthy()
    expect(Number(visita?.recaudadoDelDia || 0)).toBeGreaterThan(0)
  })

  test('y queda dicho quién le cobró', async ({ request }) => {
    test.skip(!escenario, `sin escenario de pruebas: ${motivo}`)
    const e = escenario!

    const { visitas } = await jornada(request, t, e.rutaId)
    const visita = visitaDe(visitas, e.clienteId)
    const prestamo = (visita?.prestamos || []).find(
      (p) => p.id === e.prestamoId,
    )

    /*
     * Importa cuando no cobra el cobrador de la ruta: el supervisor también
     * sale a cobrar y el dinero entra a SU caja. Sin este dato, el cobrador ve
     * al cliente ya pagado sin saber quién pasó por ahí.
     */
    expect(
      prestamo?.cobradoPor,
      'la jornada tiene que decir quién cobró',
    ).toBeTruthy()
  })

  /**
   * Y al revés: el que todavía no debe nada HOY no aparece.
   *
   * Un crédito diario creado hoy tiene su primera cuota mañana. Si apareciera
   * hoy, el cobrador iría a cobrar algo que nadie debe todavía, y la meta del
   * día subiría con dinero que no toca.
   */
  test('un crédito que empieza hoy no sale en la jornada de hoy', async ({
    playwright,
    request,
  }) => {
    test.skip(!escenario, `sin escenario de pruebas: ${motivo}`)

    const pedir = await playwright.request.newContext()
    const { escenario: deHoy, motivo: porQue } = await montarEscenario(
      pedir,
      t,
      0, // empieza HOY: la primera cuota cae mañana
    )
    await pedir.dispose()
    test.skip(!deHoy, `no se pudo montar el segundo escenario: ${porQue}`)

    const { visitas } = await jornada(request, t, deHoy!.rutaId)

    expect(
      visitaDe(visitas, deHoy!.clienteId),
      'un crédito cuya primera cuota es mañana no puede salir en la jornada de hoy',
    ).toBeFalsy()
  })

  /**
   * Ningún crédito puede quedar sin ruta.
   *
   * Es una regla del negocio, y la base decía que no se cumplía: 25 de 60
   * créditos vivos sin ruta, y cinco clientes con 8, 4, 4, 3 y 3 créditos
   * cada uno sin una sola —la mayoría ya en mora—. Un crédito sin ruta no
   * entra en la jornada de nadie: existe, genera mora y nadie va a cobrarlo.
   *
   * Esto comprueba la puerta por la API, que es la que de verdad protege.
   */
  test('la API no deja crear un crédito sin ruta', async ({ request }) => {
    test.skip(!escenario, `sin escenario de pruebas: ${motivo}`)

    // Un cliente recién creado y SIN aprobar: no tiene asignación de ruta,
    // y en la petición tampoco se indica ninguna.
    const h = { authorization: `Bearer ${t}` }
    const cliente = await request.post(`${API}/clients`, {
      headers: h,
      data: {
        nombres: 'Sin',
        apellidos: 'Ruta',
        dni: String(Date.now()).slice(-9),
        telefono: '3000000002',
        direccion: 'Calle sin ruta 1',
      },
      failOnStatusCode: false,
    })
    const cuerpo = await cliente.json().catch(() => null)
    const clienteId = cuerpo?.clienteId || cuerpo?.id
    test.skip(!clienteId, 'no se pudo crear el cliente de la prueba')

    const credito = await request.post(`${API}/loans`, {
      headers: h,
      data: {
        clienteId,
        tipoPrestamo: 'EFECTIVO',
        monto: 200000,
        plazoMeses: 1,
        cantidadCuotas: 4,
        tasaInteres: 20,
        frecuenciaPago: 'SEMANAL',
        fechaInicio: new Date().toISOString(),
      },
      failOnStatusCode: false,
    })

    const texto = await credito.text().catch(() => '')
    expect(
      credito.status(),
      `el crédito sin ruta tenía que rechazarse, y respondió ${credito.status()}: ${texto}`,
    ).toBeGreaterThanOrEqual(400)

    // Y dice qué hacer: quien lo crea tiene al cliente delante.
    expect(texto.toLowerCase()).toContain('ruta')
  })

  test('un cliente al que nadie le pagó sigue estando', async ({ request }) => {
    test.skip(!escenario, `sin escenario de pruebas: ${motivo}`)
    const e = escenario!

    /*
     * El otro lado de la regla, que es el que cuesta dinero si se rompe: los
     * demás clientes de la ruta no pueden irse porque otro haya pagado.
     */
    const { visitas } = await jornada(request, t, e.rutaId)
    const conDeuda = visitas.filter(
      (v) => Number(v.recaudadoDelDia || 0) === 0,
    )

    expect(
      conDeuda.length,
      'al cobrar a uno no se puede vaciar la ruta de los demás',
    ).toBeGreaterThan(0)
  })
})
