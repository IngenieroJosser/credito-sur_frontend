import { cn } from '@/lib/utils'

/**
 * Esqueletos de carga, con la misma forma que el contenido que va a llegar.
 *
 * Por qué, y no un spinner centrado: el spinner no dice cuánto falta ni qué va
 * a aparecer, y al llegar los datos la pantalla salta de golpe. El esqueleto
 * ocupa el mismo lugar que el contenido real, así que la página no se mueve y
 * se entiende que está cargando, no vacía.
 *
 * `aria-hidden` a propósito: para quien usa lector de pantalla el estado de
 * carga lo anuncia el contenedor (`aria-busy`), no estas cajas grises.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-lg bg-slate-200/70', className)}
    />
  )
}

/** Varias líneas de texto; la última sale más corta, como un párrafo real. */
export function SkeletonTexto({
  lineas = 3,
  className,
}: {
  lineas?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lineas }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', i === lineas - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

/** Tarjeta con título, un par de líneas y un pie. */
export function SkeletonTarjeta({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonTexto lineas={2} className="mt-4" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  )
}

/** Rejilla de tarjetas, para los listados que se ven en cuadrícula. */
export function SkeletonTarjetas({
  cantidad = 6,
  className,
}: {
  cantidad?: number
  className?: string
}) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: cantidad }).map((_, i) => (
        <SkeletonTarjeta key={i} />
      ))}
    </div>
  )
}

/** Filas de tabla, con el mismo número de columnas que la tabla real. */
export function SkeletonTabla({
  filas = 6,
  columnas = 5,
  className,
}: {
  filas?: number
  columnas?: number
  className?: string
}) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-white',
        className,
      )}
    >
      <span className="sr-only">Cargando…</span>
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: filas }).map((_, fila) => (
          <div key={fila} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: columnas }).map((_, col) => (
              <Skeleton
                key={col}
                className={cn('h-3.5 flex-1', col === 0 && 'max-w-[9rem]')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
