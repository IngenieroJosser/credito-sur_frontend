'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import VistaSupervisor from '@/components/dashboards/VistaSupervisor';
import NotFoundPage from '../not-found'

export default function SupervisorPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.replace('/login')
        return
      }
      const user = JSON.parse(userStr) as { rol?: string }
      
      if (user.rol === 'SUPERVISOR') {
        setAuthorized(true)
      } else {
        // Redirigir a su dashboard correspondiente
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
      router.replace('/login')
    }
  }, [router])

  if (authorized === null) return null
  if (!authorized) return <NotFoundPage />
  return <VistaSupervisor />;
}
