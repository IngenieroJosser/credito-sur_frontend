'use client'
import { logger } from '@/lib/logger'

/**
 * Página de Cuentas en Mora para Admin/SuperAdmin/Coordinador/Contador.
 * Utiliza el componente compartido CuentasMoraFeature — misma vista para todos los roles.
 */

import CuentasMoraFeature from '@/components/cuentas/CuentasMoraFeature'
import ProtectedPage from '@/components/auth/ProtectedPage'

export default function CuentasMoraPage() {
  return (
    <ProtectedPage
      permiso="CUENTAS_MORA_VIEW"
      roles={['SUPER_ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'CONTADOR', 'SUPERVISOR']}
    >
      <CuentasMoraFeature />
    </ProtectedPage>
  )
}
