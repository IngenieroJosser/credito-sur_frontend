'use client'

/**
 * @deprecated Ruta legacy. La creación de créditos se maneja via CrearCreditoModal.
 * Redirige al dashboard de cobranzas.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CobranzasNuevoPrestamoRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/cobranzas')
  }, [router])

  return null
}
