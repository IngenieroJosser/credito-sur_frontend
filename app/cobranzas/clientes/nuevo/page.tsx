'use client'

/**
 * @deprecated Ruta legacy. La creación de clientes se maneja via NuevoClienteModal.
 * Redirige al dashboard de cobranzas.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CobranzasNuevoClienteRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/cobranzas')
  }, [router])

  return null
}
