'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ContadorRootPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.replace('/login')
        return
      }
      const user = JSON.parse(userStr) as { rol?: string }
      
      if (user.rol === 'CONTADOR') {
        router.replace('/contador/contable')
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
    } finally {
      setIsChecking(false)
    }
  }, [router])

  return null
}
