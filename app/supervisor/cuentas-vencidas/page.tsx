'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SupervisorCuentasVencidasPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/supervisor/clientes?estado=VENCIDAS')
  }, [router])

  return null
}
