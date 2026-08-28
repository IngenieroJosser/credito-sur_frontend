'use client'

import PantallaCarga from './PantallaCarga'

/**
 * Nombre anterior de la pantalla de carga.
 *
 * Se conserva para no tocar las pantallas que ya la usaban, pero por dentro es
 * la misma de siempre: `PantallaCarga`. En pantallas nuevas use esa
 * directamente, o `Cargando` si lo que carga es una sección y no toda la vista.
 */
export default function AnimacionCarga({ texto }: { texto?: string }) {
  return <PantallaCarga texto={texto} />
}
