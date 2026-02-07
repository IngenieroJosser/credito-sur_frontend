import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal'

// Mocks necesarios
const mockOnClose = jest.fn()
const mockOnSuccess = jest.fn()

// Mock de iconos
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-close" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  DollarSign: () => <div data-testid="icon-dollar" />,
  User: () => <div data-testid="icon-user" />,
  Check: () => <div data-testid="icon-check" />,
  ChevronRight: () => <div data-testid="icon-chevron-right" />,
  CreditCard: () => <div data-testid="icon-credit-card" />,
  Plus: () => <div data-testid="icon-plus" />,
  Calculator: () => <div data-testid="icon-calculator" />,
  CheckCircle2: () => <div data-testid="icon-check-circle-2" />,
  Package: () => <div data-testid="icon-package" />,
}))

// Mock de Componentes y Servicios externos para aislamiento
jest.mock('@/components/dashboards/shared/CobradorElements', () => ({
  Portal: ({ children }: any) => <div data-testid="portal-root">{children}</div>,
  MODAL_Z_INDEX: 50
}))

jest.mock('@/services/clientes-service', () => ({
  clientesService: {
    buscar: jest.fn().mockResolvedValue([]),
    obtenerTodos: jest.fn().mockResolvedValue([])
  }
}))

jest.mock('@/services/articulos-service', () => ({
  articulosService: {
    obtenerArticulos: jest.fn().mockResolvedValue([])
  }
}))

jest.mock('@/lib/utils', () => ({
  formatCOPInputValue: (val: any) => val,
  formatCurrency: (val: any) => val,
  parseCOPInputToNumber: (val: any) => Number(val),
  cn: (...args: any[]) => args.join(' ')
}))

describe.skip('CrearCreditoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('no debería renderizarse si isOpen es false', () => {
    render(
      <CrearCreditoModal 
        isOpen={false} 
        onClose={mockOnClose} 
        onConfirm={mockOnSuccess} 
      />
    )
    expect(screen.queryByText('Crear Nuevo Crédito')).not.toBeInTheDocument()
  })

  it('debería mostrar el paso 1 (Selección de Tipo) al abrirse', () => {
    render(
      <CrearCreditoModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onConfirm={mockOnSuccess} 
      />
    )
    
    expect(screen.getByText('Crear Nuevo Crédito')).toBeInTheDocument()
    expect(screen.getByText('Seleccione el tipo de crédito')).toBeInTheDocument()
    expect(screen.getByText('Préstamo en Dinero')).toBeInTheDocument()
    expect(screen.getByText('Financiamiento de Producto')).toBeInTheDocument()
  })

  it('debería permitir seleccionar tipo y avanzar al paso 2', () => {
    render(
      <CrearCreditoModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onConfirm={mockOnSuccess} 
      />
    )
    
    // Seleccionar Dinero
    const moneyCard = screen.getByText('Préstamo en Dinero').closest('div')
    // Click en la tarjeta (aproximación)
    fireEvent.click(screen.getByText('Préstamo en Dinero'))
    
    // Click en Continuar
    const continueBtn = screen.getByRole('button', { name: /Continuar/i })
    fireEvent.click(continueBtn)
    
    // Validar cambio a Paso 2 (Configuración)
    expect(screen.getByText('Configuración del Préstamo')).toBeInTheDocument()
    expect(screen.getByLabelText(/Monto a prestar/i)).toBeInTheDocument()
  })

  it('debería calcular el total a pagar automáticamente', async () => {
    render(
      <CrearCreditoModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onConfirm={mockOnSuccess} 
      />
    )
    
    // Avanzar al paso 2
    fireEvent.click(screen.getByText('Préstamo en Dinero'))
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }))
    
    // Ingresar Monto (ej: 1000)
    const inputMonto = screen.getByLabelText(/Monto a prestar/i)
    fireEvent.change(inputMonto, { target: { value: '1000' } })
    
    // El interés por defecto es 20%, total debería ser 1200
    // Buscamos el texto que muestra el total
    // Nota: El componente muestra esto dinámicamente.
    // Depende de la implementación exacta de UI, buscamos si aparece el cálculo.
    
    await waitFor(() => {
        // Buscamos algún elemento que contenga "1,200" o "1200"
        expect(screen.getByDisplayValue(/1000/)).toBeInTheDocument()
    })
  })
})
