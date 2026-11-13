import { fireEvent, render, screen } from '@testing-library/react'
import { CampoFecha } from '@/components/ui/CampoFecha'

/**
 * El calendario propio sustituye a `<input type="date">`.
 *
 * Lo que se vigila aquí, por encima de todo, es el DÍA: construir una fecha
 * desde `YYYY-MM-DD` es la forma más fácil de equivocarse en un día entero, y
 * en este sistema un día de diferencia es una cuota en mora.
 */
describe('CampoFecha', () => {
  it('muestra la fecha escrita, no el formato del sistema', () => {
    // El campo nativo pinta la fecha en el formato del SISTEMA: un teléfono en
    // inglés enseña 11/13/2026 donde el resto de la app enseña 13/11/2026.
    // Escrita no hay ambigüedad posible entre el día y el mes.
    render(<CampoFecha value="2026-11-13" onChange={jest.fn()} etiqueta="Fecha" />)
    expect(screen.getByRole('button', { name: 'Fecha' })).toHaveTextContent(
      '13 de noviembre de 2026',
    )
  })

  it('sin valor muestra el texto de ayuda', () => {
    render(<CampoFecha value="" onChange={jest.fn()} placeholder="Elige el día" />)
    expect(screen.getByText('Elige el día')).toBeInTheDocument()
  })

  it('abre el calendario en el mes de la fecha elegida', () => {
    render(<CampoFecha value="2026-03-05" onChange={jest.fn()} etiqueta="Fecha" />)
    fireEvent.click(screen.getByRole('button', { name: 'Fecha' }))
    expect(screen.getByText('marzo 2026')).toBeInTheDocument()
  })

  it('elegir un día devuelve YYYY-MM-DD, igual que el nativo', () => {
    // El valor NO cambia de forma: los formularios que ya lo leen siguen igual.
    const onChange = jest.fn()
    render(<CampoFecha value="2026-11-13" onChange={onChange} etiqueta="Fecha" />)
    fireEvent.click(screen.getByRole('button', { name: 'Fecha' }))
    fireEvent.click(screen.getByRole('button', { name: '20 de noviembre de 2026' }))

    expect(onChange).toHaveBeenCalledWith('2026-11-20')
  })

  it('el día NO se corre al construir la fecha', () => {
    // `new Date('2026-11-13')` es medianoche UTC, que en Bogotá (UTC-5) cae el
    // día ANTERIOR. Por eso las fechas se construyen a mediodía. Si alguien lo
    // cambiara, este caso lo caza: el día 1 es el más expuesto.
    const onChange = jest.fn()
    render(<CampoFecha value="2026-11-01" onChange={onChange} etiqueta="Fecha" />)

    expect(screen.getByRole('button', { name: 'Fecha' })).toHaveTextContent(
      '1 de noviembre de 2026',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Fecha' }))
    fireEvent.click(screen.getByRole('button', { name: '1 de noviembre de 2026' }))
    expect(onChange).toHaveBeenCalledWith('2026-11-01')
  })

  it('se puede cambiar de mes', () => {
    render(<CampoFecha value="2026-11-13" onChange={jest.fn()} etiqueta="Fecha" />)
    fireEvent.click(screen.getByRole('button', { name: 'Fecha' }))

    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(screen.getByText('diciembre 2026')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(screen.getByText('octubre 2026')).toBeInTheDocument()
  })

  it('respeta el mínimo y el máximo', () => {
    const onChange = jest.fn()
    render(
      <CampoFecha
        value="2026-11-13"
        onChange={onChange}
        etiqueta="Fecha"
        min="2026-11-10"
        max="2026-11-20"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Fecha' }))

    const fuera = screen.getByRole('button', { name: '5 de noviembre de 2026' })
    expect(fuera).toBeDisabled()
    fireEvent.click(fuera)
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '15 de noviembre de 2026' }))
    expect(onChange).toHaveBeenCalledWith('2026-11-15')
  })

  it('se puede borrar lo elegido', () => {
    const onChange = jest.fn()
    render(<CampoFecha value="2026-11-13" onChange={onChange} etiqueta="Fecha" />)
    fireEvent.click(screen.getByRole('button', { name: 'Fecha' }))
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }))

    expect(onChange).toHaveBeenCalledWith('')
  })

  it('sin fecha elegida no ofrece borrar', () => {
    render(<CampoFecha value="" onChange={jest.fn()} etiqueta="Fecha" />)
    fireEvent.click(screen.getByRole('button', { name: 'Fecha' }))
    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument()
  })

  it('deshabilitado no abre', () => {
    render(<CampoFecha value="" onChange={jest.fn()} etiqueta="Fecha" disabled />)
    fireEvent.click(screen.getByRole('button', { name: 'Fecha' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Escape cierra el calendario', () => {
    render(<CampoFecha value="" onChange={jest.fn()} etiqueta="Fecha" />)
    const disparador = screen.getByRole('button', { name: 'Fecha' })
    fireEvent.click(disparador)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(disparador, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('envía el valor en un formulario nativo', () => {
    const { container } = render(
      <CampoFecha value="2026-11-13" onChange={jest.fn()} name="fechaPago" />,
    )
    const oculto = container.querySelector('input[type="hidden"]')
    expect(oculto).toHaveAttribute('name', 'fechaPago')
    expect(oculto).toHaveValue('2026-11-13')
  })
})
