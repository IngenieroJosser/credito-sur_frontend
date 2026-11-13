'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import Portal, { MODAL_ENCIMA_Z_INDEX } from '@/components/ui/Portal'
import { usePunteroGrueso } from '@/hooks/use-puntero-grueso'
import { BARRA_DE_ARRASTRE } from '@/lib/ui/hoja-modal'
import { cn } from '@/lib/utils'

/**
 * El calendario propio, en vez del `<input type="date">` del navegador.
 *
 * ── Por qué ────────────────────────────────────────────────────────────────
 *
 * Medido: 18 campos de fecha, y ninguno estilaba
 * `::-webkit-calendar-picker-indicator`. Pero igual que con el `<select>`, el
 * icono era lo de menos: el CALENDARIO lo dibuja el sistema operativo. En iOS
 * es una rueda, en Android un diálogo de Material, en Firefox otra cosa. La
 * misma pantalla, distinta en cada aparato.
 *
 * Y hay algo peor para este sistema en concreto: el campo nativo muestra la
 * fecha en el formato del SISTEMA, no en el nuestro. Un teléfono en inglés
 * enseña `11/13/2026` donde el resto de la aplicación —que escribe todo en
 * hora de Bogotá y formato de Colombia— enseña `13/11/2026`. Dos formatos en
 * la misma pantalla, y el día y el mes intercambiados: exactamente el tipo de
 * confusión que hace que alguien reprograme un pago con un mes de diferencia.
 *
 * ── Decisiones ─────────────────────────────────────────────────────────────
 *
 * **El valor sigue siendo `YYYY-MM-DD`**, igual que el nativo, para que los
 * formularios que ya lo leen no cambien. Lo que cambia es lo que se VE.
 *
 * **Las fechas se construyen a mediodía.** `new Date('2026-11-13')` se
 * interpreta como medianoche UTC, que en Bogotá (UTC−5) es el día ANTERIOR a
 * las 19:00. Trabajar a mediodía deja cinco horas de margen por cada lado y el
 * día no se corre nunca. Es el mismo cuidado que el resto del proyecto tiene
 * con la hora de Bogotá.
 *
 * **Con el dedo abre desde abajo**, como el resto de los diálogos.
 */

type Props = {
  /** `YYYY-MM-DD`, igual que el `<input type="date">` al que sustituye. */
  value: string
  onChange: (value: string) => void
  etiqueta?: string
  etiquetadoPor?: string
  placeholder?: string
  min?: string
  max?: string
  disabled?: boolean
  required?: boolean
  className?: string
  name?: string
  id?: string
}

const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/**
 * `YYYY-MM-DD` a una fecha local, al mediodía.
 *
 * A mediodía y no a medianoche: `new Date('2026-11-13')` es medianoche UTC, y
 * en Bogotá eso cae el día anterior. Con doce horas de margen el día no se
 * corre ni cambiando de huso.
 */
function aFecha(iso: string): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!partes) return null
  const [, a, m, d] = partes
  return new Date(Number(a), Number(m) - 1, Number(d), 12, 0, 0, 0)
}

/** Una fecha a `YYYY-MM-DD`, leyendo sus campos locales. */
function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

/** «13 de noviembre de 2026». */
function enPalabras(iso: string): string {
  const f = aFecha(iso)
  if (!f) return ''
  return `${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`
}

/** Los días que se pintan en la cuadrícula, empezando en lunes. */
function diasDelMes(ancla: Date): (Date | null)[] {
  const primero = new Date(ancla.getFullYear(), ancla.getMonth(), 1, 12)
  const ultimo = new Date(ancla.getFullYear(), ancla.getMonth() + 1, 0, 12)
  // `getDay()` da 0 para domingo; aquí la semana empieza en lunes.
  const hueco = (primero.getDay() + 6) % 7

  const celdas: (Date | null)[] = Array(hueco).fill(null)
  for (let d = 1; d <= ultimo.getDate(); d += 1) {
    celdas.push(new Date(ancla.getFullYear(), ancla.getMonth(), d, 12))
  }
  return celdas
}

