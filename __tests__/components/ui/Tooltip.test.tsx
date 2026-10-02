import { act, fireEvent, render, screen } from '@testing-library/react'
import Tooltip from '@/components/ui/Tooltip'

/**
 * Lo que tiene que cumplir la ayuda de un control.
 *
 * Se prueba el comportamiento, no el aspecto: que aparezca por los tres
 * caminos que la gente usa de verdad (ratón, teclado y dedo), que se enlace
 * con el control para que un lector de pantalla la lea, y que no estorbe
 * cuando no hay nada que explicar.
 */
describe('Tooltip', () => {
  it('no se muestra hasta que hace falta', () => {
    render(
      <Tooltip texto="Cerrar">
        <button>X</button>
      </Tooltip>,
    )
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('aparece al pasar el raton y se va al salir', () => {
    render(
      <Tooltip texto="Eliminar">
        <button>borrar</button>
      </Tooltip>,
    )
    const boton = screen.getByRole('button')

    fireEvent.mouseEnter(boton)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Eliminar')

    fireEvent.mouseLeave(boton)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('aparece al enfocar con el teclado', () => {
    render(
      <Tooltip texto="Ver detalle">
        <button>ojo</button>
      </Tooltip>,
    )
    fireEvent.focus(screen.getByRole('button'))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Ver detalle')
  })

  it('se cierra con Escape', () => {
    render(
      <Tooltip texto="Actualizar">
        <button>refrescar</button>
      </Tooltip>,
    )
    fireEvent.focus(screen.getByRole('button'))
    expect(screen.getByRole('tooltip')).not.toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('con el dedo sale tras un toque largo, no al roce', () => {
    jest.useFakeTimers()
    try {
      render(
        <Tooltip texto="Llamar">
          <button>telefono</button>
        </Tooltip>,
      )
      const boton = screen.getByRole('button')

      // Un toque corto no debe tapar la pantalla con una ayuda.
      fireEvent.touchStart(boton)
      fireEvent.touchEnd(boton)
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(screen.queryByRole('tooltip')).toBeNull()

      // Mantenerlo pulsado si.
      fireEvent.touchStart(boton)
      act(() => {
        jest.advanceTimersByTime(500)
      })
      expect(screen.getByRole('tooltip')).toHaveTextContent('Llamar')
    } finally {
      jest.useRealTimers()
    }
  })

  it('queda enlazado con el control para el lector de pantalla', () => {
    render(
      <Tooltip texto="Guardar">
        <button aria-label="Guardar cambios">disco</button>
      </Tooltip>,
    )
    const boton = screen.getByRole('button')
    expect(boton).not.toHaveAttribute('aria-describedby')

    fireEvent.focus(boton)
    const tooltip = screen.getByRole('tooltip')
    expect(boton.getAttribute('aria-describedby')).toBe(tooltip.id)
  })

  it('sin texto deja el control intacto y no envuelve nada', () => {
    render(
      <Tooltip texto="">
        <button>solo</button>
      </Tooltip>,
    )
    fireEvent.mouseEnter(screen.getByRole('button'))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('no se lleva por delante el onClick del control', () => {
    const alPulsar = jest.fn()
    render(
      <Tooltip texto="Confirmar">
        <button onClick={alPulsar}>ok</button>
      </Tooltip>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(alPulsar).toHaveBeenCalledTimes(1)
  })

  it('no se lleva por delante un onMouseEnter propio del control', () => {
    const alEntrar = jest.fn()
    render(
      <Tooltip texto="Confirmar">
        <button onMouseEnter={alEntrar}>ok</button>
      </Tooltip>,
    )
    fireEvent.mouseEnter(screen.getByRole('button'))
    expect(alEntrar).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('tooltip')).not.toBeNull()
  })
})
