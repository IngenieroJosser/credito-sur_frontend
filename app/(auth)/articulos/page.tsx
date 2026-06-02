'use client'

import ProtectedPage from '@/components/auth/ProtectedPage'
import ArticulosContent from '@/components/articulos/ArticulosContent'

export default function ArticulosPage() {
  return (
    <ProtectedPage permiso="ARTICULOS_VIEW" roles={['PUNTO_DE_VENTA', 'CONTADOR', 'COORDINADOR', 'ADMIN', 'SUPER_ADMINISTRADOR']}>
      <ArticulosContent />
    </ProtectedPage>
  )
}
