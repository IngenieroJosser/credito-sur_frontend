'use client'

import { usePathname, useRouter } from 'next/navigation'
import { CreditCard, UserPlus } from 'lucide-react'
import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'

type FloatingRole = 'COBRADOR' | 'SUPERVISOR'

export default function RoleFloatingActions({ role }: { role: FloatingRole }) {
  const pathname = usePathname()
  const router = useRouter()

  if (!pathname) return null

  const actionsByRole: Record<FloatingRole, FabAction[]> = {
    COBRADOR: [
      { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => router.push('/cobranzas/prestamos/nuevo') },
      { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, color: 'blue', onClick: () => router.push('/cobranzas/clientes/nuevo') },
    ],
    SUPERVISOR: [
      { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => router.push('/supervisor/creditos/nuevo') },
      { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, color: 'blue', onClick: () => router.push('/supervisor/clientes/nuevo') },
    ],
  }

  return <FloatingActionMenu actions={actionsByRole[role]} />
}
