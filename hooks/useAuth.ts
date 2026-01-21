'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RolUsuario } from '@/lib/types/autenticacion-type'

export const useAuth = () => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      try {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token')
          const userData = localStorage.getItem('user')
          
          if (!token || !userData) {
            router.replace('/login')
            return
          }
          
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  return { user, loading, logout }
}