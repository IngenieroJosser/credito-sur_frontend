'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NuevoMovimientoPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/contable')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50" />
  )
}
