'use client'

/**
 * @description Ruta unificada para notificaciones.
 * @migration Permission-Based Routing
 * @roles SUPER_ADMINISTRADOR, ADMIN, COORDINADOR, CONTADOR
 * @note SUPERVISOR y COBRADOR tienen sus propias implementaciones en sus rutas respectivas.
 */
import AdminNotificacionesPage from '@/app/admin/notificaciones/page'

export default function NotificacionesPage() {
  return <AdminNotificacionesPage />
}
