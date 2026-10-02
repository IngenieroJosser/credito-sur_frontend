'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Ancho del menú lateral, ajustable por cada usuario.
 *
 * El aside era de ancho fijo (w-64). Quien trabaja con nombres largos de rutas
 * o clientes los veía cortados, y en pantallas grandes sobraba espacio. Ahora
 * se arrastra el borde y la medida se guarda en el navegador, así que cada
 * persona la deja como le sirve y la encuentra igual la próxima vez.
 *
 * Solo aplica desde `lg`: en móvil el aside es un cajón que se desliza y
 * cambiarle el ancho no aporta nada.
 */

export const ANCHO_ASIDE_POR_DEFECTO = 256
export const ANCHO_ASIDE_MINIMO = 208
export const ANCHO_ASIDE_MAXIMO = 420

const CLAVE = 'credisur_ancho_aside'

const acotar = (valor: number) =>
  Math.min(ANCHO_ASIDE_MAXIMO, Math.max(ANCHO_ASIDE_MINIMO, Math.round(valor)))

export function useAnchoAside() {
  const [ancho, setAncho] = useState(ANCHO_ASIDE_POR_DEFECTO)
  const [ajustando, setAjustando] = useState(false)
  const anchoRef = useRef(ancho)

  // Se lee después de montar: en el servidor no hay localStorage y leerlo
  // durante el render haría que el HTML del servidor y el del cliente difieran.
  useEffect(() => {
    try {
      const guardado = Number(localStorage.getItem(CLAVE))
      if (Number.isFinite(guardado) && guardado > 0) {
        const valor = acotar(guardado)
        anchoRef.current = valor
        setAncho(valor)
      }
    } catch {
      /* sin localStorage se queda con el ancho por defecto */
    }
  }, [])

  const guardar = useCallback((valor: number) => {
    try {
      localStorage.setItem(CLAVE, String(valor))
    } catch {
      /* si no se puede guardar, al menos vale para esta sesión */
    }
  }, [])

  /** Empieza el arrastre. Se escucha en window para no perder el puntero. */
  const iniciarAjuste = useCallback(
    (eventoInicial: React.PointerEvent<HTMLElement>) => {
      eventoInicial.preventDefault()
      setAjustando(true)

      const mover = (evento: PointerEvent) => {
        const valor = acotar(evento.clientX)
        anchoRef.current = valor
        setAncho(valor)
      }

      const soltar = () => {
        window.removeEventListener('pointermove', mover)
        window.removeEventListener('pointerup', soltar)
        window.removeEventListener('pointercancel', soltar)
        setAjustando(false)
        guardar(anchoRef.current)
      }

      window.addEventListener('pointermove', mover)
      window.addEventListener('pointerup', soltar)
      window.addEventListener('pointercancel', soltar)
    },
    [guardar],
  )

  /** Vuelve al ancho original (doble clic en el borde). */
  const restablecer = useCallback(() => {
    anchoRef.current = ANCHO_ASIDE_POR_DEFECTO
    setAncho(ANCHO_ASIDE_POR_DEFECTO)
    guardar(ANCHO_ASIDE_POR_DEFECTO)
  }, [guardar])

  /** Con el teclado: flechas para mover el borde, Inicio para restablecer. */
  const ajustarConTeclado = useCallback(
    (evento: React.KeyboardEvent<HTMLElement>) => {
      const paso = evento.shiftKey ? 32 : 8
      if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') {
        evento.preventDefault()
        const valor = acotar(
          anchoRef.current + (evento.key === 'ArrowRight' ? paso : -paso),
        )
        anchoRef.current = valor
        setAncho(valor)
        guardar(valor)
      } else if (evento.key === 'Home') {
        evento.preventDefault()
        restablecer()
      }
    },
    [guardar, restablecer],
  )

  return { ancho, ajustando, iniciarAjuste, restablecer, ajustarConTeclado }
}
