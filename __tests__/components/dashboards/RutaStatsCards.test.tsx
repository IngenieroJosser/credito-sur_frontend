import { fireEvent, render, screen } from '@testing-library/react'
import { RutaStatsCards } from '@/components/dashboards/shared/RutaStatsCards'

jest.mock('lucide-react', () => ({
  DollarSign: () => <div data-testid="icon-dollar" />,
  Target: () => <div data-testid="icon-target" />,
  Receipt: () => <div data-testid="icon-receipt" />,
  Wallet: () => <div data-testid="icon-wallet" />,
}))

describe('RutaStatsCards', () => {
  it('recalcula efectividad HOY desde recaudo y pendiente aunque llegue una eficiencia vieja', () => {
    render(
      <RutaStatsCards
        periodo="HOY"
        rutaStats={{
          recaudo: 100000,
          meta: 100000,
          eficiencia: 100,
          pendiente: 5503666,
          gastos: 0,
          base: 0,
        }}
      />,
    )

    // 100.000 sobre una meta de 5.603.666 es 1,78%. Se muestran dos decimales
    // desde ef60140; antes era uno solo y la prueba esperaba "1.8%".
    expect(screen.getAllByText('1.78%').length).toBeGreaterThanOrEqual(1)
    // Lo que importa: la eficiencia vieja que llego en los datos no se muestra.
    expect(screen.queryByText('100.00%')).not.toBeInTheDocument()
    expect(screen.getByText(/Meta:/)).toHaveTextContent(/\$\s*5\.603\.666/)
    expect(screen.getByText(/Pendiente:/)).toHaveTextContent(/\$\s*5\.503\.666/)
  })

  /**
   * Que la ayuda de las cifras diga la verdad.
   *
   * Tres cosas de este panel no estaban explicadas en ninguna parte de la
   * pantalla: qué es la efectividad, de dónde salen ÓPTIMO / REGULAR / BAJO, y
   * por qué el mismo porcentaje aparece dos veces. Lo ve el cobrador, el
   * supervisor y el admin, que es donde más importa que no haya que adivinar.
   *
   * Lo que se fija aquí es que el texto de la ayuda coincida con el corte que
   * de verdad decide el rótulo. Si alguien mueve el umbral y se olvida del
   * texto, estas pruebas caen: es justo el error que no se ve en la pantalla.
   */
  describe('la ayuda de las cifras', () => {
    const stats = (recaudo: number, meta: number) => ({
      recaudo,
      meta,
      eficiencia: meta > 0 ? (recaudo / meta) * 100 : 0,
      gastos: 0,
      base: 0,
    })

    it('explica de donde sale la efectividad', () => {
      render(<RutaStatsCards rutaStats={stats(50_000, 100_000)} />)

      fireEvent.mouseEnter(screen.getByText('Efectividad'))
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        /recaudo dividido por la meta/i,
      )
    })

    it('dice que el porcentaje del recaudo es esa misma cifra', () => {
      render(<RutaStatsCards rutaStats={stats(50_000, 100_000)} />)

      // La tarjeta de recaudo lleva el mismo 50.00% que la de efectividad.
      const porcentajes = screen.getAllByText('50.00%')
      expect(porcentajes.length).toBeGreaterThan(0)

      fireEvent.mouseEnter(porcentajes[0])
      expect(screen.getByRole('tooltip')).toHaveTextContent(/misma cifra/i)
    })

    // Cada caso: recaudo sobre una meta de 100.000 -> rotulo esperado.
    const cortes: Array<[number, string]> = [
      [100_000, 'ÓPTIMO'],
      [90_000, 'ÓPTIMO'],
      [89_999, 'REGULAR'],
      [70_000, 'REGULAR'],
      [69_999, 'BAJO'],
      [0, 'BAJO'],
    ]

    it.each(cortes)('con %d recaudado el rotulo es %s', (recaudo, esperado) => {
      render(<RutaStatsCards rutaStats={stats(recaudo, 100_000)} />)
      expect(screen.getByText(esperado)).toBeInTheDocument()
    })

    it('la ayuda nombra los dos cortes que se usan de verdad', () => {
      render(<RutaStatsCards rutaStats={stats(95_000, 100_000)} />)

      fireEvent.mouseEnter(screen.getByText('ÓPTIMO'))
      const ayuda = screen.getByRole('tooltip')

      // Si alguien mueve un umbral y no toca el texto, esto cae.
      expect(ayuda).toHaveTextContent('90%')
      expect(ayuda).toHaveTextContent('70%')
    })

    it('sin meta no inventa un porcentaje', () => {
      render(<RutaStatsCards rutaStats={stats(0, 0)} />)
      expect(screen.getByText('---')).toBeInTheDocument()
    })
  })
})
