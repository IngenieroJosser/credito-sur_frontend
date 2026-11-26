import { act, renderHook, waitFor } from '@testing-library/react'
import { useConsultaPorPeriodo } from '@/hooks/useConsultaPorPeriodo'
import { usePeriodoKpiRuta } from '@/hooks/usePeriodoKpiRuta'

function diferida<T>() {
  let resolver!: (valor: T) => void
  let rechazar!: (error: Error) => void
  const promesa = new Promise<T>((resolve, reject) => { resolver = resolve; rechazar = reject })
  return { promesa, resolver, rechazar }
}

it('conserva el último reporte, incluso si el nuevo falla, y descarta respuestas superadas', async () => {
  const semana = diferida<number>()
  const mes = diferida<number>()
  const anio = diferida<number>()
  const anioReintento = jest.fn(() => anio.promesa)
  const { result, rerender } = renderHook(
    ({ clave, consultar }) => useConsultaPorPeriodo(clave, consultar, 'Error de carga'),
    { initialProps: { clave: 'week', consultar: () => semana.promesa } },
  )
  expect(result.current.cargando).toBe(true)
  expect(result.current.resultado).toBeNull()
  await act(async () => { semana.resolver(14000) })
  expect(result.current.resultado).toEqual({ clave: 'week', datos: 14000 })

  rerender({ clave: 'month', consultar: () => mes.promesa })
  expect(result.current.cargando).toBe(true)
  expect(result.current.resultado?.clave).toBe('week')
  rerender({ clave: 'year', consultar: anioReintento })
  await act(async () => { anio.rechazar(new Error('Sin conexión')) })
  expect(result.current.error).toContain('Sin conexión')
  expect(result.current.resultado?.datos).toBe(14000)
  await act(async () => { mes.resolver(45000) })
  expect(result.current.resultado?.clave).toBe('week')

  anioReintento.mockResolvedValueOnce(220000)
  await act(async () => { await result.current.recargar() })
  await waitFor(() => expect(result.current.resultado).toEqual({ clave: 'year', datos: 220000 }))
  expect(result.current.error).toBeNull()
  expect(result.current.cargando).toBe(false)
})

it('la ruta conserva el período de las tarjetas hasta confirmar el nuevo', () => {
  const { result } = renderHook(() => usePeriodoKpiRuta())
  act(() => { result.current.cambiarPeriodo('SEM') })
  expect(result.current.periodoCargado).toBe('HOY')
  expect(result.current.puedeActualizarHoy()).toBe(false)
  act(() => {
    const semana = result.current.iniciarConsulta('SEM')
    result.current.cambiarPeriodo('AÑO')
    expect(semana?.vigente()).toBe(false)
    semana?.confirmar()
  })
  expect(result.current.periodoCargado).toBe('HOY')
  act(() => { result.current.iniciarConsulta()?.confirmar() })
  expect(result.current.periodoCargado).toBe('AÑO')
})
