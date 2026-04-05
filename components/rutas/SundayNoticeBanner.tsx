'use client'

import { useMemo } from 'react'

type Props = {
  enabled?: boolean
}

export default function SundayNoticeBanner({ enabled = true }: Props) {
  const esDomingoBogota = useMemo(() => {
    if (!enabled) return false
    try {
      const label = new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        weekday: 'long',
      }).format(new Date())
      return String(label).toLowerCase().includes('domingo')
    } catch {
      return false
    }
  }, [enabled])

  if (!enabled || !esDomingoBogota) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
      <div className="text-sm font-bold">Hoy es domingo</div>
      <div className="text-xs font-medium text-amber-800">
        Los domingos no se trabaja ni se cobra. Si necesitas registrar algo, hazlo el lunes.
      </div>
    </div>
  )
}
