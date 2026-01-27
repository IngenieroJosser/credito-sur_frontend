'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DetalleCuentaMoraSupervisorPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/supervisor/clientes?estado=MORA')
  }, [router])

  return null
}
