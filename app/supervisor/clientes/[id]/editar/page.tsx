'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function EditarClienteSupervisorPage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params?.id
  const id = Array.isArray(rawId) ? rawId[0] : (rawId as string)

  useEffect(() => {
    if (!id) {
      router.replace('/supervisor/clientes')
      return
    }
    router.replace(`/supervisor/clientes/${id}`)
  }, [id, router])

  return null
}
