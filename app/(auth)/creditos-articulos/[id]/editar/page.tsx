'use client'

/**
 * @deprecated Ruta legacy. La edición se hace desde el detalle (modal). Antes
 * envolvía una página que SIMULABA el guardado sin persistir. Redirige al
 * detalle del crédito de artículo.
 */
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EditarCreditoArticuloRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { id } = use(params)

  useEffect(() => {
    router.replace(`/creditos-articulos/${id}`)
  }, [router, id])

  return null
}
