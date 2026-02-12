'use client'

/**
 * @description Ruta unificada para créditos de artículos. Importa la implementación de admin.
 * @migration Permission-Based Routing
 * @roles SUPER_ADMINISTRADOR, ADMIN, SUPERVISOR
 */
import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminCreditosArticulosPage from '@/app/admin/creditos-articulos/page'

export default function CreditosArticulosPage() {
  return (
    <ProtectedPage permiso="CREDITOS_ARTICULOS_VIEW">
      <AdminCreditosArticulosPage />
    </ProtectedPage>
  )
}
