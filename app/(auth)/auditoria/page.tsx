'use client'

/**
 * @description Ruta unificada para auditoría del sistema.
 * @migration Permission-Based Routing
 * @roles SUPER_ADMINISTRADOR, SUPERVISOR
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminAuditoriaPage from '@/app/admin/auditoria/page'

export default function AuditoriaPage() {
  return (
    <ProtectedPage permiso="AUDIT_VIEW">
      <AdminAuditoriaPage />
    </ProtectedPage>
  )
}
