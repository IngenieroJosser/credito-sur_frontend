'use client'

import { useEffect, useState } from 'react'

/**
 * Si quien usa la pantalla lo hace con el dedo y no con un ratón.
 *
 * Decide cosas que no se pueden decidir por el ancho de la ventana: una
 * tableta grande se toca y un portátil pequeño no. `(pointer: coarse)`
 * pregunta por el dispositivo de entrada, que es lo que de verdad importa para
 * saber si hay `hover`, si el objetivo tiene que ser más grande, y si un
 * desplegable debe abrirse desde abajo como en una aplicación del teléfono.
 *
 * Estaba escrito dentro de `components/ui/Tooltip.tsx` y lo necesitaba también
 * el selector. Se saca aquí para que no acaben siendo dos copias que se
 * separan: ya ha pasado varias veces en este proyecto con helpers duplicados.
 *
 * Devuelve `false` en el primer render —también en el del servidor— y el valor
 * real en cuanto el efecto corre. Así la pintura del servidor y la del
 * navegador coinciden y no hay parpadeo de hidratación.
 */
export function usePunteroGrueso(): boolean {
  const [grueso, setGrueso] = useState(false)

  useEffect(() => {
    // `matchMedia` no existe durante el renderizado en el servidor, y el
    // valor se lee en un efecto para que la primera pintura del servidor y la
    // del navegador coincidan.
    if (typeof window === 'undefined' || !window.matchMedia) return

    const consulta = window.matchMedia('(pointer: coarse)')
    setGrueso(consulta.matches)

    const alCambiar = (evento: MediaQueryListEvent) => setGrueso(evento.matches)
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  return grueso
}
