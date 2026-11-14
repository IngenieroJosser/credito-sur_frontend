import type { ReactNode } from 'react'
import AyudaContextual from '@/components/ui/AyudaContextual'
import type { ClaveDeAyuda } from '@/lib/ayudas/textos-de-ayuda'
import { cn } from '@/lib/utils'

interface FieldLabelProps {
  /**
   * El `id` del campo que esta etiqueta nombra.
   *
   * Hacía falta: el `<label>` se pintaba sin `htmlFor` y el campo es su
   * HERMANO, no su hijo, así que no estaban unidos. Medido: 80 etiquetas en 11
   * archivos y ningún campo con `id`.
   *
   * Lo que eso significa para quien usa el sistema: un lector de pantalla
   * anuncia el campo sin nombre —«cuadro de edición, en blanco»— y pulsar la
   * etiqueta no lleva el cursor al campo, que es lo que todo el mundo espera.
   */
  htmlFor?: string
  /**
   * Para cuando la etiqueta NO nombra un campo sino un GRUPO —una fila de
   * botones, por ejemplo—.
   *
   * Ahi `htmlFor` no sirve: apuntaria a un control que no existe. Lo que
   * corresponde es `id` aqui y `role="group" aria-labelledby` en el
   * contenedor.
   */
  id?: string
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
  htmlFor,
  id,
  children,
  required = false,
  className,
  requiredClassName,
  ayuda,
  deAyuda,
}: FieldLabelProps) {
  return (
    <label
      id={id}
      htmlFor={htmlFor}
      className={cn('block text-sm font-bold text-slate-700 mb-2', className)}
    >
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
