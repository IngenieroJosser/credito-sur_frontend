'use client'

/**
 * @deprecated Igual que `cuentas-mora/[id]`: el supervisor no tiene pantalla
 * de detalle de una cuenta vencida, sino su listado de clientes filtrado por
 * estado.
 *
 * La redireccion PIERDE el id a proposito, por el mismo motivo: el detalle no
 * existe para este rol.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DetalleCuentaVencidaSupervisorPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/supervisor/clientes?estado=VENCIDAS')
  }, [router])

  return null
}
