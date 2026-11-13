import { fireEvent, render, screen } from '@testing-library/react'
import { Selector } from '@/components/ui/Selector'

/**
 * El desplegable propio tiene que ser al menos tan bueno como el nativo.
 *
 * Sustituir un `<select>` por un `div` bonito que solo responde al ratón es un
 * RETROCESO, no una mejora: el nativo ya traía teclado completo, anuncio por
 * lector de pantalla y búsqueda al escribir. Estas pruebas existen para que no
 * perdamos nada de eso por el camino.
 */

const OPCIONES = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'CHEQUE', label: 'Cheque', disabled: true },
  { value: 'TARJETA', label: 'Tarjeta' },
] as const

function montar(props: Partial<React.ComponentProps<typeof Selector>> = {}) {
  const onChange = jest.fn()
  render(
    <Selector
      value=""
      onChange={onChange}
      opciones={OPCIONES as never}
      etiqueta="Método de pago"
      {...props}
    />,
  )
  return { onChange, disparador: screen.getByRole('combobox') }
}

describe('Selector', () => {
  it('se anuncia como un desplegable con su nombre', () => {
    const { disparador } = montar()
    expect(disparador).toHaveAttribute('aria-expanded', 'false')
    expect(disparador).toHaveAttribute('aria-haspopup', 'listbox')
    expect(disparador).toHaveAccessibleName('Método de pago')
  })

  it('muestra el texto de ayuda cuando no hay nada elegido', () => {
    montar({ placeholder: 'Elige cómo paga' })
    expect(screen.getByText('Elige cómo paga')).toBeInTheDocument()
  })

  it('muestra la etiqueta de lo elegido, no su valor', () => {
    montar({ value: 'TRANSFERENCIA' })
    // Lo que se ve es «Transferencia», no «TRANSFERENCIA».
    expect(screen.getByRole('combobox')).toHaveTextContent('Transferencia')
  })

  it('abre la lista al pulsar y la marca como tal', () => {
    const { disparador } = montar()
    fireEvent.click(disparador)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(disparador).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('option')).toHaveLength(4)
  })

  it('elegir una opción la devuelve y cierra', () => {
    const { onChange, disparador } = montar()
    fireEvent.click(disparador)
    fireEvent.click(screen.getByText('Transferencia'))

    expect(onChange).toHaveBeenCalledWith('TRANSFERENCIA')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  describe('el teclado, que es lo que no se puede perder', () => {
    it('la flecha abajo abre la lista', () => {
      const { disparador } = montar()
      fireEvent.keyDown(disparador, { key: 'ArrowDown' })
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('Enter elige la opción resaltada', () => {
      const { onChange, disparador } = montar()
      fireEvent.keyDown(disparador, { key: 'ArrowDown' }) // abre en la 1.ª
      fireEvent.keyDown(disparador, { key: 'ArrowDown' }) // baja a la 2.ª
      fireEvent.keyDown(disparador, { key: 'Enter' })

      expect(onChange).toHaveBeenCalledWith('TRANSFERENCIA')
    })

    it('las flechas se saltan las opciones deshabilitadas', () => {
      // «Cheque» está deshabilitada: bajar desde «Transferencia» tiene que
      // llegar a «Tarjeta», no quedarse en una opción que no se puede elegir.
      const { onChange, disparador } = montar({ value: 'TRANSFERENCIA' })
      fireEvent.keyDown(disparador, { key: 'ArrowDown' }) // abre en la elegida
      fireEvent.keyDown(disparador, { key: 'ArrowDown' }) // salta Cheque
      fireEvent.keyDown(disparador, { key: 'Enter' })

      expect(onChange).toHaveBeenCalledWith('TARJETA')
    })

    it('Escape cierra sin elegir nada', () => {
      const { onChange, disparador } = montar()
      fireEvent.keyDown(disparador, { key: 'ArrowDown' })
      fireEvent.keyDown(disparador, { key: 'Escape' })

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('escribir salta a la opción, como en el nativo', () => {
      const { onChange, disparador } = montar()
      // Cerrado, escribir elige directamente.
      fireEvent.keyDown(disparador, { key: 't' })
      expect(onChange).toHaveBeenCalledWith('TRANSFERENCIA')
    })

    it('Inicio y Fin van al primero y al último', () => {
      const { onChange, disparador } = montar()
      fireEvent.keyDown(disparador, { key: 'ArrowDown' })
      fireEvent.keyDown(disparador, { key: 'End' })
      fireEvent.keyDown(disparador, { key: 'Enter' })

      expect(onChange).toHaveBeenCalledWith('TARJETA')
    })

    it('Tab cierra la lista y no se queda abierta por detrás', () => {
      const { disparador } = montar()
      fireEvent.keyDown(disparador, { key: 'ArrowDown' })
      fireEvent.keyDown(disparador, { key: 'Tab' })

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('deshabilitado no abre', () => {
    const { disparador } = montar({ disabled: true })
    fireEvent.click(disparador)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('una opción deshabilitada no se puede elegir con el ratón', () => {
    const { onChange, disparador } = montar()
    fireEvent.click(disparador)
    fireEvent.click(screen.getByText('Cheque'))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('sin opciones lo dice en vez de abrir una lista vacía', () => {
    const { disparador } = montar({ opciones: [] })
    fireEvent.click(disparador)
    expect(screen.getByText('No hay opciones disponibles')).toBeInTheDocument()
  })

  it('envía el valor en un formulario nativo', () => {
    // El disparador es un `<button>`, y un botón no se envía. Sin el campo
    // oculto, un `<form>` que lea `FormData` perdería este dato.
    const { container } = render(
      <Selector
        value="EFECTIVO"
        onChange={jest.fn()}
        opciones={OPCIONES as never}
        name="metodoPago"
      />,
    )
    const oculto = container.querySelector('input[type="hidden"]')
    expect(oculto).toHaveAttribute('name', 'metodoPago')
    expect(oculto).toHaveValue('EFECTIVO')
  })
})
