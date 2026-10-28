import { esErrorDeRed } from '@/lib/offline/conRespaldoOffline'

/**
 * Qué cuenta como «no hay red» y qué no.
 *
 * De esta decisión depende algo con consecuencia: si el error es de red, la
 * operación se guarda en la cola para reintentarla; si el servidor la rechazó
 * —403, 409, 422—, encolarla solo repetiría el rechazo, y el cobrador vería la
 * misma operación fallar una y otra vez sin entender por qué.
 *
 * Había dieciséis copias de este criterio repartidas por los servicios. Ahora
 * hay una, y estas pruebas son las que la fijan.
 */

const conNavigatorOnline = (online: boolean, fn: () => void) => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'onLine')
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true })
  try {
    fn()
  } finally {
    if (original) Object.defineProperty(navigator, 'onLine', original)
  }
}

describe('esErrorDeRed', () => {
  it('el fallo de red normalizado por apiRequest SÍ es de red', () => {
    // `apiRequest` convierte cualquier ERR_NETWORK / ECONNREFUSED / ETIMEDOUT
    // de axios en esto. Es la condición que de verdad decide.
    expect(esErrorDeRed({ statusCode: 0, message: 'Network Error' })).toBe(true)
  })

  it('un rechazo del servidor NO es de red', () => {
    conNavigatorOnline(true, () => {
      for (const statusCode of [400, 401, 403, 404, 409, 422, 500]) {
        expect(esErrorDeRed({ statusCode, message: 'Rechazado' })).toBe(false)
      }
    })
  })

  it('el navegador sin conexión basta, venga lo que venga', () => {
    conNavigatorOnline(false, () => {
      expect(esErrorDeRed({ statusCode: 403 })).toBe(true)
      expect(esErrorDeRed(null)).toBe(true)
    })
  })

  it('reconoce el código de axios si el error llega sin normalizar', () => {
    conNavigatorOnline(true, () => {
      expect(esErrorDeRed({ code: 'ERR_NETWORK' })).toBe(true)
    })
  })

  it('no se cae con lo que no es un error', () => {
    conNavigatorOnline(true, () => {
      for (const raro of [null, undefined, 'texto', 42, [], true]) {
        expect(() => esErrorDeRed(raro)).not.toThrow()
        expect(esErrorDeRed(raro)).toBe(false)
      }
    })
  })

  it('un mensaje en minúscula con "network" también cuenta', () => {
    // Ojo: el mensaje de axios es "Network Error", con mayúsculas, así que NO
    // casa con esta comprobación. A ese lo atrapa `statusCode === 0`. Esta
    // línea solo cubre un mensaje escrito a mano.
    conNavigatorOnline(true, () => {
      expect(esErrorDeRed({ message: 'fallo de network' })).toBe(true)
      expect(esErrorDeRed({ message: 'Network Error' })).toBe(false)
    })
  })
})