export function CampoFecha({
  value,
  onChange,
  etiqueta,
  etiquetadoPor,
  placeholder = 'Elige una fecha',
  min,
  max,
  disabled = false,
  required = false,
  className,
  name,
  id,
}: Props) {
  const punteroGrueso = usePunteroGrueso()
  const idGenerado = useId()
  const idCampo = id || `fecha-${idGenerado}`

  const [abierto, setAbierto] = useState(false)
  const [ancla, setAncla] = useState<Date>(() => aFecha(value) || new Date())
  const [posicion, setPosicion] = useState<{ top: number; left: number } | null>(null)

  const disparadorRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const elegida = useMemo(() => aFecha(value), [value])
  const hoyIso = useMemo(() => aIso(new Date()), [])

  // Al abrir, el calendario arranca en el mes de lo ya elegido.
  useEffect(() => {
    if (abierto) setAncla(aFecha(value) || new Date())
  }, [abierto, value])

  const cerrar = useCallback((devolverFoco = true) => {
    setAbierto(false)
    setPosicion(null)
    if (devolverFoco) disparadorRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!abierto || punteroGrueso) return

    const calcular = () => {
      const caja = disparadorRef.current?.getBoundingClientRect()
      if (!caja) return
      const ALTO = 360
      const haciaArriba = window.innerHeight - caja.bottom < ALTO && caja.top > ALTO
      setPosicion({
        top: haciaArriba ? Math.max(8, caja.top - ALTO - 4) : caja.bottom + 4,
        left: Math.max(8, Math.min(caja.left, window.innerWidth - 328)),
      })
    }

    calcular()
    window.addEventListener('resize', calcular)
    window.addEventListener('scroll', calcular, true)
    return () => {
      window.removeEventListener('resize', calcular)
      window.removeEventListener('scroll', calcular, true)
    }
  }, [abierto, punteroGrueso])

  useEffect(() => {
    if (!abierto) return
    const alTocar = (evento: MouseEvent) => {
      const destino = evento.target as Node
      if (disparadorRef.current?.contains(destino)) return
      if (panelRef.current?.contains(destino)) return
      cerrar(false)
    }
    document.addEventListener('mousedown', alTocar)
    return () => document.removeEventListener('mousedown', alTocar)
  }, [abierto, cerrar])

  const fueraDeRango = useCallback(
    (f: Date) => {
      const iso = aIso(f)
      if (min && iso < min) return true
      if (max && iso > max) return true
      return false
    },
    [min, max],
  )

  const elegir = useCallback(
    (f: Date) => {
      if (fueraDeRango(f)) return
      onChange(aIso(f))
      cerrar()
    },
    [fueraDeRango, onChange, cerrar],
  )

  const moverMes = useCallback((paso: number) => {
    setAncla((a) => new Date(a.getFullYear(), a.getMonth() + paso, 1, 12))
  }, [])

  const calendario = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={etiqueta ? `Calendario de ${etiqueta}` : 'Calendario'}
      className={cn(
        'bg-white p-3',
        punteroGrueso ? 'w-full' : 'w-80 rounded-xl border border-slate-200 shadow-xl',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moverMes(-1)}
          aria-label="Mes anterior"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-bold capitalize text-slate-900">
          {MESES[ancla.getMonth()]} {ancla.getFullYear()}
        </p>
        <button
          type="button"
          onClick={() => moverMes(1)}
          aria-label="Mes siguiente"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {DIAS.map((d) => (
          <span
            key={d}
            className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400"
          >
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {diasDelMes(ancla).map((f, i) => {
          if (!f) return <span key={`hueco-${i}`} />

          const iso = aIso(f)
          const esElegida = value === iso
          const esHoy = hoyIso === iso
          const bloqueada = fueraDeRango(f)

          return (
            <button
              key={iso}
              type="button"
              disabled={bloqueada}
              onClick={() => elegir(f)}
              aria-label={enPalabras(iso)}
              aria-current={esHoy ? 'date' : undefined}
              className={cn(
                'rounded-lg text-sm font-medium',
                // 44 px en táctil: lo que hace falta para acertar con el pulgar.
                punteroGrueso ? 'h-11' : 'h-9',
                bloqueada && 'cursor-not-allowed text-slate-300',
                !bloqueada && !esElegida && 'text-slate-700 hover:bg-slate-100',
                esHoy && !esElegida && 'ring-1 ring-inset ring-primary/40',
                esElegida && 'bg-primary font-bold text-white',
              )}
            >
              {f.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={() => elegir(new Date())}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-primary hover:bg-slate-100"
        >
          Hoy
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange('')
              cerrar()
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            Borrar
          </button>
        ) : null}
      </div>
    </div>
  )

  return (
    <>
      {/* Para que un formulario nativo siga enviando el valor. */}
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <button
        ref={disparadorRef}
        id={idCampo}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-labelledby={etiquetadoPor}
        aria-label={etiquetadoPor ? undefined : etiqueta}
        /*
          Sin `aria-required`: no es valido sobre `role=button`, que es lo que
          este disparador es de forma implicita. Un boton no puede estar
          «relleno» o «vacio», asi que el atributo no significa nada ahi y los
          lectores de pantalla lo ignoran o lo anuncian mal. Que el campo sea
          obligatorio lo dice su etiqueta, que es donde se lee.
        */
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && abierto) {
            e.preventDefault()
            cerrar()
          }
        }}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-left text-sm font-medium transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            : 'border-slate-200 text-slate-900 hover:border-slate-300',
          abierto && !disabled && 'border-primary ring-2 ring-primary/15',
          className,
        )}
      >
        <span className={cn('truncate', !elegida && 'text-slate-400')}>
          {elegida ? enPalabras(value) : placeholder}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      {abierto ? (
        <Portal>
          {punteroGrueso ? (
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
                  <p className="px-4 pb-1 text-sm font-bold text-slate-900">{etiqueta}</p>
                ) : null}
                {calendario}
              </div>
            </div>
          ) : posicion ? (
            <div
              className="fixed animate-in fade-in zoom-in-95 duration-150"
              style={{ zIndex: MODAL_ENCIMA_Z_INDEX, top: posicion.top, left: posicion.left }}
            >
              {calendario}
            </div>
          ) : null}
        </Portal>
      ) : null}
    </>
  )
}

export default CampoFecha
