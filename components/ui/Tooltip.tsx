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
} from 'react'
import Portal, { TOOLTIP_Z_INDEX } from '@/components/ui/Portal'
import { usePunteroGrueso } from '@/hooks/use-puntero-grueso'

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
  /**
   * Abrir y cerrar al PULSAR, en vez de al pasar por encima.
   *
   * Es lo que necesita un `?` de ayuda, que esta ahi justamente para que lo
   * pulsen: con el toque largo de 400 ms —que es lo correcto cuando la ayuda
   * acompana a un boton que hace otra cosa— un `?` parece no responder.
   */
  abrirAlPulsar?: boolean
}

/** Milisegundos de pulsación para que cuente como «toque largo». */
const ESPERA_TOQUE_LARGO = 400


export default function Tooltip({
  texto,
  children,
  lado = 'arriba',
  abrirAlPulsar = false,
}: TooltipProps) {
  const id = useId()
  const punteroGrueso = usePunteroGrueso()
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
  const propsDelAncla = (abrirAlPulsar
      ? {
          'aria-describedby': visible ? id : undefined,
          'aria-expanded': visible,
          onClick: (evento: React.MouseEvent<HTMLElement>) => {
            propio<React.MouseEvent>('onClick')?.(evento)
            if (visible) ocultar()
            else mostrar(evento.currentTarget)
          },
          // El foco no la abre aqui: con el clic ya abierta, enfocar volveria
          // a abrirla y el segundo clic la cerraria y la abriria de nuevo.
          onBlur: (evento: React.FocusEvent) => {
            propio<React.FocusEvent>('onBlur')?.(evento)
            if (!punteroGrueso) ocultar()
          },
        }
      : {
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
      }) as Record<string, unknown>

  // eslint-disable-next-line react-hooks/refs
  const conAncla = cloneElement(children, propsDelAncla)

  // En el teléfono la explicación sale como hoja desde abajo. Se mira
  // `punteroGrueso` y no el tamaño: lo que decide es con qué se señala.
  if (visible && punteroGrueso) {
    return (
      <>
        {conAncla}
        <Portal>
          {/* El fondo cierra al tocarlo, que es lo que cualquiera intenta
              primero. Sin esto, en el móvil la ayuda se quedaba abierta: se
              cerraba con Escape —que no existe en un teléfono— o haciendo
              scroll. */}
          <div
            style={{ zIndex: TOOLTIP_Z_INDEX }}
            className="fixed inset-0 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150 motion-reduce:animate-none"
            onClick={ocultar}
          >
            <div
              id={id}
              role="tooltip"
              className="w-full rounded-t-2xl bg-slate-900/95 px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm font-medium leading-relaxed text-white shadow-2xl animate-in slide-in-from-bottom duration-200 ease-out motion-reduce:animate-none"
            >
              <div
                className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/30"
                aria-hidden="true"
              />
              {texto}
            </div>
          </div>
        </Portal>
      </>
    )
  }

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
