import { render, screen } from '@testing-library/react'
import { CapaAccion } from '@/components/ui/PantallaCarga'
import { ACCION_Z_INDEX, MODAL_Z_INDEX, TOAST_Z_INDEX } from '@/components/ui/Portal'

/**
 * La capa que tapa mientras una acción está en curso.
 *
 * No es decorativa. En la vista del cobrador, al registrar un pago el modal se
 * cierra antes de que salga la petición y la visita sigue apareciendo como no
 * pagada hasta que responden dos llamadas seguidas. En esa ventana se podía
 * tocar el mismo cliente otra vez, y como cada toque genera su propia
 * `idempotencyKey`, el backend los cuenta como dos pagos distintos.
 *
 * De ahí lo que se fija aquí: que bloquee de verdad, que diga qué se está
 * haciendo, y que desaparezca entera cuando no hay nada en curso —si se queda
 * pegada, el cobrador no puede trabajar—.
 */
describe('CapaAccion', () => {
  it('sin accion en curso no dibuja nada', () => {
    const { container } = render(<CapaAccion texto={null} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('un texto vacio tampoco la muestra', () => {
    // Es el caso de un estado recien limpiado a cadena vacia en vez de null.
    render(<CapaAccion texto="" />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('dice que se esta haciendo, con esas palabras', () => {
    render(<CapaAccion texto="Registrando el pago…" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Registrando el pago…')
  })

  it('se anuncia como ocupado para un lector de pantalla', () => {
    render(<CapaAccion texto="Solicitando la base…" />)
    const capa = screen.getByRole('alert')
    expect(capa).toHaveAttribute('aria-busy', 'true')
    expect(capa).toHaveAttribute('aria-live', 'assertive')
  })

  it('tapa la ventana entera, que es lo que impide volver a pulsar', () => {
    render(<CapaAccion texto="Registrando el gasto…" />)
    const capa = screen.getByRole('alert')
    // `fixed inset-0`: si solo cubriera una parte, el cliente de al lado
    // seguiria siendo pulsable.
    expect(capa).toHaveClass('fixed')
    expect(capa).toHaveClass('inset-0')
  })

  it('queda encima del modal que la lanzo y debajo de los avisos', () => {
    render(<CapaAccion texto="Creando el crédito…" />)
    const capa = screen.getByRole('alert')

    // Encima del modal: si no, no taparia el propio modal desde el que se pulsa.
    expect(ACCION_Z_INDEX).toBeGreaterThan(MODAL_Z_INDEX)
    // Debajo de los avisos: el mensaje de como salio la cosa tiene que leerse.
    expect(ACCION_Z_INDEX).toBeLessThan(TOAST_Z_INDEX)
    expect(capa.style.zIndex).toBe(String(ACCION_Z_INDEX))
  })

  it('desaparece entera al terminar, sin dejar la pantalla bloqueada', () => {
    const { rerender } = render(<CapaAccion texto="Registrando el pago…" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(<CapaAccion texto={null} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
