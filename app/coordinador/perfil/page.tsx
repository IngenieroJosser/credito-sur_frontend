'use client';

/**
 * El perfil es uno y el mismo para todos los roles: `app/(auth)/perfil`.
 *
 * Esta ruta existe porque el menu del coordinador apuntaba aqui antes de que
 * las pantallas compartidas se movieran a `(auth)`, y puede estar guardada en
 * el navegador de alguien. Redirige en vez de dar un 404.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CoordinadorPerfilPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/perfil');
  }, [router]);
  
  return null;
}
