'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Página "Raíz" para Contadores
// Simplemente funciona como un portero que redirige al dashboard real
export default function ContadorRootPage() {
  const router = useRouter()
  // Un flag simple para saber si estamos procesando la entrada
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      
      // Si no hay sesión, no hay fiesta
      if (!userStr) {
        router.replace('/login')
        return
      }
      
      const user = JSON.parse(userStr) as { rol?: string }
      
      // Si eres CONTADOR, te enviamos a tu panel contable principal
      if (user.rol === 'CONTADOR') {
        router.replace('/contador/contable')
      } else {
        // Si te perdiste y tienes otro rol, te devolvemos a tu sitio
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
      // En caso de emergencia (error), volver al inicio
      router.replace('/login')
    } finally {
      setIsChecking(false)
    }
  }, [router])

  // Esta página nunca muestra nada visualmente, solo redirige en silencio
  return null
}
