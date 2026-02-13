import { render, screen } from '@testing-library/react'
import AdminPage from '@/app/admin/page'

// Mock de componentes hijos complejos para aislar la prueba de la página
jest.mock('@/app/admin/dashboard-client', () => ({
  DashboardClient: () => <div data-testid="dashboard-client">Dashboard Client Content</div>,
}))

describe.skip('AdminPage', () => {
  it('debería renderizar la estructura base del dashboard', () => {
    // AdminPage es Server Component en App Router, pero si es muy simple lo podemos renderizar directo
    // Si tiene lógica async de BD, necesitaríamos mockearla.
    // Al ver el archivo original, AdminPage importaba StatsCards y QuickAccess.
    
    render(<AdminPage />)
    
    expect(screen.getByTestId('dashboard-client')).toBeInTheDocument()
  })
})
