'use client'

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'
import Portal, { MODAL_ENCIMA_Z_INDEX } from '@/components/ui/Portal'
import { usePunteroGrueso } from '@/hooks/use-puntero-grueso'
import { BARRA_DE_ARRASTRE } from '@/lib/ui/hoja-modal'
import { cn } from '@/lib/utils'

/**
 * El desplegable propio, en vez del `<select>` del navegador.
 *
 * ── Por qué ────────────────────────────────────────────────────────────────
 *
 * Medido: 56 `<select>` con 140 `<option>` en 26 archivos, y 44 de ellos sin
 * siquiera `appearance-none`, así que mostraban la flecha gris del sistema.
 * Pero el problema de fondo no es la flecha: es que la LISTA de opciones la
 * pinta el sistema operativo y no hay forma de darle estilo. En iOS es una
 * rueda que sube desde abajo, en Android una lista blanca, en Windows un menú
 * gris. La misma pantalla se ve distinta en cada teléfono.
 *
 * Y había un motivo más concreto: con un `<select>` nativo no se puede mostrar
 * nada dentro de la opción salvo texto plano. Varias pantallas de este sistema
 * quieren enseñar un importe, un estado o un icono junto al nombre.
 *
 * ── Decisiones, y por qué ──────────────────────────────────────────────────
 *
 * **Con el dedo abre desde abajo; con ratón, pegado al campo.** Es la misma
 * decisión que ya tomaron el `Tooltip` y los diálogos de este proyecto, y se
 * apoya en el mismo `usePunteroGrueso`: `(pointer: coarse)` pregunta por el
 * dispositivo de entrada, no por el ancho, porque una tableta grande se toca
 * y un portátil pequeño no.
 *
 * **El teclado funciona de verdad.** Flechas, Inicio, Fin, Escape, Enter, y
 * escribir para buscar —si tecleas «ef» salta a «Efectivo»—. Un `<select>`
 * nativo hace todo eso y sustituirlo por un `div` que solo responde al ratón
 * sería un retroceso, no una mejora. Esto es lo que una librería de
 * primitivas daría hecho; aquí se hace a mano porque el proyecto tiene 16
 * dependencias y queremos que siga así.
 *
 * **No se busca con filtro.** Es un selector, no un buscador: filtrar mientras
 * se escribe es otro componente (un combobox) y mezclarlos complica los dos.
 * Escribir salta a la opción, que es lo que hace el nativo.
 *
 * **Funciona sin conexión** porque no pide nada: es markup y estado local.
 */

export type OpcionSelector<T extends string = string> = {
  value: T
  label: string
  /** Lo que se pinta en la lista, si hace falta más que el texto. */
  contenido?: ReactNode
  disabled?: boolean
}

type Props<T extends string = string> = {
  value: T | ''
  onChange: (value: T) => void
  opciones: readonly OpcionSelector<T>[]
  /** Lo que se lee cuando no hay nada elegido. */
  placeholder?: string
  /** El nombre del campo, para lectores de pantalla. Va en el `aria-label`. */
  etiqueta?: string
  /** El id de un `<label>` de fuera, si ya existe uno. */
  etiquetadoPor?: string
  disabled?: boolean
  required?: boolean
  className?: string
  /** Para que un formulario nativo siga enviando el valor. */
  name?: string
  id?: string
}

/** Cuánto se espera entre teclas antes de empezar una búsqueda nueva. */
const PAUSA_DE_BUSQUEDA_MS = 600

