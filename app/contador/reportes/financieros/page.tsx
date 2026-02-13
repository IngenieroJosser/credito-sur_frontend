'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /reportes/financieros
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContadorReportesFinancierosRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/reportes/financieros')
  }, [router])

  return null
}
