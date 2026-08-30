/**
 * ============================================================================
 * ROOT PATH REDIRECT
 * ============================================================================
 * Redirige el tráfico de raíz ('/') al Login.
 *
 * Es un redirect de CLIENTE (no `redirect()` de servidor) a proposito: la app
 * es offline-first y sin conexion no hay servidor que ejecute un redirect de
 * servidor — la raiz quedaba en blanco. Asi, el JS cacheado hace la
 * redireccion tambien sin conexion.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
