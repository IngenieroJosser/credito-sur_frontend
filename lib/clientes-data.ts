import { logger } from '@/lib/logger'
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

    // Si no hay token en SSR, retornar vacío (el cliente cargará con el hook)
    if (!token) {
      logger.log('[SSR] No token found in cookies, returning empty array');
      return [];
    }

    const apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    
    logger.log(`[SSR] Fetching clients from: ${apiUrl}/api-credisur/clients`);
    
    // Server-side fetch needs absolute URL with the API prefix
    const res = await fetch(`${apiUrl}/api-credisur/clients`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Always fetch fresh data for admin panel
    });

    logger.log(`[SSR] Response status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      if (res.status === 401) {
        console.error('[SSR] Unauthorized - token may be invalid');
        return [];
      }
      const errorText = await res.text();
      console.error(`[SSR] API Error: ${res.status} ${res.statusText}`, errorText);
      return [];
    }

    const data = await res.json();
    const clientes = Array.isArray(data) ? data : (data.clientes || []);
    logger.log(`[SSR] Successfully fetched ${clientes.length} clients`);
    return clientes;
    
  } catch (error) {
    console.error('[SSR] Error fetching clients:', error);
    console.error('[SSR] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // En caso de error, retornamos array vacío para no romper la UI
    return [];
  }
}

