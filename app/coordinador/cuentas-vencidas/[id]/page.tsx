'use client'

import { use } from 'react'
import DetalleCuentaVencida from '@/components/cuentas/DetalleCuentaVencida'

/**
 * El expediente de una cuenta vencida, para el COORDINADOR.
 *
 * La misma pantalla que la del admin —estaba copiada, con un 82,3 % identico—
 * sin el boton de archivar: el coordinador mira el expediente y la decision
 * formal la cierra el admin.
 */
export default function DetalleCuentaVencidaCoordinadorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <DetalleCuentaVencida id={id} prefijo="/coordinador" />
}
