import type { ReactNode } from 'react'
import AyudaContextual from '@/components/ui/AyudaContextual'
import type { ClaveDeAyuda } from '@/lib/ayudas/textos-de-ayuda'
import { cn } from '@/lib/utils'

interface FieldLabelProps {
  children: ReactNode
  required?: boolean
  className?: string
  requiredClassName?: string
  /**
   * La explicacion de este campo, del diccionario compartido.
   *
   * Va aqui y no en `Selector` o en `CampoFecha` porque la etiqueta VISIBLE
   * es esta: la `etiqueta` del `Selector` solo alimenta su `aria-label` y la
   * cabecera de su hoja en el movil, asi que un `?` puesto alli no se veria
   * al lado del rotulo.
   */
  ayuda?: ClaveDeAyuda
  /** De que es la ayuda, para el lector de pantalla. Por defecto, la etiqueta. */
  deAyuda?: string
}

export default function FieldLabel({
  children,
  required = false,
  className,
  requiredClassName,
  ayuda,
  deAyuda,
}: FieldLabelProps) {
  return (
    <label className={cn('block text-sm font-bold text-slate-700 mb-2', className)}>
      {children}
      {required && (
        <span className={cn('ml-1 text-red-500', requiredClassName)} aria-label="obligatorio">
          *
        </span>
      )}
      {ayuda ? (
        <AyudaContextual
          ayuda={ayuda}
          de={deAyuda ?? (typeof children === 'string' ? children.toLowerCase() : undefined)}
          tamano="pequeno"
        />
      ) : null}
    </label>
  )
}
