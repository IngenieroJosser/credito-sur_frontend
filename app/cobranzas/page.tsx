'use client'

import { AuthGuard } from '@/components/AuthGuard'
import VistaCobrador from '@/components/cobranzas/VistaCobrador'

export default function CobranzasPage() {
  return (
    <AuthGuard allowedRoles={['COBRADOR']}>
      <VistaCobrador />
    </AuthGuard>
  )
}