export function Selector<T extends string = string>({
  value,
  onChange,
  opciones,
  placeholder = 'Selecciona una opción',
  etiqueta,
  etiquetadoPor,
  disabled = false,
  required = false,
  className,
  name,
  id,
}: Props<T>) {
  const punteroGrueso = usePunteroGrueso()
  const idGenerado = useId()
  const idCampo = id || `selector-${idGenerado}`
  const idLista = `${idCampo}-lista`

  const [abierto, setAbierto] = useState(false)
  const [resaltada, setResaltada] = useState(-1)
  const [posicion, setPosicion] = useState<{
    top: number
    left: number
    width: number
    haciaArriba: boolean
  } | null>(null)

  const disparadorRef = useRef<HTMLButtonElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const busquedaRef = useRef({ texto: '', en: 0 })

  const elegida = useMemo(
    () => opciones.find((o) => o.value === value) ?? null,
    [opciones, value],
  )

  /** La primera opción que se puede elegir, para cuando no hay ninguna. */
  const primeraUtil = useMemo(
    () => opciones.findIndex((o) => !o.disabled),
    [opciones],
  )

  const abrir = useCallback(() => {
    if (disabled) return
    const indice = elegida ? opciones.indexOf(elegida) : primeraUtil
    setResaltada(indice >= 0 ? indice : primeraUtil)
    setAbierto(true)
  }, [disabled, elegida, opciones, primeraUtil])

  const cerrar = useCallback(
    (devolverFoco = true) => {
      setAbierto(false)
      setPosicion(null)
      if (devolverFoco) disparadorRef.current?.focus()
    },
    [],
  )

  const elegir = useCallback(
    (indice: number) => {
      const opcion = opciones[indice]
      if (!opcion || opcion.disabled) return
      onChange(opcion.value)
      cerrar()
    },
    [opciones, onChange, cerrar],
  )

  /**
   * Dónde cae la lista cuando se usa con ratón.
   *
   * Si no cabe debajo, se abre hacia arriba. Sin esto, un selector al final de
   * un formulario largo abre una lista que se sale de la ventana y hay que
   * desplazar la página para ver las opciones.
   */
  useEffect(() => {
    if (!abierto || punteroGrueso) return

    const calcular = () => {
      const caja = disparadorRef.current?.getBoundingClientRect()
      if (!caja) return

      const ALTO_MAXIMO = 288
      const debajo = window.innerHeight - caja.bottom
      const haciaArriba = debajo < Math.min(ALTO_MAXIMO, 200) && caja.top > debajo

      setPosicion({
        top: haciaArriba ? caja.top : caja.bottom + 4,
        left: caja.left,
        width: caja.width,
        haciaArriba,
      })
    }

    calcular()
    window.addEventListener('resize', calcular)
    // `true` para capturar también el desplazamiento de un contenedor interno,
    // que es lo habitual dentro de un diálogo.
    window.addEventListener('scroll', calcular, true)
    return () => {
      window.removeEventListener('resize', calcular)
      window.removeEventListener('scroll', calcular, true)
    }
  }, [abierto, punteroGrueso])

  /** Cerrar al tocar fuera. */
  useEffect(() => {
    if (!abierto) return

    const alTocar = (evento: MouseEvent) => {
      const destino = evento.target as Node
      if (disparadorRef.current?.contains(destino)) return
      if (listaRef.current?.contains(destino)) return
      cerrar(false)
    }

    document.addEventListener('mousedown', alTocar)
    return () => document.removeEventListener('mousedown', alTocar)
  }, [abierto, cerrar])

  /** Mantener a la vista la opción resaltada al moverse con el teclado. */
  useEffect(() => {
    if (!abierto || resaltada < 0) return
    const nodo = listaRef.current?.querySelector<HTMLElement>(
      `[data-indice="${resaltada}"]`,
    )
    nodo?.scrollIntoView({ block: 'nearest' })
  }, [abierto, resaltada])

  /** Mover el resaltado saltándose las opciones deshabilitadas. */
  const mover = useCallback(
    (desde: number, paso: 1 | -1) => {
      if (opciones.length === 0) return -1
      let i = desde
      for (let intentos = 0; intentos < opciones.length; intentos += 1) {
        i = (i + paso + opciones.length) % opciones.length
        if (!opciones[i]?.disabled) return i
      }
      return -1
    },
    [opciones],
  )

  const alTeclear = useCallback(
    (evento: ReactKeyboardEvent) => {
      if (disabled) return

      // Escribir salta a la opción, igual que en un `<select>` nativo.
      if (
        evento.key.length === 1 &&
        !evento.ctrlKey &&
        !evento.metaKey &&
        !evento.altKey
      ) {
        const ahora = Date.now()
        const b = busquedaRef.current
        b.texto = ahora - b.en > PAUSA_DE_BUSQUEDA_MS ? evento.key : b.texto + evento.key
        b.en = ahora

        const buscado = b.texto.toLowerCase()
        const encontrada = opciones.findIndex(
          (o) => !o.disabled && o.label.toLowerCase().startsWith(buscado),
        )
        if (encontrada >= 0) {
          if (abierto) setResaltada(encontrada)
          else elegir(encontrada)
          evento.preventDefault()
        }
        return
      }

      switch (evento.key) {
        case 'ArrowDown':
          evento.preventDefault()
          if (!abierto) abrir()
          else setResaltada((r) => mover(r, 1))
          break
        case 'ArrowUp':
          evento.preventDefault()
          if (!abierto) abrir()
          else setResaltada((r) => mover(r, -1))
          break
        case 'Home':
          if (abierto) {
            evento.preventDefault()
            setResaltada(mover(-1, 1))
          }
          break
        case 'End':
          if (abierto) {
            evento.preventDefault()
            setResaltada(mover(0, -1))
          }
          break
        case 'Enter':
        case ' ':
          evento.preventDefault()
          if (abierto) elegir(resaltada)
          else abrir()
          break
        case 'Escape':
          if (abierto) {
            evento.preventDefault()
            cerrar()
          }
          break
        case 'Tab':
          // Tab sale del campo: se cierra sin robarle el foco al siguiente.
          if (abierto) cerrar(false)
          break
        default:
          break
      }
    },
    [abierto, abrir, cerrar, disabled, elegir, mover, opciones, resaltada],
  )

  const lista = (
    <div
      ref={listaRef}
      id={idLista}
      role="listbox"
      aria-labelledby={etiquetadoPor}
      aria-label={etiquetadoPor ? undefined : etiqueta || placeholder}
      aria-activedescendant={
        resaltada >= 0 ? `${idCampo}-opcion-${resaltada}` : undefined
      }
      className={cn(
        'overflow-y-auto overscroll-contain bg-white py-1',
        punteroGrueso
          ? 'max-h-[60dvh]'
          : 'max-h-72 rounded-xl border border-slate-200 shadow-xl',
      )}
    >
      {opciones.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
          No hay opciones disponibles
        </p>
      ) : (
        opciones.map((opcion, indice) => {
          const seleccionada = opcion.value === value
          return (
            <div
              key={opcion.value}
              id={`${idCampo}-opcion-${indice}`}
              data-indice={indice}
              role="option"
              aria-selected={seleccionada}
              aria-disabled={opcion.disabled || undefined}
              onMouseEnter={() => !opcion.disabled && setResaltada(indice)}
              onClick={() => elegir(indice)}
              className={cn(
                'flex items-center justify-between gap-3 px-4 text-sm',
                // En el teléfono el objetivo tiene que poder tocarse: 48px.
                punteroGrueso ? 'min-h-12 py-3' : 'min-h-9 py-2',
                opcion.disabled
                  ? 'cursor-not-allowed text-slate-300'
                  : 'cursor-pointer text-slate-700',
                !opcion.disabled && indice === resaltada && 'bg-slate-100',
                seleccionada && 'font-bold text-[#08557f]',
              )}
            >
              <span className="min-w-0 flex-1 truncate">
                {opcion.contenido ?? opcion.label}
              </span>
              {seleccionada ? (
                <Check className="h-4 w-4 shrink-0 text-[#08557f]" aria-hidden />
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )

  return (
    <>
      {/*
        El valor para un formulario nativo. El desplegable propio es un botón,
        y un botón no se envía: sin esto, un `<form>` que lea `FormData`
        perdería el campo.
      */}
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <button
        ref={disparadorRef}
        id={idCampo}
        type="button"
        role="combobox"
        aria-expanded={abierto}
        aria-haspopup="listbox"
        aria-controls={abierto ? idLista : undefined}
        aria-labelledby={etiquetadoPor}
        aria-label={etiquetadoPor ? undefined : etiqueta}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={alTeclear}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-left text-sm font-medium transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#08557f] focus-visible:ring-offset-1',
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            : 'border-slate-200 text-slate-900 hover:border-slate-300',
          abierto && !disabled && 'border-[#08557f] ring-2 ring-[#08557f]/15',
          className,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !elegida && 'text-slate-400')}>
          {elegida ? elegida.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
            abierto && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {abierto ? (
        <Portal>
          {punteroGrueso ? (
            // Con el dedo: una hoja que sube desde abajo, como el resto de
            // los diálogos de este proyecto.
            <div
              className="fixed inset-0 flex items-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
              style={{ zIndex: MODAL_ENCIMA_Z_INDEX }}
              onClick={() => cerrar(false)}
            >
              <div
                className="w-full rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={BARRA_DE_ARRASTRE} />
                {etiqueta ? (
                  <p className="px-4 pb-2 pt-1 text-sm font-bold text-slate-900">
                    {etiqueta}
                  </p>
                ) : null}
                {lista}
              </div>
            </div>
          ) : posicion ? (
            <div
              className="fixed animate-in fade-in zoom-in-95 duration-150"
              style={{
                zIndex: MODAL_ENCIMA_Z_INDEX,
                top: posicion.haciaArriba ? undefined : posicion.top,
                bottom: posicion.haciaArriba
                  ? window.innerHeight - posicion.top + 4
                  : undefined,
                left: posicion.left,
                width: posicion.width,
              }}
            >
              {lista}
            </div>
          ) : null}
        </Portal>
      ) : null}
    </>
  )
}

export default Selector
