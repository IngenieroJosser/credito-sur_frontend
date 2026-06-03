'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ClipboardList, CreditCard, UserPlus } from 'lucide-react'
import FloatingActionMenu, { FabAction } from '@/components/dashboards/shared/FloatingActionMenu'

type FloatingRole = 'COBRADOR' | 'SUPERVISOR'

const exactDashboardPath: Record<FloatingRole, string> = {
  COBRADOR: '/cobranzas',
  SUPERVISOR: '/supervisor',
}

export default function RoleFloatingActions({ role }: { role: FloatingRole }) {
  const pathname = usePathname()
  const router = useRouter()

  if (!pathname || pathname === exactDashboardPath[role]) return null

  const actionsByRole: Record<FloatingRole, FabAction[]> = {
    COBRADOR: [
      { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => router.push('/cobranzas/prestamos/nuevo') },
      { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, color: 'blue', onClick: () => router.push('/cobranzas/clientes/nuevo') },
      { label: 'Solicitudes', icon: <ClipboardList className="h-5 w-5" />, color: 'orange', onClick: () => router.push('/cobranzas/solicitudes') },
    ],
    SUPERVISOR: [
      { label: 'Crear Crédito', icon: <CreditCard className="h-5 w-5" />, onClick: () => router.push('/supervisor/prestamos/nuevo') },
      { label: 'Nuevo Cliente', icon: <UserPlus className="h-5 w-5" />, color: 'blue', onClick: () => router.push('/supervisor/clientes/nuevo') },
      { label: 'Revisiones', icon: <ClipboardList className="h-5 w-5" />, color: 'orange', onClick: () => router.push('/supervisor/revisiones') },
    ],
  }

  return <FloatingActionMenu actions={actionsByRole[role]} />
}
