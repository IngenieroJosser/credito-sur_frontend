import { cookies } from 'next/headers';

export interface RutaEstadisticas {
  clientesAsignados: number;
  cobranzaDelDia: number;
  metaDelDia: number;
  clientesNuevos: number;
  totalDeuda: number;
  prestamosActivos: number;
  avanceDiario: number;
}


export interface RutaDetalleMock {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  zona: string;
  cobrador: string;
  supervisor?: string;
  activa: boolean;
  estadisticas: RutaEstadisticas;
  nivelRiesgo: string;
  porcentajeMora: number;
  asignaciones?: Record<string, unknown>[];
  asignacionesRuta?: Record<string, unknown>[];
  cobradorId?: string;
  frecuenciaVisita?: string;
}

export async function getRutaDetalle(id: string): Promise<RutaDetalleMock | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return null;
    }
    const apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

    const res = await fetch(`${apiUrl}/api-credisur/routes/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 404 || res.status === 400) return null;
      if (res.status === 401) return null;
      console.error(`Error fetching route: ${res.status} ${res.statusText}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching route detail:', error);
    return null;
  }
}


export interface Ruta {
  id: string;
  nombre: string;
  codigo: string;
  zona?: string;
  estado: 'ACTIVA' | 'INACTIVA' | 'PENDIENTE_ACTIVACION' | 'COMPLETADA';
  cobrador: string;
  cobradorId?: string;
  supervisorId?: string;
  clientesAsignados: number;
  clientesNuevos: number;
  cobranzaDelDia: number;
  metaDelDia: number;
  descripcion?: string;
  nivelRiesgo?: string;
  frecuenciaVisita?: string;
}

export async function getRutasList(): Promise<Ruta[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    // Si no hay token, retornamos array vacío sin intentar fetch que daría 401
    if (!token) {
      // Opcional: Podríamos redirigir aquí, pero mejor dejar que el middleware o layout manejen la redirección general
      return [];
    }

    const apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

    // Fetch routes with a safer limit to avoid timeouts
    const res = await fetch(`${apiUrl}/api-credisur/routes?limit=20`, { 
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fresh
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Token expirado o inválido
        return [];
      }
      const errorText = await res.text();
      console.error(`Error fetching routes list: ${res.status} ${res.statusText}`, errorText);
      return [];
    }

    const json = await res.json();
    return (json.data || []) as Ruta[];
  } catch (error) {
    console.error('Error fetching routes list:', error);
    return [];
  }
}
