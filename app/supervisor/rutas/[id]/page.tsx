'use client'

import React, { use } from 'react'
import SupervisorCobroView from '@/components/dashboards/SupervisorCobroView'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function SupervisorRutaDetallePage({ params }: PageProps) {
  // Desempaquetar los params usando use() de React
  const { id } = use(params)

  return (
    <SupervisorCobroView rutaId={id} />
  )
}
