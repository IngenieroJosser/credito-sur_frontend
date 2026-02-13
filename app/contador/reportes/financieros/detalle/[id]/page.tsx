'use client'

/**
 * @deprecated Ruta legacy. Redirige a la ruta unificada /reportes/financieros/detalle/[id]
 * @migration Permission-Based Routing
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

export default function ContadorDetalleReporteRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/reportes/financieros/detalle/${id}`)
  }, [router, id])

  return null
}
