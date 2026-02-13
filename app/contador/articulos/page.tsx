'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /articulos
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContadorArticulosRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/articulos')
  }, [router])

  return null
}
