'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RolUsuario } from '@/lib/types/autenticacion-type'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: RolUsuario[]
  redirectTo?: string
}

interface UsuarioAuth {
  rol: RolUsuario
  nombres: string
  apellidos: string
}

const ROLE_REDIRECT_MAP: Record<RolUsuario, string> = {
  SUPER_ADMINISTRADOR: '/admin',
  COORDINADOR: '/coordinador',
  SUPERVISOR: '/supervision',
  COBRADOR: '/cobranzas',
  CONTADOR: '/contabilidad',
}

export function AuthGuard({ 
  children, 
  allowedRoles,
  redirectTo = '/login' 
}: AuthGuardProps) {
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
    
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
          router.replace(redirectTo)
          return
        }

        const user: UsuarioAuth = JSON.parse(userData)

        if (allowedRoles && allowedRoles.length > 0) {
          if (!allowedRoles.includes(user.rol)) {
            const rolePath = ROLE_REDIRECT_MAP[user.rol] || '/'
            router.replace(rolePath)
            return
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.replace(redirectTo)
      }
    }

    checkAuth()
  }, [router, allowedRoles, redirectTo])

  // Durante la hidratación, renderiza un placeholder vacío
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-50">
        {/* Placeholder invisible para mantener la estructura */}
        <div className="invisible">
          <div className="mx-auto flex w-full max-w-md flex-col gap-4">
            {/* Contenido placeholder */}
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}