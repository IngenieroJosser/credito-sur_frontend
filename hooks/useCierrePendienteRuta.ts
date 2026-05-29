'use client'

import { useCallback, useEffect, useState } from 'react'
import { rutasService } from '@/services/rutas-service'
import type { CierrePendienteRuta } from '@/types/rutas/cierre-pendiente'

export function useCierrePendienteRuta(rutaId?: string | null) {
  const [cierrePendiente, setCierrePendiente] = useState<CierrePendienteRuta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const refreshCierrePendiente = useCallback(async () => {
    if (!rutaId) {
      setCierrePendiente(null)
      setError(null)
      return null
    }

    try {
      setLoading(true)
      setError(null)

      const data = await rutasService.getCierrePendiente(rutaId)
      setCierrePendiente(data ?? null)

      return data ?? null
    } catch (error) {
      console.error('[useCierrePendienteRuta] Error:', error)
      setError(error)

      // No afirmar falsamente que no hay cierre pendiente si falló la consulta.
      setCierrePendiente(null)

      return null
    } finally {
      setLoading(false)
    }
  }, [rutaId])

  useEffect(() => {
    let alive = true

    const run = async () => {
      if (!rutaId) {
        if (alive) {
          setCierrePendiente(null)
          setError(null)
        }
        return
      }

      try {
        setLoading(true)
        setError(null)

        const data = await rutasService.getCierrePendiente(rutaId)

        if (!alive) return

        setCierrePendiente(data ?? null)
      } catch (error) {
        if (!alive) return

        console.error('[useCierrePendienteRuta] Error:', error)
        setError(error)
        setCierrePendiente(null)
      } finally {
        if (alive) setLoading(false)
      }
    }

    void run()

    return () => {
      alive = false
    }
  }, [rutaId])

  return {
    cierrePendiente,
    loading,
    error,
    refreshCierrePendiente,
    hasCierrePendiente: Boolean(cierrePendiente?.pendienteCierre),
    noSePudoVerificarCierrePendiente: Boolean(error),
  }
}
