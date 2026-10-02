import {
  codigoDeError,
  datosParaRegistro,
  estadoDeError,
  mensajeDeError,
} from '@/lib/mensaje-de-error'
import { esApiError } from '@/lib/api/api'

/**
 * Que el motivo del backend llegue a la pantalla.
 *
 * Diez manejadores de exportación hacían `catch { toast.error('Error al
 * exportar') }`. El backend explicaba el problema, `exportService` sacaba ese
 * texto de la respuesta, y la pantalla lo tiraba. El usuario volvía a pulsar un
 * botón que no iba a funcionar nunca.
 */
describe('mensajeDeError', () => {
  it('usa el mensaje del Error', () => {
    const real = 'El artículo CEL-A15 tiene 4 plazos y la plantilla admite 3.'
    expect(mensajeDeError(new Error(real), 'Error al exportar')).toBe(real)
  })

  it('saca el mensaje del cuerpo de una respuesta de axios', () => {
    const fallo = { response: { data: { message: 'El dump no está disponible.' } } }
    expect(mensajeDeError(fallo, 'Error al exportar')).toBe('El dump no está disponible.')
  })

  it('junta los mensajes cuando el backend manda varios', () => {
    // Es lo que devuelve la validación de Nest: un array de motivos.
    const fallo = { response: { data: { message: ['Falta el monto', 'Falta la fecha'] } } }
    expect(mensajeDeError(fallo, 'Error')).toBe('Falta el monto · Falta la fecha')
  })

  it('acepta un texto suelto', () => {
    expect(mensajeDeError('Sin conexión', 'Error')).toBe('Sin conexión')
  })

  it('usa el respaldo cuando no hay nada legible', () => {
    for (const nada of [null, undefined, {}, 0, new Error('')]) {
      expect(mensajeDeError(nada, 'Error al exportar')).toBe('Error al exportar')
    }
  })

  it('no se cae con un error raro', () => {
    expect(() => mensajeDeError(Symbol('x'), 'Error')).not.toThrow()
    expect(mensajeDeError(Symbol('x'), 'Error')).toBe('Error')
  })
})

/**
 * El estado HTTP se leia a mano en 53 sitios y con tres cadenas distintas segun
 * el fichero: `statusCode`, `response.status` y `status`. Depende de como se lanzo
 * el fallo —`apiRequest` pone la primera, axios la segunda, un `Response` de fetch
 * la tercera—, asi que la misma comprobacion se comportaba distinto segun donde
 * estuviera escrita. De esto cuelga, entre otras cosas, que el sync offline NO
 * reintente un 401.
 */
describe('mensajeDeError con el motivo un nivel mas adentro', () => {
  it('lo saca de `error.message` cuando no hay uno arriba', () => {
    const fallo = { error: { message: 'La jornada anterior sigue abierta.' } }
    expect(mensajeDeError(fallo, 'respaldo')).toBe('La jornada anterior sigue abierta.')
  })

  it('prefiere el de arriba cuando estan los dos, como hacian las cadenas', () => {
    const fallo = { message: 'arriba', error: { message: 'adentro' } }
    expect(mensajeDeError(fallo, 'respaldo')).toBe('arriba')
  })
})

describe('estadoDeError', () => {
  it('lee el statusCode que pone apiRequest', () => {
    expect(estadoDeError({ statusCode: 401 })).toBe(401)
  })

  it('lee el status del cuerpo de axios', () => {
    expect(estadoDeError({ response: { status: 403 } })).toBe(403)
  })

  it('lee el status suelto de un Response de fetch', () => {
    expect(estadoDeError({ status: 500 })).toBe(500)
  })

  it('prefiere statusCode cuando estan los dos, como hacian las cadenas', () => {
    expect(estadoDeError({ statusCode: 401, response: { status: 500 } })).toBe(401)
  })

  it('devuelve undefined cuando no hay estado, sin reventar', () => {
    expect(estadoDeError(new Error('red caida'))).toBeUndefined()
    expect(estadoDeError(null)).toBeUndefined()
    expect(estadoDeError('texto')).toBeUndefined()
    expect(estadoDeError(undefined)).toBeUndefined()
  })

  it('un estado que llega como texto se devuelve como numero', () => {
    // Pasa cuando el error viaja serializado por la cola offline.
    expect(estadoDeError({ statusCode: '401' })).toBe(401)
  })

  it('no confunde un 401 ausente con un 401 presente', () => {
    // La comprobacion que decide si el sync reintenta es `=== 401`, asi que
    // devolver 0 o NaN en vez de undefined cambiaria la decision.
    expect(estadoDeError({ statusCode: 'no es un numero' })).toBeUndefined()
  })
})

