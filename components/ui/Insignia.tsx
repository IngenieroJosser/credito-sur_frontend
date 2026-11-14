import { cn } from '@/lib/utils'

/**
 * La insignia del sistema: una pastilla con su borde, su color y su tamaño.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Los rótulos pequeños —«PENDIENTE», «SIN ENVIAR», «ABIERTA», «OFFLINE»— se
 * venían escribiendo a mano en cada pantalla, y se nota: el de los clientes
 * en el teléfono era un rectángulo de 8 píxeles con `tracking-tighter`, con
 * las letras pegadas, al lado de pastillas redondas de 10 píxeles que son lo
 * que usa el resto del sistema.
 *
 * Esto no migra las que ya existen: pone el molde para la que se estaba
 * arreglando y deja de dónde copiar para las siguientes.
 *
 * ── Decisiones ──────────────────────────────────────────────────────────────
 *
 * - `rounded-full` y borde, como el resto de las pastillas de la aplicación.
 * - `text-[10px]` con `tracking-wide`: por debajo de eso las mayúsculas se
 *   juntan y en un teléfono no se leen.
 * - Altura mínima de 20 px para que no quede aplastada entre dos líneas.
 */

export type TonoDeInsignia =
  | 'ambar'
  | 'azul'
  | 'verde'
  | 'rojo'
  | 'neutro'

const TONOS: Record<TonoDeInsignia, string> = {
  ambar: 'border-amber-200 bg-amber-50 text-amber-700',
  azul: 'border-blue-200 bg-blue-50 text-blue-700',
  verde: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rojo: 'border-rose-200 bg-rose-50 text-rose-700',
  neutro: 'border-slate-200 bg-slate-100 text-slate-600',
}

export default function Insignia({
  children,
  tono = 'neutro',
  className,
  icono,
}: {
  children: React.ReactNode
  tono?: TonoDeInsignia
  className?: string
  /** Un punto, un reloj: algo pequeño a la izquierda del texto. */
  icono?: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-[20px] shrink-0 items-center gap-1 rounded-full border px-2 py-0.5',
        'text-[10px] font-bold uppercase leading-none tracking-wide',
        TONOS[tono],
        className,
      )}
    >
      {icono}
      {children}
    </span>
  )
}
