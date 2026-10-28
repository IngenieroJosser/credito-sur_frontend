/**
 * ============================================================================
 * ROOT PATH REDIRECT
 * ============================================================================
 * Redirige el tráfico de raíz ('/') a donde corresponda.
 *
 * Es un redirect de CLIENTE (no `redirect()` de servidor) a proposito: la app
 * es offline-first y sin conexion no hay servidor que ejecute un redirect de
 * servidor — la raiz quedaba en blanco. Asi, el JS cacheado hace la
 * redireccion tambien sin conexion.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { rutaDeEntrada } from '@/lib/auth/rutaPorRol';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Con sesion abierta se entra directo a la pantalla del rol. Antes se
    // mandaba siempre al login y, como '/' es el start_url de la PWA, al abrir
    // la app se veia el login un instante antes de rebotar.
    router.replace(rutaDeEntrada());
  }, [router]);

  return null;
}
