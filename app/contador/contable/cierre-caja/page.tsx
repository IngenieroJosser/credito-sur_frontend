'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /contable/cierre-caja
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContadorCierreCajaRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/contable/cierre-caja')
  }, [router])

  return null
}
