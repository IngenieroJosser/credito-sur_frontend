'use client';

import { useEffect, useState } from 'react'
import VistaCoordinador from '@/components/dashboards/VistaCoordinador';
import NotFoundPage from '../not-found'

export default function CoordinadorPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        setAuthorized(false)
        return
      }
      const user = JSON.parse(userStr) as { rol?: string }
      setAuthorized(user.rol === 'COORDINADOR')
    } catch {
      setAuthorized(false)
    }
  }, [])

  if (authorized === null) return null
  if (!authorized) return <NotFoundPage />
  return <VistaCoordinador />;
}
