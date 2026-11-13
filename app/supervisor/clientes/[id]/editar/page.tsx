'use client'

/**
 * @deprecated El supervisor no edita clientes en una pantalla aparte: lo hace
 * en el modal de la ficha del cliente. Redirige a la ficha, con el mismo id,
 * que es donde esta ese modal.
 *
 * Si el id no llega —la URL escrita a medias—, va al listado: es mejor que
 * una ficha en blanco.
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function EditarClienteSupervisorPage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params?.id
  const id = Array.isArray(rawId) ? rawId[0] : (rawId as string)

  useEffect(() => {
    if (!id) {
      router.replace('/supervisor/clientes')
      return
    }
    router.replace(`/supervisor/clientes/${id}`)
  }, [id, router])

  return null
}
