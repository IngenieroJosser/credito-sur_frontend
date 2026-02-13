import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'

// 1. Mock de next/navigation
// Necesitamos mockear useRouter para evitar error fuera de Next.js context
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
}))

// 2. Mock de next/image
// Next/Image es complejo de testear, lo reemplazamos por un img normal
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // Filtramos props exclusivas de Next/Image que React lanza warning en <img>
    const { fill, priority, ...rest } = props
    return <img {...rest} alt={props.alt} />
  },
}))

// 3. Mock de lucide-react (Iconos)
jest.mock('lucide-react', () => ({
  Eye: () => <div data-testid="icon-eye" />,
  EyeOff: () => <div data-testid="icon-eye-off" />,
  Lock: () => <div data-testid="icon-lock" />,
  User: () => <div data-testid="icon-user" />,
  ChevronRight: () => <div data-testid="icon-chevron" />,
}))

// 4. Mock del Server Action (Import dinámico)
// Como el componente hace `await import('./actions')`, necesitamos mockear ese módulo
jest.mock('@/app/login/actions', () => ({
  loginAction: jest.fn().mockResolvedValue({
    success: true,
    user: { nombres: 'Test', apellidos: 'User', rol: 'ADMINISTRADOR' },
    redirectTo: '/admin',
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock de localStorage
    const localStorageMock = (function() {
      let store: Record<string, string> = {}
      return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value.toString()
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key]
        }),
        clear: jest.fn(() => {
          store = {}
        }),
      }
    })()
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    })
  })

  it('debería renderizar el formulario de login correctamente', () => {
    render(<LoginPage />)
    
    // Verificar elementos principales
    expect(screen.getByPlaceholderText(/Usuario/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Acceder al Panel/i })).toBeInTheDocument()
    // El título está dividido en spans, usamos heading role que los concatena
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CrediSur')
  })

  it('debería mostrar error si se intenta enviar formulario vacío', async () => {
    render(<LoginPage />)
    
    // Buscamos el botón
    const submitButton = screen.getByRole('button', { name: /Acceder al Panel/i })
    fireEvent.click(submitButton)
    
    // Esperamos a que aparezca el error
    // El error aparece en dos lugares: en el Toast (fixed) y abajo del botón
    // Buscamos cualquiera de los dos. getAllByText devuelve array, getByText falla si hay varios.
    await waitFor(() => {
      const errorMessages = screen.getAllByText('Credenciales requeridas')
      expect(errorMessages.length).toBeGreaterThan(0)
    })
  })

  it('debería permitir escribir usuario y contraseña', () => {
    render(<LoginPage />)
    
    const userInput = screen.getByPlaceholderText(/Usuario/i)
    const passwordInput = screen.getByPlaceholderText(/Contraseña/i)
    
    fireEvent.change(userInput, { target: { value: 'admin' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    
    expect(userInput).toHaveValue('admin')
    expect(passwordInput).toHaveValue('password123')
  })

  // Nota: Probar la integración real con el server action mockeado es complejo 
  // debido al import dinámico dentro de la función. 
  // Para esta prueba unitaria nos centramos en la UI y validaciones.
})
