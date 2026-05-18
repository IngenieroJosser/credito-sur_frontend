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

    expect(screen.getAllByText('1.8%').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('100.0%')).not.toBeInTheDocument()
    expect(screen.getByText(/Meta:/)).toHaveTextContent(/\$\s*5\.603\.666/)
    expect(screen.getByText(/Pendiente:/)).toHaveTextContent(/\$\s*5\.503\.666/)
  })
})
