'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * La forma de volver de una pantalla a la que se llega desde otra.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Medido sobre las 113 pantallas que pintan algo: 53 están a tres niveles o
 * más, y **4 de ellas no tenían ninguna forma de salir** en toda su cadena de
 * componentes, ni estaban en el menú lateral de ningún rol:
 *
 *     /admin/pagos/registro              se llega con `?prestamoId=…`
 *     /coordinador/rutas/asignacion
 *     /coordinador/sistema/sincronizacion
 *     /supervisor/reportes/operativos
 *
 * De esas cuatro solo se sale con el botón atrás del navegador, que en la app
 * instalada como PWA no siempre está a la vista.
 *
 * Las otras 49 no lo necesitan y por eso no se tocan: se llega a ellas desde
 * el menú, y el menú es cómo se sale. Poner migas de pan en las 113 habría
 * sido trabajo para tapar un problema que solo tienen cuatro.
 *
 * ── El fallo que arrastraban los veinte «volver» que ya había ───────────────
 *
 * El sistema tenía veinte `router.back()`, dieciocho `<ArrowLeft>` y
 * veintiséis `<ChevronLeft>`: tres formas distintas de lo mismo. Y todas con
 * el mismo problema de fondo: `router.back()` solo funciona si hay a dónde
 * volver.
 *
 * Si alguien llega a la pantalla escribiendo la URL, abriendo un enlace de una
 * notificación, o al arrancar la app instalada en ese punto, el historial está
 * vacío y pulsar «Volver» no hace nada —o saca de la aplicación—. Por eso aquí
 * el destino es OBLIGATORIO: se usa el historial si lo hay, y si no, se va al
 * sitio que la pantalla declare.
 *
 * Los veinte de antes no se migran en este paso: cada uno vive en una cabecera
 * distinta y cambiarlos a ciegas, sin poder abrir las pantallas, movería
 * veinte maquetaciones. Queda dicho.
 */

type Props = {
  /**
   * A dónde ir si no hay historial. Obligatorio: sin esto el botón no hace
   * nada cuando se llega a la pantalla por una URL directa.
   */
  destino: string
  /** Lo que se lee. Por defecto, «Volver». */
  texto?: string
  className?: string
}

export default function VolverAtras({
  destino,
  texto = 'Volver',
  className,
}: Props) {
  const router = useRouter()

  const volver = () => {
    // `history.length` es 1 cuando esta pestaña no ha navegado a ningún sitio
    // todavía: ahí `back()` no tiene a dónde ir.
    const hayHistorial =
      typeof window !== 'undefined' && window.history.length > 1
    if (hayHistorial) router.back()
    else router.push(destino)
  }

  return (
    <button
      type="button"
      onClick={volver}
      className={cn(
        // 44 px con el dedo, como el resto de lo que se pulsa.
        'inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3',
        'text-sm font-bold text-slate-600',
        'transition-colors duration-150 ease-out hover:bg-slate-100 hover:text-slate-900',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'motion-reduce:transition-none',
        'sm:min-h-0 sm:py-2',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      {texto}
    </button>
  )
}
