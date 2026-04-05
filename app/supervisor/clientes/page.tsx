'use client'

import ClientesFeature from '@/components/clientes/ClientesFeature'
import ProtectedPage from '@/components/auth/ProtectedPage'

export default function SupervisorClientesPage() {
  return (
    <ProtectedPage
      permiso="CLIENTES_VIEW"
      roles={['SUPERVISOR', 'ADMIN', 'SUPER_ADMINISTRADOR', 'COORDINADOR']}
    >
      <ClientesFeature basePath="/supervisor/clientes" initialClientes={[]} />
    </ProtectedPage>
  )
}
