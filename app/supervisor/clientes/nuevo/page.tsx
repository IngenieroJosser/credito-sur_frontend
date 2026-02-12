'use client'

/**
 * @deprecated Ruta legacy. La creación de clientes se maneja via NuevoClienteModal.
 * Redirige al dashboard del supervisor.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SupervisorNuevoClienteRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/supervisor')
  }, [router])

  return null
}
