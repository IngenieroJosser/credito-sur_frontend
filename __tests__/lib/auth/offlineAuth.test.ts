/**
 * El login sin conexión, que es por donde entra el cobrador cuando no hay señal.
 *
 * No tenía ninguna prueba, y es el sitio donde se verifica una contraseña sin
 * servidor: si algo aquí se rompe, o se entra sin la contraseña correcta, o no
 * se entra con la correcta y el cobrador se queda fuera en la calle.
 *
 * Nota sobre el entorno: jsdom NO trae `crypto.subtle` ni `TextEncoder`. Las
 * funciones del módulo se protegen con `if (!crypto?.subtle) return`, así que
 * sin ponerlos a mano estas pruebas pasarían sin ejecutar ni una línea del
 * PBKDF2: verdes y vacías. Se traen de Node para que se ejercite el hash de
 * verdad, el mismo que corre en el navegador.
 */
import { webcrypto } from 'node:crypto'
import { TextDecoder, TextEncoder } from 'node:util'

Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder, configurable: true })
Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoder, configurable: true })

import {
  cacheSession,
  cancelarPurgaDatosOffline,
  clearCachedSession,
  getCachedSession,
  getOfflineSessionDaysRemaining,
  guardarHashCredencial,
  hasValidOfflineSession,
  hayCredencialOffline,
  programarPurgaDatosOffline,
  restoreOfflineSession,
  verificarCredencialOffline,
  decodeToken,
  isTokenExpired,
} from '@/lib/auth/offlineAuth'

const USUARIO = { id: 'u1', nombres: 'Cobrador Uno', rol: 'COBRADOR' }
const CLAVE = 'unaClaveQueNadieAdivina'

beforeEach(() => {
  localStorage.clear()
})

describe('la contraseña guardada para entrar sin conexión', () => {
  it('no queda escrita en ninguna parte', async () => {
    await guardarHashCredencial('cobrador1', CLAVE)

    // Lo que importa: que la clave no esté, en claro, en ningún sitio.
    const todo = Object.keys(localStorage)
      .map((k) => localStorage.getItem(k) ?? '')
      .join('|')
    expect(todo).not.toContain(CLAVE)
    expect(hayCredencialOffline()).toBe(true)
  })

  it('acepta la contraseña correcta', async () => {
    await guardarHashCredencial('cobrador1', CLAVE)
    await expect(verificarCredencialOffline('cobrador1', CLAVE)).resolves.toBe(true)
  })

  it('rechaza una contraseña equivocada', async () => {
    await guardarHashCredencial('cobrador1', CLAVE)
    await expect(verificarCredencialOffline('cobrador1', 'otraClave')).resolves.toBe(false)
    // Ni una que solo se parece.
    await expect(verificarCredencialOffline('cobrador1', CLAVE + 'x')).resolves.toBe(false)
  })

  it('rechaza a otro usuario aunque traiga la contraseña buena', async () => {
    await guardarHashCredencial('cobrador1', CLAVE)
    await expect(verificarCredencialOffline('cobrador2', CLAVE)).resolves.toBe(false)
  })

  it('no se pelea por mayusculas ni espacios en el usuario', async () => {
    // El cobrador escribe en el móvil, con el teclado poniendo mayúscula sola.
    await guardarHashCredencial('Cobrador1', CLAVE)
    await expect(verificarCredencialOffline('  cobrador1 ', CLAVE)).resolves.toBe(true)
  })

  it('cada guardado usa una sal distinta', async () => {
    await guardarHashCredencial('cobrador1', CLAVE)
    const primero = localStorage.getItem('offline_credential')

    await guardarHashCredencial('cobrador1', CLAVE)
    const segundo = localStorage.getItem('offline_credential')

    // Misma contraseña, hash distinto: si salieran iguales, la sal no se usa y
    // dos usuarios con la misma clave tendrían el mismo hash guardado.
    expect(primero).not.toBe(segundo)
  })

  it('sin nada guardado no deja pasar a nadie', async () => {
    expect(hayCredencialOffline()).toBe(false)
    await expect(verificarCredencialOffline('cobrador1', CLAVE)).resolves.toBe(false)
  })
})

describe('la sesión guardada para trabajar sin conexión', () => {
  it('no hay sesión hasta que se guarda una', () => {
    expect(hasValidOfflineSession()).toBe(false)
    expect(getCachedSession()).toBeNull()
    expect(restoreOfflineSession()).toBeNull()
  })

  it('devuelve el usuario y el token que se guardaron', () => {
    cacheSession('token-abc', USUARIO)

    const restaurada = restoreOfflineSession()
    expect(restaurada?.token).toBe('token-abc')
    expect(restaurada?.user).toMatchObject({ id: 'u1', rol: 'COBRADOR' })
  })

  it('dura 30 dias y se cae al dia 31', () => {
    jest.useFakeTimers()
    try {
      jest.setSystemTime(new Date('2026-03-01T10:00:00-05:00'))
      cacheSession('token-abc', USUARIO)
      expect(hasValidOfflineSession()).toBe(true)
      expect(getOfflineSessionDaysRemaining()).toBe(30)

      // Día 29: todavía sirve. Es el caso del cobrador que lleva semanas sin
      // pasar por la oficina.
      jest.setSystemTime(new Date('2026-03-29T10:00:00-05:00'))
      expect(hasValidOfflineSession()).toBe(true)

      jest.setSystemTime(new Date('2026-04-02T10:00:00-05:00'))
      expect(hasValidOfflineSession()).toBe(false)
    } finally {
      jest.useRealTimers()
    }
  })

  it('al expirar se borra sola, no se queda ahi', () => {
    jest.useFakeTimers()
    try {
      jest.setSystemTime(new Date('2026-03-01T10:00:00-05:00'))
      cacheSession('token-abc', USUARIO)

      jest.setSystemTime(new Date('2026-05-01T10:00:00-05:00'))
      expect(getCachedSession()).toBeNull()
      // Y no queda rastro en el almacenamiento.
      expect(localStorage.getItem('offline_session_cache')).toBeNull()
    } finally {
      jest.useRealTimers()
    }
  })

  it('al limpiar la sesion se va tambien el hash de la contraseña', async () => {
    cacheSession('token-abc', USUARIO)
    await guardarHashCredencial('cobrador1', CLAVE)
    expect(hayCredencialOffline()).toBe(true)

    clearCachedSession()

    // Si el hash sobreviviera a la sesión, quedaría una credencial suelta en el
    // teléfono sin sesión que la respalde.
    expect(hasValidOfflineSession()).toBe(false)
    expect(hayCredencialOffline()).toBe(false)
  })

  it('una sesion corrupta no revienta la pantalla de login', () => {
    localStorage.setItem('offline_session_cache', 'esto no es json')
    expect(() => getCachedSession()).not.toThrow()
    expect(getCachedSession()).toBeNull()
    expect(hasValidOfflineSession()).toBe(false)
  })
})

