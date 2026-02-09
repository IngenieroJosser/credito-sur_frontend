'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import VistaSupervisor from '@/components/dashboards/VistaSupervisor';
import NotFoundPage from '../not-found'

export default function SupervisorPage() {
  const router = useRouter()
  // Estado local para manejar si el supervisor ya fue validado
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  // Chequeo de seguridad al montar el componente
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      
      // Si no hay rastro del usuario, chao al login
      if (!userStr) {
        router.replace('/login')
        return
      }
      
      const user = JSON.parse(userStr) as { rol?: string }
      
      // Solo el SUPERVISOR tiene permiso para ver este dashboard
      if (user.rol === 'SUPERVISOR') {
        setAuthorized(true)
      } else {
        // Redirigir a los demás roles a su propio espacio
        const ROLE_REDIRECT_MAP: Record<string, string> = {
          'SUPER_ADMINISTRADOR': '/admin',
          'ADMIN': '/admin',
          'COORDINADOR': '/coordinador',
          'SUPERVISOR': '/supervisor',
          'COBRADOR': '/cobranzas',
          'CONTADOR': '/contador/contable',
        };
        
        const redirectPath = (user.rol && ROLE_REDIRECT_MAP[user.rol]) || '/login';
        router.replace(redirectPath);
      }
    } catch {
      // Si el localStorage fue manipulado o está corrupto
      router.replace('/login')
    }
  }, [router])

  // Evitamos parpadeos mientras verificamos
  if (authorized === null) return null
  
  // Si no pasó la prueba, mostramos una página estándar de no encontrado para no dar pistas
  if (!authorized) return <NotFoundPage />
  
  return <VistaSupervisor />;
}
