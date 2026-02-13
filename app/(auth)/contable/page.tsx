'use client'

/**
 * ============================================================================
 * MÓDULO CONTABLE - PÁGINA UNIFICADA (PERMISSION-BASED)
 * ============================================================================
 * 
 * @description
 * Ruta unificada para el módulo contable. Importa directamente la implementación
 * completa de admin/contable que ya maneja roles internamente via localStorage.
 * 
 * @permissions
 * - CONTABLE_VIEW: Acceso al módulo contable
 * 
 * @roles
 * - ADMIN/SUPER_ADMIN: CRUD completo, crear caja principal
 * - CONTADOR: CRUD limitado (sin crear caja principal)
 */

import ProtectedPage from '@/components/auth/ProtectedPage'
import AdminContablePage from '@/app/admin/contable/page'

export default function ContablePage() {
  return (
    <ProtectedPage permiso="CONTABLE_VIEW">
      <AdminContablePage />
    </ProtectedPage>
  )
}
