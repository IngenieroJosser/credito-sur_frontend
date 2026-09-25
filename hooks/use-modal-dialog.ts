'use client'

import { useCallback, useEffect, useRef } from 'react'

const SELECTOR_ENFOCABLE = [
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface OpcionesModalDialog {
  /** Si el modal está en pantalla. Los modales que se montan y desmontan pueden omitirlo. */
  abierto?: boolean
  onClose: () => void
  /** Escape cierra el modal. Apagar solo en diálogos que no se deben poder abandonar. */
  cerrarConEscape?: boolean
  /** Mueve el foco al primer campo al abrir. Apagar en modales de solo lectura. */
  enfocarAlAbrir?: boolean
}

/**
 * Lo que le faltaba a los diálogos del sistema.
 *
 * Medido sobre los 36 modales: ninguno cerraba con Escape, uno solo declaraba
 * `role="dialog"`, y dos movían el foco al abrir. Para quien trabaja en
 * escritorio todo el día eso son dos gestos perdidos por modal: Escape para
 * salir y el primer campo listo para escribir sin ir al mouse.
 *
 * El hook devuelve la ref del contenedor y las props de accesibilidad; no pinta
 * nada ni toca el scroll del body, porque de eso ya se encargan los modales que
 * usan `components/ui/Modal.tsx`.
 */
export function useModalDialog<T extends HTMLElement = HTMLDivElement>({
  abierto = true,
  onClose,
  cerrarConEscape = true,
  enfocarAlAbrir = true,
}: OpcionesModalDialog) {
  const contenedorRef = useRef<T | null>(null)
  // Quién tenía el foco antes de abrir, para devolvérselo al cerrar: si no, el
  // foco vuelve al principio de la página y hay que navegar de nuevo hasta el
  // botón que abrió el modal.
  const focoPrevioRef = useRef<HTMLElement | null>(null)

  // `onClose` suele venir como función inline, así que cambia en cada render.
  // Guardarla en una ref evita volver a suscribir el listener de teclado.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!abierto || !cerrarConEscape) return

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return
      // Un select abierto o un datepicker se cierran con Escape por su cuenta;
      // si el evento ya fue atendido, no se cierra el modal encima.
      if (evento.defaultPrevented) return
      evento.stopPropagation()
      onCloseRef.current()
    }

    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [abierto, cerrarConEscape])

  useEffect(() => {
    if (!abierto) return

    const activoAlAbrir = document.activeElement
    focoPrevioRef.current = activoAlAbrir instanceof HTMLElement ? activoAlAbrir : null

    if (enfocarAlAbrir) {
      const contenedor = contenedorRef.current
      const primero = contenedor?.querySelector<HTMLElement>(SELECTOR_ENFOCABLE)
      // Si no hay nada enfocable, el contenedor recibe el foco para que Escape y
      // los lectores de pantalla lo tomen como el diálogo activo.
      ;(primero ?? contenedor)?.focus()
    }

    return () => {
      focoPrevioRef.current?.focus()
    }
  }, [abierto, enfocarAlAbrir])

  /**
   * Para el fondo de un modal con datos escritos.
   *
   * Un toque fuera de la tarjeta cerraba modales con el monto ya escrito y el
   * comprobante ya adjunto, y eso obliga a volver a tomar la foto. Con esto el
   * fondo solo cierra si no hay nada que perder; lo decide cada modal con
   * `hayDatos`. La X y el botón de cancelar cierran siempre.
   */
  const alTocarElFondo = useCallback(
    (evento: React.MouseEvent, hayDatos: boolean) => {
      if (evento.target !== evento.currentTarget) return
      if (hayDatos) return
      onCloseRef.current()
    },
    [],
  )

  return {
    contenedorRef,
    alTocarElFondo,
    propsDialogo: {
      role: 'dialog' as const,
      'aria-modal': true as const,
      tabIndex: -1,
    },
  }
}
