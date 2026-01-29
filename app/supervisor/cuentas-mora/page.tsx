'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SupervisorCuentasMoraPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/supervisor/clientes')
  }, [router])

  return null
}
