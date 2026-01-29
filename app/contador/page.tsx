'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContadorRootPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/contador/contable')
  }, [router])

  return null
}
