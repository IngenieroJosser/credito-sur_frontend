'use client'

import type { ReactNode } from 'react'
import AvisoActualizando from '@/components/ui/AvisoActualizando'
import type { TimeFilterPeriod } from '@/components/ui/TimeFilter'

export default function ContenidoPorPeriodo({ periodo, periodoMostrado, cargando, error, recargar, children }: {
  periodo: TimeFilterPeriod
  periodoMostrado: TimeFilterPeriod | undefined
  cargando: boolean
  error: string | null
  recargar: () => void
  children: ReactNode
}) {
  return (
    <>
      {(cargando || error) && <AvisoActualizando periodo={periodo} mismoPeriodo={periodo === periodoMostrado}
        fallo={error} onReintentar={recargar} />}
      <div aria-busy={cargando} inert={cargando || !!error} className={cargando || error ? 'space-y-6 opacity-60' : 'space-y-6'}>
        {children}
      </div>
    </>
  )
}
