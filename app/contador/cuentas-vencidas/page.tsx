'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /cuentas-vencidas
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContadorCuentasVencidasRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/cuentas-vencidas')
  }, [router])

  return null
}
