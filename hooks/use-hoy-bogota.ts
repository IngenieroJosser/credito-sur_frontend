'use client'

import { useCallback, useEffect, useState } from 'react'
import { getBogotaDateKey } from '@/lib/rutas-core'

/**
 * El día de hoy en Bogotá, y que cambie solo a medianoche.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Este bloque de veinticinco líneas estaba escrito TRES veces, idéntico:
 *
 *     app/admin/rutas/[id]/ruta-client.tsx
 *     components/dashboards/SupervisorCobroView.tsx
 *     components/dashboards/VistaCobrador.tsx
 *
 * Son las tres pantallas que muestran una ruta, y las tres necesitan lo mismo:
 * saber qué día es HOY en Bogotá para decidir qué visitas toca cobrar.
 *
 * ── Las dos cosas que resuelve, y que son fáciles de olvidar ────────────────
 *
 * **El día es el de Bogotá, no el del teléfono.** `new Date().getDate()` da el
 * día del dispositivo. Con el huso mal puesto —un Android recién formateado,
 * el de alguien que viajó— o en el cambio de día, la ruta que se enseña es la
 * de otra fecha. Y aquí las fechas son cobros.
 *
 * **Se renueva a medianoche sin recargar.** El cobrador deja la aplicación
 * abierta en el teléfono. Sin esto, a las 00:01 sigue viendo la ruta de ayer
 * hasta que recargue, y no tiene por qué saber que hay que recargar. El
 * temporizador se programa para la medianoche de Bogotá exacta y se vuelve a
 * programar después, en vez de preguntar cada minuto.
 *
 * El respaldo cuando `getBogotaDateKey` no puede resolver la zona arma la
 * llave con el reloj local: es peor que Bogotá, pero mucho mejor que quedarse
 * sin día y no pintar ninguna visita.
 */
export function useHoyBogota(): string {
  const calcular = useCallback(() => {
    const ahora = new Date()
    return (
      getBogotaDateKey(ahora) ||
      `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(
        ahora.getDate(),
      ).padStart(2, '0')}`
    )
  }, [])

  const [hoy, setHoy] = useState<string>(() => calcular())

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined

    /**
     * Cuánto falta para la medianoche de Bogotá.
     *
     * `T24:00:00-05:00` es la medianoche del día SIGUIENTE expresada como la
     * hora 24 del actual, que es la forma de decirlo sin tener que sumar un
     * día a mano y acertar con los meses. El mínimo de un segundo evita un
     * temporizador a cero si se ejecuta justo en el cambio.
     */
    const msHastaMedianoche = () => {
      const ahora = new Date()
      const llave = getBogotaDateKey(ahora)
      if (!llave) return 60_000
      const siguiente = new Date(`${llave}T24:00:00-05:00`).getTime()
      return Math.max(1_000, siguiente - ahora.getTime())
    }

    const programar = () => {
      temporizador = setTimeout(() => {
        setHoy(calcular())
        programar()
      }, msHastaMedianoche())
    }

    programar()
    return () => {
      if (temporizador) clearTimeout(temporizador)
    }
  }, [calcular])

  return hoy
}