describe('las formas que llegan desenvueltas', () => {
  it('mensajeDeError lee `data.message` sin `response` delante', () => {
    // 14 sitios lo leian a mano asi: el cuerpo llega desenvuelto segun por donde
    // pase el fallo.
    expect(mensajeDeError({ data: { message: 'La caja ya fue cerrada.' } }, 'respaldo')).toBe(
      'La caja ya fue cerrada.',
    )
  })

  it('mensajeDeError prefiere el de `response.data` cuando estan los dos', () => {
    const fallo = { response: { data: { message: 'de response' } }, data: { message: 'suelto' } }
    expect(mensajeDeError(fallo, 'respaldo')).toBe('de response')
  })

  it('estadoDeError lee el estado un nivel mas adentro', () => {
    expect(estadoDeError({ error: { statusCode: 409 } })).toBe(409)
  })

  it('estadoDeError prefiere el de arriba cuando estan los dos', () => {
    expect(estadoDeError({ statusCode: 401, error: { statusCode: 409 } })).toBe(401)
  })
})

/**
 * `ApiError` estaba declarado y exportado desde el principio y nadie fuera de
 * `lib/api/api.ts` lo importaba: los 43 `catch (error)` leian sus campos a
 * mano. El guard existe para poder preguntar por lo que solo tiene sentido en
 * NUESTRO error, como `isConflict`.
 */
describe('esApiError', () => {
  it('reconoce el fallo que lanza apiRequest', () => {
    expect(esApiError({ statusCode: 409, message: 'Conflicto', isConflict: true })).toBe(true)
  })

  it('no confunde un Error normal con uno de la api', () => {
    expect(esApiError(new Error('cualquier cosa'))).toBe(false)
  })

  it('exige que los dos campos sean del tipo correcto', () => {
    expect(esApiError({ statusCode: '409', message: 'Conflicto' })).toBe(false)
    expect(esApiError({ statusCode: 409 })).toBe(false)
  })

  it('no revienta con null, undefined ni texto', () => {
    expect(esApiError(null)).toBe(false)
    expect(esApiError(undefined)).toBe(false)
    expect(esApiError('texto')).toBe(false)
  })
})

describe('mensajeDeError con listas de mensajes', () => {
  it('une la lista que manda el ValidationPipe, sin quedarse con el primero', () => {
    const fallo = { response: { data: { message: ['monto debe ser positivo', 'ruta es obligatoria'] } } }
    expect(mensajeDeError(fallo, 'respaldo')).toBe(
      'monto debe ser positivo · ruta es obligatoria',
    )
  })

  it('tambien cuando la lista llega un nivel mas adentro', () => {
    // Varias cadenas escritas a mano hacian justo esto:
    // `Array.isArray(error?.error?.message) ? error.error.message.join(', ') : ...`
    const fallo = { error: { message: ['uno', 'dos'] } }
    expect(mensajeDeError(fallo, 'respaldo')).toBe('uno · dos')
  })

  it('tambien cuando llega en `response.message`', () => {
    const fallo = { response: { message: ['tres', 'cuatro'] } }
    expect(mensajeDeError(fallo, 'respaldo')).toBe('tres · cuatro')
  })

  it('una lista vacia o de blancos cae al siguiente candidato', () => {
    const fallo = { response: { data: { message: ['', '  '] } }, message: 'el de arriba' }
    expect(mensajeDeError(fallo, 'respaldo')).toBe('el de arriba')
  })
})

describe('datosParaRegistro', () => {
  it('saca el cuerpo de la respuesta de axios', () => {
    const fallo = { response: { data: { detalle: 'x' } } }
    expect(datosParaRegistro(fallo)).toEqual({
      response: { data: { detalle: 'x' } },
      data: { detalle: 'x' },
    })
  })

  it('usa el cuerpo desenvuelto cuando no hay `response`', () => {
    expect(datosParaRegistro({ data: { detalle: 'y' } })).toEqual({
      response: undefined,
      data: { detalle: 'y' },
    })
  })

  it('no revienta con null ni con texto', () => {
    expect(datosParaRegistro(null)).toEqual({})
    expect(datosParaRegistro('texto')).toEqual({})
  })
})

describe('estadoDeError dentro del cuerpo', () => {
  it('lee el statusCode del cuerpo de la respuesta', () => {
    expect(estadoDeError({ response: { data: { statusCode: 422 } } })).toBe(422)
  })
})

describe('codigoDeError', () => {
  it('lee el codigo de axios', () => {
    expect(codigoDeError({ code: 'ECONNABORTED' })).toBe('ECONNABORTED')
    expect(codigoDeError({ code: 'ERR_NETWORK' })).toBe('ERR_NETWORK')
  })

  it('sin codigo, undefined, sin reventar', () => {
    expect(codigoDeError(new Error('x'))).toBeUndefined()
    expect(codigoDeError(null)).toBeUndefined()
    expect(codigoDeError({ code: 500 })).toBeUndefined()
  })
})
