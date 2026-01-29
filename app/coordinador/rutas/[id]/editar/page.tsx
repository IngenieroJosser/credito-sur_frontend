'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function CoordinadorEditarRutaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  
  useEffect(() => {
    // Redirigir a la ruta de admin con el mismo ID
    if (id) {
      router.replace(`/admin/rutas/${id}/editar`);
    } else {
      router.replace('/coordinador/rutas');
    }
  }, [router, id]);
  
  return null;
}