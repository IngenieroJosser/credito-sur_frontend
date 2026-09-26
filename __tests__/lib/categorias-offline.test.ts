/**
 * Crear una categoria sin conexion devuelve la categoria, no el registro de la cola.
 *
 * Antes el camino offline hacia `return enqueueOperation(...) as any`. Ese registro
 * tiene `id`, `endpoint`, `method` y `status`, pero NO tiene `nombre`, y quien llama
 * —el desplegable de categorias— lo mete en su lista y lo pinta: sin conexion
 * aparecia una opcion EN BLANCO y se seleccionaba el id de la cola.
 */
const enqueueOperation = jest.fn().mockResolvedValue({ id: 'q1' })
jest.mock('@/lib/offline/syncService', () => ({
  syncService: { enqueueOperation: (...a: unknown[]) => enqueueOperation(...a) },
}))

const apiRequest = jest.fn()
jest.mock('@/lib/api/api', () => ({
  apiRequest: (...a: unknown[]) => apiRequest(...a),
}))

import { categoriasService } from '@/services/categorias-service'

/** Lo que `apiRequest` lanza cuando no hay red: `statusCode` en 0. */
const errorDeRed = () => Object.assign(new Error('Network Error'), { statusCode: 0 })

describe('categoriasService.crear sin conexion', () => {
  beforeEach(() => {
    enqueueOperation.mockClear()
    apiRequest.mockReset()
  })

  it('devuelve la categoria pedida, con su nombre', async () => {
    apiRequest.mockRejectedValue(errorDeRed())

    const nueva = await categoriasService.crear({ nombre: 'Transporte', tipo: 'GASTO' })

    expect(nueva.nombre).toBe('Transporte')
    expect(nueva.tipo).toBe('GASTO')
    expect(nueva.activa).toBe(true)
    expect(nueva.id).toMatch(/^temp-cat-/)
  })

  it('encola la operacion con el mismo id temporal que devuelve', async () => {
    // El sync cambia ese id por el real al subir la operacion, asi que el que se
    // encola y el que ve la pantalla tienen que ser el mismo.
    apiRequest.mockRejectedValue(errorDeRed())

    const nueva = await categoriasService.crear({ nombre: 'Peajes', tipo: 'GASTO' })

    expect(enqueueOperation).toHaveBeenCalledTimes(1)
    const [tipo, endpoint, metodo, , , , tempId] = enqueueOperation.mock.calls[0]
    expect(tipo).toBe('categoria_crear')
    expect(endpoint).toBe('/categorias')
    expect(metodo).toBe('POST')
    expect(tempId).toBe(nueva.id)
  })

  it('con conexion devuelve lo del servidor y no encola', async () => {
    const delServidor = { id: 'cat-real', nombre: 'Transporte', tipo: 'GASTO', activa: true, creadoEn: 'x' }
    apiRequest.mockResolvedValue(delServidor)

    const nueva = await categoriasService.crear({ nombre: 'Transporte', tipo: 'GASTO' })

    expect(nueva).toBe(delServidor)
    expect(enqueueOperation).not.toHaveBeenCalled()
  })

  it('un error que NO es de red se relanza y no se encola', async () => {
    // Encolar algo que el servidor rechazo de verdad lo reintentaria para siempre.
    apiRequest.mockRejectedValue(
      Object.assign(new Error('Ya existe'), { statusCode: 409 }),
    )

    await expect(
      categoriasService.crear({ nombre: 'Transporte', tipo: 'GASTO' }),
    ).rejects.toThrow('Ya existe')
    expect(enqueueOperation).not.toHaveBeenCalled()
  })
})
