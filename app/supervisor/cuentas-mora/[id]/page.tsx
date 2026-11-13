'use client'

/**
 * @deprecated El supervisor NO tiene pantalla de detalle de una cuenta en
 * mora; esa la tienen el admin y el coordinador. Lo que tiene es su listado de
 * clientes filtrado por estado, que es desde donde trabaja.
 *
 * Asi que esta redireccion PIERDE el id a proposito: manda al listado
 * filtrado, no al detalle de esa cuenta, porque ese detalle no existe para
 * este rol. Si algun dia se le hace uno, este archivo se borra.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DetalleCuentaMoraSupervisorPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/supervisor/clientes?estado=MORA')
  }, [router])

  return null
}
