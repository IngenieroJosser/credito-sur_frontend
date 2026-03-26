'use client'

import { useEffect } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { useRouter } from 'next/navigation'

export default function SupervisorCuentasMoraPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/supervisor/clientes')
  }, [router])

  return null
}
