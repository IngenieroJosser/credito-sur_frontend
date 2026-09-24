'use client'

import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Tooltip from '@/components/ui/Tooltip'

/**
 * Botón para acciones que hacen algo contra el servidor.
 *
 * Mientras la acción corre se deshabilita solo y muestra un spinner. Nació
 * porque varios formularios no bloqueaban nada al guardar: no pasaba nada
 * visible, la gente volvía a hacer clic y se creaba el mismo registro dos o
 * tres veces.
 *
 * La alternativa era un `useState` de "guardando" en cada pantalla, repetido y
 * fácil de olvidar. Aquí el estado vive en el botón: quien lo usa solo pasa su
 * `onClick` asíncrono y no tiene que acordarse de nada.
 *
 * Si la acción falla, el error se vuelve a lanzar para que la pantalla lo
 * maneje como siempre; el botón solo se encarga de volver a habilitarse.
 */

interface BotonAccionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onClick?: (
    evento: React.MouseEvent<HTMLButtonElement>,
  ) => void | Promise<void>
  /** Texto mientras corre. Si no se pasa, se conserva el contenido normal. */
  textoCargando?: string
  /** Ícono a la izquierda cuando NO está cargando. */
  icono?: ReactNode
  /**
   * Texto de ayuda al pasar por encima, enfocar o mantener pulsado.
   *
   * Mientras la acción corre no se muestra: en ese momento el propio botón ya
   * dice lo que está pasando ("Guardando…") y tapárselo con una ayuda estorba.
   */
  ayuda?: string | null
  children?: ReactNode
}

export default function BotonAccion({
  onClick,
  textoCargando,
  icono,
  ayuda,
  children,
  disabled,
  className,
  type = 'button',
  ...resto
}: BotonAccionProps) {
  const [enCurso, setEnCurso] = useState(false)
  // Evita que un doble clic muy rápido dispare dos veces antes de repintar.
  const corriendoRef = useRef(false)
  // Tras desmontarse (un modal que se cierra al guardar) no se toca el estado.
  const montadoRef = useRef(true)

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])

  const manejar = useCallback(
    async (evento: React.MouseEvent<HTMLButtonElement>) => {
      if (!onClick || corriendoRef.current) return
      corriendoRef.current = true
      setEnCurso(true)
      try {
        await onClick(evento)
      } finally {
        corriendoRef.current = false
        if (montadoRef.current) setEnCurso(false)
      }
    },
    [onClick],
  )

  const boton = (
    <button
      {...resto}
      type={type}
      onClick={manejar}
      disabled={disabled || enCurso}
      aria-busy={enCurso}
      className={cn(
        'inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {enCurso ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        icono
      )}
      {enCurso && textoCargando ? textoCargando : children}
    </button>
  )

  return <Tooltip texto={enCurso ? null : ayuda}>{boton}</Tooltip>
}
