jest.mock('@/lib/api/api', () => ({ apiRequest: jest.fn() }))

import { apiRequest } from '@/lib/api/api'
import { mensajeResultadoPrueba, sendTestNotification, type ResultadoEnvioPush } from '@/lib/push/pushService'

const resultado = (parcial: Partial<ResultadoEnvioPush>): ResultadoEnvioPush => ({
  configurado: true,
  suscripciones: 1,
  enviadas: 1,
  desactivadas: 0,
  fallidas: 0,
  ...parcial,
})

describe('sendTestNotification', () => {
  it('usa /push/test, disponible para cualquier rol, y no /push/send', async () => {
    ;(apiRequest as jest.Mock).mockResolvedValue(resultado({}))
    await sendTestNotification()
    expect(apiRequest).toHaveBeenCalledWith('POST', '/push/test')
  })
})

describe('mensajeResultadoPrueba', () => {
  it('confirma cuando la prueba llegó al servicio', () => {
    expect(mensajeResultadoPrueba(resultado({ enviadas: 2, suscripciones: 2 }))).toEqual({
      type: 'success',
      text: expect.stringContaining('2 dispositivos'),
    })
  })

  it('avisa si el servidor no tiene llaves configuradas', () => {
    expect(mensajeResultadoPrueba(resultado({ configurado: false })).type).toBe('error')
  })

  it('pide volver a activar si no hay dispositivos registrados', () => {
    const mensaje = mensajeResultadoPrueba(resultado({ suscripciones: 0, enviadas: 0 }))
    expect(mensaje.type).toBe('error')
    expect(mensaje.text).toContain('no tiene dispositivos registrados')
  })

  it('distingue un registro vencido de un rechazo del servicio', () => {
    expect(mensajeResultadoPrueba(resultado({ enviadas: 0, desactivadas: 1 })).text).toContain('vencido')
    expect(mensajeResultadoPrueba(resultado({ enviadas: 0, fallidas: 1 })).text).toContain('rechazó')
  })

  it('sin respuesta del servidor da un error con qué hacer', () => {
    expect(mensajeResultadoPrueba(null)).toEqual({ type: 'error', text: expect.stringContaining('conexión') })
  })
})
