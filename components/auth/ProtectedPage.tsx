'use client'

import PantallaCarga from '@/components/ui/PantallaCarga'

import { usePermission } from '@/hooks/usePermission'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { nombreDePermiso } from '@/lib/nombre-de-permiso'
import { Shield } from 'lucide-react'

/**
 * ============================================================================
 * COMPONENTE DE PROTECCIÓN POR PERMISOS (PERMISSION-BASED ACCESS)
 * ============================================================================
 *
 * Estrategia de acceso (en orden de prioridad):
 * 1. Mientras carga auth → muestra spinner (evita falsos bloqueos)
 * 2. Si rol === SUPER_ADMINISTRADOR → siempre tiene acceso
 * 3. Si `roles` incluye el rol actual → tiene acceso por rol autorizado
 * 4. Si can(permiso) → tiene acceso por permiso granular del backend
 * 5. Si canForPath(pathname) → tiene acceso por ruta definida en permissions.tsx
 * 6. Si ninguno → bloqueo con mensaje de acceso restringido
 *
 * @param permiso   Código del permiso granular (ej: 'CUENTAS_MORA_VIEW')
 * @param roles     Lista de roles que tienen acceso directo sin permiso granular
 * @param children  Contenido a renderizar si tiene acceso
 * @param fallback  Componente alternativo si no tiene acceso (opcional)
 */
interface ProtectedPageProps {
  permiso: string
  roles?: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function ProtectedPage({ permiso, roles, children, fallback }: ProtectedPageProps) {
  const { loading } = useAuth()
  const { can, canForPath, rol } = usePermission()
  const pathname = usePathname()

  // CRÍTICO: Mientras auth carga, no bloquear. Evita el falso "Acceso restringido"
  // que ocurre porque rol === null hasta que localStorage se lee en el cliente.
  if (loading) {
    return (
      <PantallaCarga />
    )
  }

  const tienePorRolSuperAdmin = rol === 'SUPER_ADMINISTRADOR'
  const tienePorRolAutorizado = roles && rol ? roles.includes(rol) : false
  const tienePorPermisoGranular = can(permiso)
  const tienePorRuta = pathname ? canForPath(pathname) : false

  const tieneAcceso =
    tienePorRolSuperAdmin ||
    tienePorRolAutorizado ||
    tienePorPermisoGranular ||
    tienePorRuta

  if (!tieneAcceso) {
    if (fallback) return <>{fallback}</>

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="shrink-0 inline-flex p-4 rounded-full bg-slate-100 mb-6">
            <Shield className="h-12 w-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso restringido</h2>
          <p className="text-slate-500 font-medium mb-4">
            No tienes permisos para acceder a este módulo.
            Contacta a tu administrador si necesitas acceso.
          </p>
          {/*
            El permiso se nombra como lo nombra el sistema —«Ver Módulo
            Contable»— y no por su código. Antes decía «Permiso requerido:
            CONTABLE_VIEW», que no le dice a nadie qué módulo es ni qué pedir.
            El código se conserva debajo y en pequeño porque sí sirve para
            soporte: con él, quien administre encuentra el permiso exacto en la
            lista sin tener que adivinar a qué pantalla se refiere.
          */}
          <div className="text-sm text-slate-500 bg-slate-100 px-4 py-3 rounded-lg inline-block">
            <div>
              Necesitas el permiso{' '}
              <span className="font-semibold text-slate-700">
                «{nombreDePermiso(permiso)}»
              </span>
            </div>
            {permiso && (
              <div className="text-[11px] text-slate-400 mt-1">
                Para tu administrador: <code className="font-mono">{permiso}</code>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
