'use client'

/**
 * @deprecated Pantalla legacy huérfana. Sus botones "Registrar Provisión" y
 * "Ejecutar Castigo de Cartera" no tenían acción (parecían funcionales pero no
 * hacían nada). El castigo de cartera real se hace desde el listado de cuentas
 * vencidas con ProcesarCastigoModal, que sí llama al backend. Se redirige allí.
 */
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContadorCuentaVencidaRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  use(params)

  useEffect(() => {
    router.replace('/cuentas-vencidas')
  }, [router])

  return null
}
