'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CoordinadorPerfilPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/perfil');
  }, [router]);
  
  return null;
}
