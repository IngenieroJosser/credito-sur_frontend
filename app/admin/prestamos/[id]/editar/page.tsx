'use client'

/**
 * @deprecated Pantalla legacy. La edición se hace desde el detalle del registro
 * (modal), que sí llama al backend. Esta página SIMULABA el guardado
 * ("Préstamo actualizado (Simulado)") sin persistir nada: un falso éxito. Se
 * redirige al detalle para no engañar.
 */
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EditarRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { id } = use(params)

  useEffect(() => {
    router.replace(`/prestamos/${id}`)
  }, [router, id])

  return null
}
