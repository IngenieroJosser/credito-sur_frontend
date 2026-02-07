'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import VistaCoordinador from '@/components/dashboards/VistaCoordinador';
import NotFoundPage from '../not-found'

export default function CoordinadorPage() {
  const router = useRouter()
  // Controlamos si la persona tiene permiso para estar aquí
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  // Verificamos permisos apenas carga la página
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      
      // Si no hay datos de usuario, lo mandamos a loguearse
      if (!userStr) {
        router.replace('/login')
        return
      }
      
      const user = JSON.parse(userStr) as { rol?: string }
      
      // Solo el COORDINADOR puede ver esta vista
      if (user.rol === 'COORDINADOR') {
        setAuthorized(true)
      } else {
        // Redirigir a su dashboard correspondiente según su rol
        const ROLE_REDIRECT_MAP: Record<string, string> = {
          'SUPER_ADMINISTRADOR': '/admin',
          'ADMIN': '/admin',
          'COORDINADOR': '/coordinador',
          'SUPERVISOR': '/supervisor',
          'COBRADOR': '/cobranzas',
          'CONTADOR': '/contador/contable',
        };
        
        // Lo mandamos a su casa
        const redirectPath = (user.rol && ROLE_REDIRECT_MAP[user.rol]) || '/login';
        router.replace(redirectPath);
      }
    } catch {
      // Si algo falla al leer los datos, por seguridad cerramos sesión visualmente
      router.replace('/login')
    }
  }, [router])

  // Spinner invisible mientras carga
  if (authorized === null) return null
  
  // Si no está autorizado, mostramos error 404
  if (!authorized) return <NotFoundPage />
  
  return <VistaCoordinador />;
}
