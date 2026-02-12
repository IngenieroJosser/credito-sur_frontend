'use client'

import AdminLayout from '../admin/layout'

/**
 * ============================================================================
 * LAYOUT UNIFICADO PARA RUTAS PROTEGIDAS (PERMISSION-BASED ROUTING)
 * ============================================================================
 * 
 * @description
 * Layout compartido para todas las rutas del grupo (auth).
 * Reutiliza el AdminLayout existente que ya maneja:
 * - Sidebar dinámico basado en rol/permisos
 * - Header con notificaciones y perfil
 * - Variante sin sidebar para cobrador (hideSidebar)
 * - Validación de sesión
 * 
 * @architecture
 * Este grupo de rutas reemplaza gradualmente las carpetas por rol
 * (/admin/*, /coordinador/*, /supervisor/*, etc.) con rutas únicas
 * protegidas por permisos granulares.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
