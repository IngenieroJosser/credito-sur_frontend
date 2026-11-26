'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { mensajeDeError } from '@/lib/mensaje-de-error'

/** Conserva el último resultado confirmado y descarta respuestas superadas. */
export function useConsultaPorPeriodo<T, K extends string>(
  clave: K,
  consultar: () => Promise<T>,
  mensaje: string,
  habilitada = true,
) {
  const version = useRef(0)
  const [resultado, setResultado] = useState<{ clave: K; datos: T } | null>(null)
  const [peticion, setPeticion] = useState<{ clave: K; error: string | null } | null>(null)

  const recargar = useCallback(async () => {
    if (!habilitada) return
    const actual = ++version.current
    setPeticion({ clave, error: null })
    try {
      const datos = await consultar()
      if (version.current !== actual) return
      setResultado({ clave, datos })
      setPeticion(null)
    } catch (error) {
      if (version.current === actual) setPeticion({ clave, error: mensajeDeError(error, mensaje) })
    }
  }, [clave, consultar, habilitada, mensaje])

  useEffect(() => {
    void recargar()
    return () => { version.current++ }
  }, [recargar])

  const error = peticion?.clave === clave ? peticion.error : null
  return {
    resultado,
    cargando: habilitada && !error && (resultado?.clave !== clave || peticion?.clave === clave),
    error,
    recargar,
  }
}
