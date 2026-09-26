'use client'

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import Portal, { TOOLTIP_Z_INDEX } from '@/components/ui/Portal'

/**
 * La ayuda que explica un control.
 *
 * El sistema está lleno de botones que son solo un icono: la X de cerrar, el
 * lápiz de editar, el ojo de ver el expediente, la papelera. Quien los usa a
 * diario los reconoce; quien entra nuevo, no. El `title` del navegador no sirve
 * de sustituto: tarda un segundo largo en salir, no se ve en móvil y no se
 * puede leer con el teclado.
 *
 * Tres cosas que este componente hace y el `title` no:
 *
 *  - **Funciona con el dedo.** El cobrador trabaja en el móvil, donde no hay
 *    «pasar el ratón por encima». Aquí un toque largo lo muestra, y tocar
 *    fuera lo cierra. En un puntero fino sale al pasar por encima, como se
 *    espera.
 *  - **Se lee con el teclado.** Aparece al enfocar el control y se cierra con
 *    Escape, y va enlazado con `aria-describedby` para que un lector de
 *    pantalla lo anuncie junto al nombre del botón.
 *  - **No se recorta.** Se dibuja en un portal, encima del modal que lo
 *    contenga, porque muchas tarjetas del sistema llevan `overflow-hidden` y
 *    cortarían un tooltip dibujado dentro.
 *
 * Respeta `prefers-reduced-motion`: si el sistema pide menos movimiento, no
 * hay transición.
 */

type Lado = 'arriba' | 'abajo'

interface TooltipProps {
  /** Lo que se explica. Si está vacío, el control se dibuja sin ayuda. */
  texto?: string | null
  /** El control al que acompaña. Recibe los manejadores y `aria-describedby`. */
  children: ReactElement
  /** Por defecto sale arriba; si no cabe, se coloca abajo solo. */
  lado?: Lado
}

/** Milisegundos de pulsación para que cuente como «toque largo». */
const ESPERA_TOQUE_LARGO = 400

export default function Tooltip({ texto, children, lado = 'arriba' }: TooltipProps) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const [posicion, setPosicion] = useState<{
    top: number
    left: number
    lado: Lado
  } | null>(null)

  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const limpiarTemporizador = useCallback(() => {
    if (temporizadorRef.current) {
      clearTimeout(temporizadorRef.current)
      temporizadorRef.current = null
    }
  }, [])

  /**
   * Se mide el ancla en el momento de mostrar, no antes: la tarjeta puede
   * haberse movido con un scroll y una posición guardada quedaría desfasada.
   */
  const mostrar = useCallback((ancla: HTMLElement | null) => {
    if (!ancla || !texto) return

    const caja = ancla.getBoundingClientRect()
    const cabeArriba = caja.top > 56
    const ladoFinal: Lado = lado === 'arriba' && cabeArriba ? 'arriba' : 'abajo'

    setPosicion({
      top: ladoFinal === 'arriba' ? caja.top - 8 : caja.bottom + 8,
      left: caja.left + caja.width / 2,
      lado: ladoFinal,
    })
    setVisible(true)
  }, [lado, texto])

  const ocultar = useCallback(() => {
    limpiarTemporizador()
    setVisible(false)
  }, [limpiarTemporizador])

  // Cerrar con Escape y al hacer scroll: un tooltip anclado a una posición
  // vieja queda flotando en medio de la nada.
  useEffect(() => {
    if (!visible) return
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') ocultar()
    }
    window.addEventListener('keydown', alPulsar)
    window.addEventListener('scroll', ocultar, true)
    window.addEventListener('resize', ocultar)
    return () => {
      window.removeEventListener('keydown', alPulsar)
      window.removeEventListener('scroll', ocultar, true)
      window.removeEventListener('resize', ocultar)
    }
  }, [visible, ocultar])

  useEffect(() => limpiarTemporizador, [limpiarTemporizador])

  /** Toque largo: se guarda el elemento porque el evento se recicla. */
  const iniciarToqueLargo = useCallback(
    (ancla: HTMLElement) => {
      limpiarTemporizador()
      temporizadorRef.current = setTimeout(
        () => mostrar(ancla),
        ESPERA_TOQUE_LARGO,
      )
    },
    [limpiarTemporizador, mostrar],
  )

  // Sin texto no hay nada que explicar: se devuelve el control tal cual.
  if (!texto || !isValidElement(children)) return children ?? null

  /**
   * El manejador que el control ya tuviera, leido en el momento de disparar.
   *
   * No se lee `children.props` durante el render a proposito: en React 19 las
   * props incluyen `ref`, y tocarlas ahi hace saltar la regla de los hooks.
   */
  const propio = <E,>(nombre: string) =>
    (children.props as Record<string, unknown> | undefined)?.[nombre] as
      | ((evento: E) => void)
      | undefined

  // La regla marca cualquier `cloneElement` con props durante el render por
  // si toca una `ref`. Aqui no toca ninguna: `temporizadorRef` solo se usa
  // dentro de callbacks y las props del hijo se leen al disparar el evento.
  // La alternativa -envolver el control en un <span>- si romperia la
  // maquetacion de los botones con `flex-1` o `w-full`, que hay unos
  // cuantos, asi que clonar es lo correcto aqui.
  // eslint-disable-next-line react-hooks/refs
  const conAncla = cloneElement(children, {
    'aria-describedby': visible ? id : undefined,
    onMouseEnter: (evento: React.MouseEvent<HTMLElement>) => {
      propio<React.MouseEvent>('onMouseEnter')?.(evento)
      mostrar(evento.currentTarget)
    },
    onMouseLeave: (evento: React.MouseEvent) => {
      propio<React.MouseEvent>('onMouseLeave')?.(evento)
      ocultar()
    },
    onFocus: (evento: React.FocusEvent<HTMLElement>) => {
      propio<React.FocusEvent>('onFocus')?.(evento)
      mostrar(evento.currentTarget)
    },
    onBlur: (evento: React.FocusEvent) => {
      propio<React.FocusEvent>('onBlur')?.(evento)
      ocultar()
    },
    onTouchStart: (evento: React.TouchEvent<HTMLElement>) => {
      propio<React.TouchEvent>('onTouchStart')?.(evento)
      iniciarToqueLargo(evento.currentTarget)
    },
    onTouchEnd: (evento: React.TouchEvent) => {
      propio<React.TouchEvent>('onTouchEnd')?.(evento)
      limpiarTemporizador()
    },
    onTouchCancel: ocultar,
  } as Record<string, unknown>)

  return (
    <>
      {conAncla}
      {visible && posicion ? (
        <Portal>
          <div
            id={id}
            role="tooltip"
            style={{
              position: 'fixed',
              top: posicion.top,
              left: posicion.left,
              transform:
                posicion.lado === 'arriba'
                  ? 'translate(-50%, -100%)'
                  : 'translate(-50%, 0)',
              zIndex: TOOLTIP_Z_INDEX,
            }}
            className="pointer-events-none max-w-[16rem] rounded-xl bg-slate-900/95 px-3 py-2 text-xs font-medium leading-snug text-white shadow-lg backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none"
          >
            {texto}
          </div>
        </Portal>
      ) : null}
    </>
  )
}
