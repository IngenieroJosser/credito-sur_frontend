'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /creditos-articulos/nuevo
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SupervisorNuevoCreditoArticuloRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/creditos-articulos/nuevo')
  }, [router])

  return null
}
