'use client'

/**
 * @deprecated Ruta legacy. Los movimientos contables se registran con el modal
 * de `/contable`, no en una pantalla aparte. Redirige alli.
 *
 * Devolvia un `<div className="min-h-screen bg-slate-50" />` mientras
 * redirigia, y por eso no contaba como pagina retirada en
 * `__tests__/redirecciones-que-llegan.test.ts` —que busca `return null`— ni
 * como pantalla con titulo. Las otras 37 redirecciones del sistema devuelven
 * `null`; esta hace lo mismo ahora.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NuevoMovimientoRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/contable')
  }, [router])

  return null
}
