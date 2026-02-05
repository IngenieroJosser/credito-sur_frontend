import { cookies } from 'next/headers';
import { Cliente } from '@/services/clientes-service';

export type ClienteAdmin = Cliente & {
  score?: number;
  tendencia?: string;
  ultimaVisita?: string;
};

export async function getClientesData(): Promise<ClienteAdmin[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Server-side fetch needs absolute URL
    const res = await fetch(`${apiUrl}/clients`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`,
      },
      cache: 'no-store', // Always fetch fresh data for admin panel
      // next: { tags: ['clientes'] } // Optional: for revalidation
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('No autorizado');
      }
      throw new Error(`Error al obtener clientes: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
    
  } catch (error) {
    console.error('Error fetching clients:', error);
    // En caso de error, retornamos array vacío para no romper la UI, 
    // pero el componente debería manejar el estado vacío.
    return [];
  }
}
