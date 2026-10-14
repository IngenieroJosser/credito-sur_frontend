import { crearProveedorCuotasEnLote } from '@/lib/rutas/cuotas-en-lote'
import { prestamosService } from '@/services/prestamos-service'

jest.mock('@/services/prestamos-service', () => ({
  prestamosService: {
    obtenerCuotasDeVarios: jest.fn(),
    obtenerCuotas: jest.fn(),
  },
}))

describe('crearProveedorCuotasEnLote', () => {
  beforeEach(() => jest.clearAllMocks())

  it('convierte N creditos en una sola peticion de cuotas', async () => {
    jest.mocked(prestamosService.obtenerCuotasDeVarios).mockResolvedValue({
      'prestamo-1': [{ id: 'cuota-1' }],
      'prestamo-2': [{ id: 'cuota-2' }],
    } as never)

    const obtener = await crearProveedorCuotasEnLote([
      'prestamo-1',
      'prestamo-2',
      'prestamo-1',
    ])

    await expect(obtener('prestamo-1')).resolves.toEqual([{ id: 'cuota-1' }])
    await expect(obtener('prestamo-2')).resolves.toEqual([{ id: 'cuota-2' }])
    expect(prestamosService.obtenerCuotasDeVarios).toHaveBeenCalledTimes(1)
    expect(prestamosService.obtenerCuotasDeVarios).toHaveBeenCalledWith([
      'prestamo-1',
      'prestamo-2',
    ])
    expect(prestamosService.obtenerCuotas).not.toHaveBeenCalled()
  })

  it('no degrada a peticiones individuales si el lote omite un id', async () => {
    jest.mocked(prestamosService.obtenerCuotasDeVarios).mockResolvedValue({} as never)

    const obtener = await crearProveedorCuotasEnLote(['prestamo-1'])
    await expect(obtener('prestamo-1')).resolves.toEqual([])
    await expect(obtener('prestamo-1')).resolves.toEqual([])

    expect(prestamosService.obtenerCuotas).not.toHaveBeenCalled()
  })
})
