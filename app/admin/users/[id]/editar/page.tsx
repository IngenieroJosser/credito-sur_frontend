'use client'

/**
 * @deprecated Pantalla legacy. La edición de usuarios se hace desde el modal de
 * la lista de usuarios, que sí llama al backend. Esta página solo simulaba el
 * guardado (setTimeout + "actualizado"), sin persistir nada: daba un falso
 * éxito. Se redirige a la lista para no engañar.
 */
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EditarUsuarioRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  // Se consume params para respetar el contrato de la ruta dinámica.
  use(params)

  useEffect(() => {
    router.replace('/users')
  }, [router])

  return null
}
