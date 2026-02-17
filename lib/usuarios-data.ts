import { cookies } from 'next/headers';
import { Usuario, RolUsuario } from '@/services/usuarios-service';

export async function getUsuariosByRol(rol: RolUsuario): Promise<Usuario[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      console.log('[SSR usuarios-data] No token found, returning empty array');
      return [];
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

    const res = await fetch(`${apiUrl}/api-credisur/usuarios`, {
       headers: { 
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}` 
       },
       cache: 'no-store'
    });
    
    if (!res.ok) {
      console.warn(`[SSR usuarios-data] Error fetching users: ${res.status} ${res.statusText}`);
      return [];
    }
    
    const usuarios: Usuario[] = await res.json();
    // Filter on client side (server component) since fetch brings all users
    return usuarios.filter(u => u.rol === rol && u.estado === 'ACTIVO');
  } catch (err) {
    console.error('[SSR usuarios-data] Error in getUsuariosByRol:', err);
    return [];
  }
}
