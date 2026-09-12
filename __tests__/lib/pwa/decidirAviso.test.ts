jest.mock('@/lib/pwa/instalacion', () => ({
  esIOS: jest.fn(),
  estaInstalada: jest.fn(),
  hayInstalacionNativa: jest.fn(),
}))
jest.mock('@/lib/pwa/avisos', () => ({ avisoDescartado: jest.fn() }))
jest.mock('@/lib/push/pushNotifications', () => ({
  isPushSupported: jest.fn(),
  obtenerRegistroServiceWorker: jest.fn(),
}))

import { decidirAviso } from '@/lib/pwa/decidirAviso'
import { esIOS, estaInstalada, hayInstalacionNativa } from '@/lib/pwa/instalacion'
import { avisoDescartado } from '@/lib/pwa/avisos'
import { isPushSupported, obtenerRegistroServiceWorker } from '@/lib/push/pushNotifications'

const mock = (fn: unknown) => fn as jest.Mock

function registroCon(suscripcion: unknown) {
  return { pushManager: { getSubscription: jest.fn().mockResolvedValue(suscripcion) } }
}

describe('decidirAviso', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('token', 'token-de-prueba')
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'llave-publica'
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'default' },
    })
    // Caso base: Android sin instalar, sin descartes, push soportado, sin suscripción.
    mock(esIOS).mockReturnValue(false)
    mock(estaInstalada).mockReturnValue(false)
    mock(hayInstalacionNativa).mockReturnValue(false)
    mock(avisoDescartado).mockReturnValue(false)
    mock(isPushSupported).mockReturnValue(true)
    mock(obtenerRegistroServiceWorker).mockResolvedValue(registroCon(null))
  })

  it('ofrece instalar primero cuando el navegador lo permite', async () => {
    mock(hayInstalacionNativa).mockReturnValue(true)
    await expect(decidirAviso()).resolves.toBe('instalar-nativo')
  })

  it('en iPhone sin instalar muestra las instrucciones de instalación', async () => {
    mock(esIOS).mockReturnValue(true)
    await expect(decidirAviso()).resolves.toBe('instalar-ios')
  })

  it('ofrece notificaciones cuando no hay nada que instalar', async () => {
    await expect(decidirAviso()).resolves.toBe('notificaciones')
  })

  it('en iPhone sin instalar no ofrece notificaciones: iOS solo las entrega a la app instalada', async () => {
    mock(esIOS).mockReturnValue(true)
    mock(avisoDescartado).mockImplementation((aviso: string) => aviso === 'instalar')
    await expect(decidirAviso()).resolves.toBeNull()
  })

  it('no ofrece notificaciones sin sesión', async () => {
    localStorage.removeItem('token')
    await expect(decidirAviso()).resolves.toBeNull()
  })

  it('no ofrece notificaciones si el permiso ya se respondió', async () => {
    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'denied' } })
    await expect(decidirAviso()).resolves.toBeNull()
  })

  it('sin service worker (desarrollo) responde sin quedarse esperando', async () => {
    mock(obtenerRegistroServiceWorker).mockResolvedValue(null)
    await expect(decidirAviso()).resolves.toBeNull()
  })

  it('no ofrece notificaciones si el dispositivo ya está suscrito', async () => {
    mock(obtenerRegistroServiceWorker).mockResolvedValue(registroCon({ endpoint: 'https://push/a' }))
    await expect(decidirAviso()).resolves.toBeNull()
  })
})
