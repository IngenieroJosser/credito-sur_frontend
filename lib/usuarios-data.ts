import { cookies } from 'next/headers';
import { Usuario, RolUsuario } from '@/services/usuarios-service';

export async function getUsuariosByRol(rol: RolUsuario): Promise<Usuario[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const res = await fetch(`${apiUrl}/usuarios`, {
       headers: { 
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token || ''}` 
       },
       cache: 'no-store'
    });
    
    if (!res.ok) {
      console.warn(`Error fetching users: ${res.status}`);
      return [];
    }
    
    const usuarios: Usuario[] = await res.json();
    // Filter on client side (server component) since fetch brings all users
    return usuarios.filter(u => u.rol === rol && u.estado === 'ACTIVO');
  } catch (err) {
    console.error('Error in getUsuariosByRol:', err);
    return [];
  }
}
