'use client'

/**
 * MÓDULO DE RUTAS (ADMIN)
 * 
 * @description
 * Vista principal para la gestión de rutas desde el perfil de Administrador.
 * Reutiliza el componente `RutasPageView` que comparte lógica con el Coordinador.
 * 
 * @configuration
 * Se pasa `rutasBasePath="/admin/rutas"` para que toda la navegación interna
 * del componente apunte a las URLs de admin.
 */
import { RutasPageView } from '@/components/rutas/RutasPageView'

export default function Page() {
  return <RutasPageView rutasBasePath="/admin/rutas" />
}
