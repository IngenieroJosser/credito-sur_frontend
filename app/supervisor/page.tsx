'use client';

import { useEffect, useState } from 'react'
import VistaSupervisor from '@/components/dashboards/VistaSupervisor';
import NotFoundPage from '../not-found'

export default function SupervisorPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        setAuthorized(false)
        return
      }
      const user = JSON.parse(userStr) as { rol?: string }
      setAuthorized(user.rol === 'SUPERVISOR')
    } catch {
      setAuthorized(false)
    }
  }, [])

  if (authorized === null) return null
  if (!authorized) return <NotFoundPage />
  return <VistaSupervisor />;
}
