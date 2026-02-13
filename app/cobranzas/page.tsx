'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import VistaCobrador from '@/components/dashboards/VistaCobrador';
import NotFoundPage from '../not-found'

export default function CobranzasPage() {
  const router = useRouter()
  // Estado para saber si permitimos o no ver el contenido
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  // Efecto de guardia: verifica si eres Cobrador antes de mostrar nada
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      
      // Si no hay sesión, directo al login
      if (!userStr) {
        router.replace('/login')
        return
      }
      
      const user = JSON.parse(userStr) as { rol?: string }
      
      // Si eres COBRADOR, ¡adelante!
      if (user.rol === 'COBRADOR') {
        setAuthorized(true)
      } else {
        // Si tienes otro rol, te enviamos a tu sitio correcto
        const ROLE_REDIRECT_MAP: Record<string, string> = {
          'SUPER_ADMINISTRADOR': '/admin',
          'ADMIN': '/admin',
          'COORDINADOR': '/coordinador',
          'SUPERVISOR': '/supervisor',
          'COBRADOR': '/cobranzas',
          'CONTADOR': '/contador/contable',
          'PUNTO_DE_VENTA': '/punto-de-venta',
        };
        
        // Buscamos tu ruta o te mandamos al login si algo raro pasa
        const redirectPath = (user.rol && ROLE_REDIRECT_MAP[user.rol]) || '/login';
        router.replace(redirectPath);
      }
    } catch {
      // Cualquier error de parseo nos devuelve al login por seguridad
      router.replace('/login')
    }
  }, [router])

  // Mientras verificamos, no renderizamos nada
  if (authorized === null) return null
  
  // Si falló la autorización (aunque el redirect debería manejarlo), mostramos 404
  if (!authorized) return <NotFoundPage />
  
  return <VistaCobrador />;
}
