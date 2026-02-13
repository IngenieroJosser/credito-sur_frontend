'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import VistaPuntoDeVenta from '@/components/dashboards/VistaPuntoDeVenta';
import NotFoundPage from '../not-found'

export default function PuntoDeVentaPage() {
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
      
      if (user.rol === 'PUNTO_DE_VENTA') {
        setAuthorized(true)
      } else {
        const ROLE_REDIRECT_MAP: Record<string, string> = {
          'SUPER_ADMINISTRADOR': '/admin',
          'ADMIN': '/admin',
          'COORDINADOR': '/coordinador',
          'SUPERVISOR': '/supervisor',
          'COBRADOR': '/cobranzas',
          'CONTADOR': '/contable',
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
  
  return <VistaPuntoDeVenta />;
}
