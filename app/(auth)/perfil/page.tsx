'use client'

/**
 * @description Ruta unificada para perfil de usuario.
 * @migration Permission-Based Routing
 * @roles SUPER_ADMINISTRADOR, ADMIN, COORDINADOR, COBRADOR
 * @note SUPERVISOR tiene su propia implementación en /supervisor/perfil
 */
import AdminPerfilPage from '@/app/admin/perfil/page'

export default function PerfilPage() {
  return <AdminPerfilPage />
}
