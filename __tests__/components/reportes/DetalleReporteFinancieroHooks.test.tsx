import { render } from '@testing-library/react'
import DetalleReporteFinancieroModal from '@/components/reportes/DetalleReporteFinancieroModal'

/**
 * El mismo modal, sin id y con id, sobre la misma instancia.
 *
 * Este componente tenía un `useMemo` y un `useState` debajo de su
 * `if (!id) return null`, con siete `useState` por encima. Sin id ejecutaba
 * siete hooks y con id nueve: React lleva la cuenta por orden y en cuanto el
 * número cambia entre dos renders tumba la pantalla entera con el error 310.
 *
 * Es la misma forma que tumbó producción en el layout, y la que de verdad
 * revienta. Medido: cuando NO hay ningún hook por encima del return —el caso de
 * ConfirmModal— React no lo detecta y no lanza nada; hace falta que haya hooks
 * a ambos lados. Por eso esta prueba está aquí y no allá.
 *
 * Un `render` suelto con el id ya puesto no lo ve: hace falta la transición.
 */

jest.mock('@/services/contabilidad-service', () => ({
  getMovimientosLedger: jest.fn().mockResolvedValue({ data: [] }),
}))

jest.mock('lucide-react', () => ({
  X: () => <span />,
  Calendar: () => <span />,
  TrendingUp: () => <span />,
  TrendingDown: () => <span />,
  Eye: () => <span />,
  LineChart: () => <span />,
}))

describe('El modal de detalle financiero aguanta abrirse', () => {
  const onClose = jest.fn()

  it('sin id → con id no cambia el número de hooks', () => {
    const { rerender } = render(
      <DetalleReporteFinancieroModal id="" onClose={onClose} />,
    )

    // Aquí es donde reventaba.
    expect(() =>
      rerender(<DetalleReporteFinancieroModal id="rep-1" onClose={onClose} />),
    ).not.toThrow()
  })

  it('aguanta abrir y cerrar varias veces', () => {
    const { rerender } = render(
      <DetalleReporteFinancieroModal id="" onClose={onClose} />,
    )

    expect(() => {
      for (let i = 0; i < 3; i++) {
        rerender(
          <DetalleReporteFinancieroModal id={`rep-${i}`} onClose={onClose} />,
        )
        rerender(<DetalleReporteFinancieroModal id="" onClose={onClose} />)
      }
    }).not.toThrow()
  })
})
