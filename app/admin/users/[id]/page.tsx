'use client'

/**
 * @deprecated Pantalla legacy huérfana (nadie la enlaza). Su botón "Desactivar"
 * no tenía acción y su "Editar" apuntaba a una página que ya solo redirige. La
 * gestión de usuarios (ver, editar, activar/desactivar) se hace desde la lista
 * con su modal, que sí llama al backend. Se redirige a la lista.
 */
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UsuarioDetalleRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  use(params)

  useEffect(() => {
    router.replace('/users')
  }, [router])

  return null
}
