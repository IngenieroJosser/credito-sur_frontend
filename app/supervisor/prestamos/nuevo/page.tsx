'use client'

/**
 * @deprecated Ruta legacy. La creación de créditos se maneja via CrearCreditoModal.
 * Redirige al dashboard del supervisor.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SupervisorNuevoPrestamoRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/supervisor')
  }, [router])

  return null
}
