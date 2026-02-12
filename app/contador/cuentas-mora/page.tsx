'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /cuentas-mora
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContadorCuentasMoraRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/cuentas-mora')
  }, [router])

  return null
}
