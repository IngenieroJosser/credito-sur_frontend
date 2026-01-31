'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DetalleCuentaVencidaSupervisorPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/supervisor/clientes?estado=VENCIDAS')
  }, [router])

  return null
}
