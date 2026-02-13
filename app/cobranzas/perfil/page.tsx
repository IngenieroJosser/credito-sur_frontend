'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /perfil
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CobranzasPerfilRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/perfil')
  }, [router])

  return null
}
