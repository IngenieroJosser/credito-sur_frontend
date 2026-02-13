'use client'

import { usePermission } from '@/hooks/usePermission'
import { usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'

/**
 * ============================================================================
 * COMPONENTE DE PROTECCIÓN POR PERMISOS (PERMISSION-BASED ACCESS)
 * ============================================================================
 * 
 * @description
 * Envuelve una página y verifica si el usuario tiene el permiso requerido.
 * Si no lo tiene, muestra un mensaje de acceso denegado.
 * 
 * Estrategia de acceso (en orden):
 * 1. Si can(permiso) → acceso por permiso granular del backend
 * 2. Si canForPath(pathname) → acceso por rol (fallback mientras se migra el backend)
 * 3. Si ninguno → acceso denegado
 * 
 * @usage
 * <ProtectedPage permiso="CUENTAS_VENCIDAS_VIEW">
 *   <MiContenido />
 * </ProtectedPage>
 * 
 * @param permiso - Código del permiso requerido (ej: 'CREDITOS_VIEW')
 * @param children - Contenido a renderizar si tiene acceso
 * @param fallback - Componente alternativo si no tiene acceso (opcional)
 */
interface ProtectedPageProps {
  permiso: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function ProtectedPage({ permiso, children, fallback }: ProtectedPageProps) {
  const { can, canForPath, rol } = usePermission()
  const pathname = usePathname()

  // Acceso: permiso granular del backend O acceso por rol en permissions.tsx
  const tieneAccesoPermiso = can(permiso)
  const tieneAccesoRuta = pathname ? canForPath(pathname) : false

  if (!tieneAccesoPermiso && !tieneAccesoRuta) {
    if (fallback) return <>{fallback}</>

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="inline-flex p-4 rounded-full bg-slate-100 mb-6">
            <Shield className="h-12 w-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso restringido</h2>
          <p className="text-slate-500 font-medium mb-4">
            No tienes permisos para acceder a este módulo. 
            Contacta a tu administrador si necesitas acceso.
          </p>
          <div className="text-xs text-slate-400 bg-slate-100 px-3 py-2 rounded-lg inline-block">
            Permiso requerido: <code className="font-mono">{permiso}</code>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
