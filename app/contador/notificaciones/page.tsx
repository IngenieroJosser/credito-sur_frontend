'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /notificaciones
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContadorNotificacionesRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/notificaciones')
  }, [router])

  return null
}
