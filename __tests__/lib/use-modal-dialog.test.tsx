import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import { useModalDialog } from '@/hooks/use-modal-dialog'

/**
 * El hook del que van a depender los modales del sistema.
 *
 * Medido antes de escribirlo: de los 36 modales, ninguno cerraba con Escape, uno
 * solo declaraba `role="dialog"` y dos movían el foco al abrir.
 *
 * Lo delicado es la pila: los listeners viven en `document`, así que sin ella un
 * Escape cerraría a la vez el modal de encima y el de abajo.
 */

function Dialogo({
  onClose,
  abierto = true,
  cerrarConEscape,
  enfocarAlAbrir,
  etiqueta = 'dialogo',
}: {
  onClose: () => void
  abierto?: boolean
  cerrarConEscape?: boolean
  enfocarAlAbrir?: boolean
  etiqueta?: string
}) {
  const { contenedorRef, alTocarElFondo, propsDialogo } = useModalDialog<HTMLDivElement>({
    abierto,
    onClose,
    cerrarConEscape,
    enfocarAlAbrir,
  })

  if (!abierto) return null

  return (
    <div data-testid={`fondo-${etiqueta}`} onClick={(e) => alTocarElFondo(e, false)}>
      <div ref={contenedorRef} {...propsDialogo} data-testid={`tarjeta-${etiqueta}`}>
        <input placeholder={`primer campo ${etiqueta}`} />
        <button>otro</button>
      </div>
    </div>
  )
}

describe('useModalDialog', () => {
  describe('Escape', () => {
    it('cierra el diálogo', () => {
      const onClose = jest.fn()
      render(<Dialogo onClose={onClose} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('no cierra con otra tecla', () => {
      const onClose = jest.fn()
      render(<Dialogo onClose={onClose} />)

      fireEvent.keyDown(document, { key: 'Enter' })
      fireEvent.keyDown(document, { key: 'a' })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('no cierra si el evento ya fue atendido por otro control', () => {
      // Un select abierto o un datepicker se cierran solos con Escape y marcan el
      // evento; ahí el modal no debe cerrarse encima.
      //
      // `defaultPrevented` no se puede fijar desde `fireEvent`, así que se marca
      // de verdad: un listener en fase de CAPTURA corre antes que el del hook
      // (que escucha en burbuja) y llama a preventDefault.
      const onClose = jest.fn()
      const marcarAtendido = (e: Event) => e.preventDefault()
      document.addEventListener('keydown', marcarAtendido, true)

      render(<Dialogo onClose={onClose} />)
      fireEvent.keyDown(document, { key: 'Escape' })

      document.removeEventListener('keydown', marcarAtendido, true)
      expect(onClose).not.toHaveBeenCalled()
    })

    it('se puede apagar, para diálogos que no se deben poder abandonar', () => {
      const onClose = jest.fn()
      render(<Dialogo onClose={onClose} cerrarConEscape={false} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('no escucha mientras el diálogo está cerrado', () => {
      const onClose = jest.fn()
      render(<Dialogo onClose={onClose} abierto={false} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('deja de escuchar al desmontarse', () => {
      const onClose = jest.fn()
      const { unmount } = render(<Dialogo onClose={onClose} />)
      unmount()

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('modales anidados', () => {
    it('Escape cierra solo el de encima', () => {
      const cerrarAbajo = jest.fn()
      const cerrarEncima = jest.fn()

      render(
        <>
          <Dialogo onClose={cerrarAbajo} etiqueta="abajo" />
          <Dialogo onClose={cerrarEncima} etiqueta="encima" />
        </>,
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(cerrarEncima).toHaveBeenCalledTimes(1)
      expect(cerrarAbajo).not.toHaveBeenCalled()
    })

    it('al cerrarse el de encima, Escape vuelve a cerrar el de abajo', () => {
      const cerrarAbajo = jest.fn()
      const cerrarEncima = jest.fn()

      const { rerender } = render(
        <>
          <Dialogo onClose={cerrarAbajo} etiqueta="abajo" />
          <Dialogo onClose={cerrarEncima} etiqueta="encima" abierto />
        </>,
      )

      rerender(
        <>
          <Dialogo onClose={cerrarAbajo} etiqueta="abajo" />
          <Dialogo onClose={cerrarEncima} etiqueta="encima" abierto={false} />
        </>,
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(cerrarAbajo).toHaveBeenCalledTimes(1)
    })

    it('un diálogo de encima que no cierra con Escape tampoco deja cerrar al de abajo', () => {
      // Si la pila solo registrara a los que escuchan, un diálogo de confirmación
      // sin Escape dejaría que el Escape cerrara el formulario que tiene detrás.
      const cerrarAbajo = jest.fn()
      const cerrarEncima = jest.fn()

      render(
        <>
          <Dialogo onClose={cerrarAbajo} etiqueta="abajo" />
          <Dialogo onClose={cerrarEncima} etiqueta="encima" cerrarConEscape={false} />
        </>,
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(cerrarAbajo).not.toHaveBeenCalled()
      expect(cerrarEncima).not.toHaveBeenCalled()
    })
  })

  describe('foco', () => {
    it('pone el foco en el primer campo al abrir', () => {
      render(<Dialogo onClose={jest.fn()} />)

      expect(document.activeElement).toBe(screen.getByPlaceholderText('primer campo dialogo'))
    })

    it('se puede apagar para diálogos de solo lectura', () => {
      render(<Dialogo onClose={jest.fn()} enfocarAlAbrir={false} />)

      expect(document.activeElement).not.toBe(screen.getByPlaceholderText('primer campo dialogo'))
    })

    it('devuelve el foco a quien lo tenía al cerrar', () => {
      const abridor = document.createElement('button')
      document.body.appendChild(abridor)
      abridor.focus()
      expect(document.activeElement).toBe(abridor)

      const { unmount } = render(<Dialogo onClose={jest.fn()} />)
      expect(document.activeElement).not.toBe(abridor)

      unmount()

      expect(document.activeElement).toBe(abridor)
      abridor.remove()
    })
  })

  describe('props de accesibilidad', () => {
    it('marca la tarjeta como diálogo', () => {
      render(<Dialogo onClose={jest.fn()} />)

      const tarjeta = screen.getByTestId('tarjeta-dialogo')
      expect(tarjeta).toHaveAttribute('role', 'dialog')
      expect(tarjeta).toHaveAttribute('aria-modal', 'true')
    })
  })

  describe('el fondo', () => {
    it('cierra cuando no hay nada escrito', () => {
      const onClose = jest.fn()
      render(<Dialogo onClose={onClose} />)

      fireEvent.click(screen.getByTestId('fondo-dialogo'))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('no cierra por un clic que nació dentro de la tarjeta', () => {
      const onClose = jest.fn()
      render(<Dialogo onClose={onClose} />)

      fireEvent.click(screen.getByTestId('tarjeta-dialogo'))

      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
