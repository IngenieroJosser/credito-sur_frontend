import { render, screen } from '@testing-library/react'
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
})
