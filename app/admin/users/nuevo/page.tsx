'use client'

/**
 * @deprecated Pantalla legacy. La creación de usuarios se hace desde el modal
 * de la lista de usuarios (usuariosService.crear), que sí llama al backend.
 * Esta página solo simulaba el guardado (setTimeout + "creado"), sin crear nada:
 * daba un falso éxito. Se redirige a la lista para no engañar.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NuevoUsuarioRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/users')
  }, [router])

  return null
}