describe('el periodo de gracia al cerrar sesión', () => {
  it('cerrar sesion programa la purga, no borra al instante', () => {
    cacheSession('token-abc', USUARIO)
    programarPurgaDatosOffline()

    // La sesión sigue ahí: la purga es para 8 h después, así que quien cierra
    // sesión por error no pierde los datos de la ruta.
    expect(localStorage.getItem('offline_purge_deadline')).not.toBeNull()
    expect(hasValidOfflineSession()).toBe(true)
  })

  it('volver a entrar cancela la purga pendiente', () => {
    programarPurgaDatosOffline()
    expect(localStorage.getItem('offline_purge_deadline')).not.toBeNull()

    // `cacheSession` es lo que corre al iniciar sesión: debe cancelarla sola.
    cacheSession('token-nuevo', USUARIO)
    expect(localStorage.getItem('offline_purge_deadline')).toBeNull()
  })

  it('cancelar a mano tambien la quita', () => {
    programarPurgaDatosOffline()
    cancelarPurgaDatosOffline()
    expect(localStorage.getItem('offline_purge_deadline')).toBeNull()
  })
})

/**
 * Leer el token: de aqui sale si hay que echar al usuario al login.
 *
 * `decodeToken` estaba exportada, devolvia `any` y no la llamaba nadie, mientras
 * `isTokenExpired` repetia el mismo decodificado base64url linea por linea. Eran
 * dos decodificadores del mismo token en el mismo archivo. Ahora hay uno, tipado
 * con los claims que el backend firma de verdad (`sub`, `nombres`, `rol`,
 * `permisos`, mas `iat`/`exp`).
 */
const armarToken = (claims: Record<string, unknown>) => {
  const enBase64Url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${enBase64Url({ alg: 'HS256' })}.${enBase64Url(claims)}.firmaDeMentira`
}

describe('decodeToken', () => {
  it('devuelve los claims que firma el backend', () => {
    const claims = {
      sub: 'u1',
      nombres: 'Cobrador Uno',
      rol: 'COBRADOR',
      permisos: ['RUTAS_VIEW'],
      exp: 1900000000,
    }

    expect(decodeToken(armarToken(claims))).toEqual(claims)
  })

  it('no revienta con un token que no tiene tres partes', () => {
    expect(decodeToken('esto.no')).toBeNull()
    expect(decodeToken('unasolaparte')).toBeNull()
    expect(decodeToken('')).toBeNull()
  })

  it('devuelve null si el payload no es JSON', () => {
    expect(decodeToken('cabecera.no-es-json.firma')).toBeNull()
  })

  it('devuelve null si el payload es JSON pero no un objeto', () => {
    // "123" y "\"hola\"" decodifican bien y no son claims.
    const soloUnNumero = Buffer.from('123').toString('base64url')
    expect(decodeToken(`cab.${soloUnNumero}.firma`)).toBeNull()
  })

  it('aguanta un payload con padding base64url recortado', () => {
    // El backend firma sin `=` al final; el modulo lo repone antes de decodificar.
    const token = armarToken({ sub: 'u1' })
    expect(token).not.toContain('=')
    expect(decodeToken(token)?.sub).toBe('u1')
  })
})

describe('isTokenExpired', () => {
  const ahoraEnSegundos = Math.floor(Date.now() / 1000)

  it('un token con exp en el futuro no esta expirado', () => {
    expect(isTokenExpired(armarToken({ exp: ahoraEnSegundos + 3600 }))).toBe(false)
  })

  it('un token con exp en el pasado si', () => {
    expect(isTokenExpired(armarToken({ exp: ahoraEnSegundos - 10 }))).toBe(true)
  })

  it('sin campo exp se asume que no expira', () => {
    // El backend siempre pone exp, pero si algun dia firma sin el, echar al
    // usuario seria peor que dejarlo pasar: la peticion la valida el servidor.
    expect(isTokenExpired(armarToken({ sub: 'u1' }))).toBe(false)
  })

  it('un token ilegible se trata como expirado', () => {
    // Aqui si conviene el lado seguro: si no se puede leer, no se confia.
    expect(isTokenExpired('basura')).toBe(true)
    expect(isTokenExpired('cabecera.no-es-json.firma')).toBe(true)
  })
})
