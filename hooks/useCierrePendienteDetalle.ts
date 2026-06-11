'use client'

import { useState, useCallback } from 'react'
import { rutasService } from '@/services/rutas-service'
import type { CierrePendienteDetalle } from '@/types/rutas/cierre-pendiente'

export function useCierrePendienteDetalle(rutaId?: string | null) {
  const [detalle, setDetalle] = useState<CierrePendienteDetalle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const cargarDetalle = useCallback(async () => {
    if (!rutaId) return null

    try {
      setLoading(true)
      setError(null)

      const data = await rutasService.getCierrePendienteDetalle(rutaId) as CierrePendienteDetalle
      setDetalle(data)
      return data
    } catch (error) {
      console.error('[useCierrePendienteDetalle] Error:', error)
      setError(error)
      return null
    } finally {
      setLoading(false)
    }
  }, [rutaId])

  return {
    detalle,
    loading,
    error,
    cargarDetalle,
  }
}
