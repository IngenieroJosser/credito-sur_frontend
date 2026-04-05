'use client'

/**
 * Página de Cuentas en Mora para el Supervisor.
 * Utiliza el mismo componente compartido que Admin/SuperAdmin — vista 100% idéntica.
 * La prop `roles` en ProtectedPage garantiza acceso sin depender de permisos granulares del backend.
 */

import CuentasMoraFeature from '@/components/cuentas/CuentasMoraFeature'
import ProtectedPage from '@/components/auth/ProtectedPage'

export default function SupervisorCuentasMoraPage() {
  return (
    <ProtectedPage
      permiso="CUENTAS_MORA_VIEW"
      roles={['SUPERVISOR', 'ADMIN', 'SUPER_ADMINISTRADOR', 'COORDINADOR', 'CONTADOR']}
    >
      <CuentasMoraFeature />
    </ProtectedPage>
  )
}
