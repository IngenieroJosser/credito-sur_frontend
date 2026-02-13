'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /contable
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContadorContableRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/contable')
  }, [router])

  return null
}
