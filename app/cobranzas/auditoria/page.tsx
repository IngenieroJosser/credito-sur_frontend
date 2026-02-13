'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /auditoria
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CobranzasAuditoriaRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/auditoria')
  }, [router])

  return null
}
