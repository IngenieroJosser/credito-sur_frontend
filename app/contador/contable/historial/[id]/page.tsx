'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /contable/historial/[id]
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

export default function ContadorDetalleCierreRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/contable/historial/${id}`)
  }, [router, id])

  return null
}
