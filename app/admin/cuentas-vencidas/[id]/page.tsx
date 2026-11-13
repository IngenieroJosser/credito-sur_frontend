'use client'

import { use } from 'react'
import DetalleCuentaVencida from '@/components/cuentas/DetalleCuentaVencida'

/**
 * El expediente de una cuenta vencida, para el ADMIN.
 *
 * La pantalla estaba escrita dos veces —aqui y en el arbol del coordinador—,
 * 205 y 157 lineas con un 82,3 % identico. Ahora las dos montan
 * `DetalleCuentaVencida` y lo unico que cambia son sus dos props: el admin
 * puede archivar la cuenta y el coordinador solo la mira.
 *
 * `prefijo` vacio porque el admin usa las URL limpias que sirve el `rewrites`
 * de `next.config.ts`: `/cuentas-vencidas`, no `/admin/cuentas-vencidas`.
 */
export default function DetalleCuentaVencidaAdminPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <DetalleCuentaVencida id={id} puedeArchivar />
}
