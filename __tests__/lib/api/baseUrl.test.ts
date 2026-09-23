/**
 * La URL del backend la comparten ocho pantallas. Antes cada una la calculaba
 * a su manera y no coincidían; estas pruebas fijan el comportamiento que ahora
 * es único, sobre todo el caso que las separaba: qué pasa cuando la variable
 * no está puesta.
 */

const CONFIGURADA = process.env.NEXT_PUBLIC_BASE_URL

/** El módulo lee la variable al llamarlo, pero se recarga por limpieza. */
function cargar() {
  let modulo: typeof import('@/lib/api/baseUrl')
  jest.isolateModules(() => {
    modulo = require('@/lib/api/baseUrl')
  })
  return modulo!
}

afterEach(() => {
  if (CONFIGURADA === undefined) delete process.env.NEXT_PUBLIC_BASE_URL
  else process.env.NEXT_PUBLIC_BASE_URL = CONFIGURADA
})

describe('raizBackend', () => {
  it('usa la variable configurada', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://api.ejemplo.com'
    expect(cargar().raizBackend()).toBe('https://api.ejemplo.com')
  })

  it('quita la barra final', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://api.ejemplo.com/'
    expect(cargar().raizBackend()).toBe('https://api.ejemplo.com')
  })

  it('quita el prefijo de la API si la variable ya lo trae', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://api.ejemplo.com/api-credisur'
    expect(cargar().raizBackend()).toBe('https://api.ejemplo.com')
  })

  it('sin variable cae a un backend, no a una cadena vacía', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    expect(cargar().raizBackend()).toMatch(/^https?:\/\/.+/)
  })
})

describe('baseApi', () => {
  it('añade el prefijo de la API', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://api.ejemplo.com'
    expect(cargar().baseApi()).toBe('https://api.ejemplo.com/api-credisur')
  })

  it('no lo duplica cuando la variable ya lo incluye', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://api.ejemplo.com/api-credisur'
    expect(cargar().baseApi()).toBe('https://api.ejemplo.com/api-credisur')
  })
})

describe('conPrefijoApi', () => {
  it('normaliza cualquier URL suelta, como la del servidor de la oficina', () => {
    const { conPrefijoApi } = cargar()
    expect(conPrefijoApi('http://192.168.1.50:3001/')).toBe(
      'http://192.168.1.50:3001/api-credisur',
    )
    expect(conPrefijoApi('http://192.168.1.50:3001/api-credisur')).toBe(
      'http://192.168.1.50:3001/api-credisur',
    )
  })
})
