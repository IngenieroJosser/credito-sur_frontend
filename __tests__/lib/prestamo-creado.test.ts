import { idDelPrestamoCreado, type PrestamoCreado } from '@/lib/creditos/prestamo-creado'

/**
 * De dónde sale el id del préstamo recién creado.
 *
 * `crearPrestamo` era `Promise<any>`, así que cuatro pantallas adivinaban el id
 * por hasta seis caminos. Rastreado en `LoansService.createLoan`, cinco de esos
 * caminos no existen (`response.data.id`, `response.prestamo.id`,
 * `response.data.prestamo.id`, `response.data.data.id`, `response.data.loan.id`)
 * y el que sí falta era `prestamoId`, el del reintento idempotente: el caso de la
 * cola offline, donde el contrato no se descargaba nunca.
 *
 * Estas pruebas fijan las tres formas reales de la respuesta.
 */
describe('idDelPrestamoCreado', () => {
  it('creación normal: el id va arriba, en `id`', () => {
    const respuesta: PrestamoCreado = {
      id: 'cl67qg5e80001c8ibw3d2q7p8',
      numeroPrestamo: 'PRES-000001',
      mensaje: 'Préstamo creado exitosamente. Pendiente de aprobación.',
      requiereAprobacion: true,
    }
    expect(idDelPrestamoCreado(respuesta)).toBe('cl67qg5e80001c8ibw3d2q7p8')
  })

  it('reintento idempotente: el id se llama `prestamoId`', () => {
    const respuesta: PrestamoCreado = {
      mensaje: 'Préstamo ya registrado previamente.',
      prestamoId: 'cl67qg5e80001c8ibw3d2q7p8',
      numeroPrestamo: 'PRES-000001',
      aprobacionId: 'apr-1',
      idempotentReplay: true,
    }
    expect(idDelPrestamoCreado(respuesta)).toBe('cl67qg5e80001c8ibw3d2q7p8')
  })

  it('recuperación tras fallar una tarea secundaria: sigue siendo `id`', () => {
    const respuesta: PrestamoCreado = {
      id: 'prestamo-1',
      mensaje: 'Préstamo creado exitosamente. Pendiente de aprobación.',
      requiereAprobacion: true,
      aprobacionId: 'apr-1',
      efectoProvisionalId: null,
      warning: 'La operación principal fue creada, pero falló una tarea secundaria posterior.',
    }
    expect(idDelPrestamoCreado(respuesta)).toBe('prestamo-1')
  })

  describe('no devuelve un id que el servidor no conoce', () => {
    it('la creación que quedó en la cola no sirve para pedir el contrato', () => {
      const respuesta: PrestamoCreado = {
        id: 'temp-loan-1730000000000',
        numeroPrestamo: 'OFFLINE',
        esOffline: true,
      }
      expect(idDelPrestamoCreado(respuesta)).toBeNull()
    })

    it('un id temporal se descarta incluso sin la marca esOffline', () => {
      expect(idDelPrestamoCreado({ id: 'temp-loan-1730000000000' })).toBeNull()
    })
  })

  describe('respuestas sin id utilizable', () => {
    it('null y undefined dan null', () => {
      expect(idDelPrestamoCreado(null)).toBeNull()
      expect(idDelPrestamoCreado(undefined)).toBeNull()
    })

    it('una respuesta sin ninguno de los dos campos da null', () => {
      expect(idDelPrestamoCreado({ mensaje: 'algo salió raro' })).toBeNull()
    })

    it('un id vacío no pasa como id', () => {
      expect(idDelPrestamoCreado({ id: '' })).toBeNull()
    })
  })

  it('prefiere `id` cuando vienen los dos', () => {
    expect(idDelPrestamoCreado({ id: 'nuevo', prestamoId: 'viejo' })).toBe('nuevo')
  })
})
