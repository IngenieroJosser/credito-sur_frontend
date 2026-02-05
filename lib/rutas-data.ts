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
  asignaciones?: any[];
}

export async function getRutaDetalle(id: string): Promise<RutaDetalleMock | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const res = await fetch(`${apiUrl}/routes/${id}`, {
      headers: {
        'Authorization': `Bearer ${token || ''}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Error fetching route: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching route detail:', error);
    return null;
  }
}

export async function getRutasList(): Promise<any[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // Fetch all routes (pagination handling might be needed later)
    const res = await fetch(`${apiUrl}/routes?take=100`, { 
      headers: {
        'Authorization': `Bearer ${token || ''}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fresh
    });

    if (!res.ok) {
      console.error(`Error fetching routes list: ${res.status} ${res.statusText}`);
      return [];
    }

    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching routes list:', error);
    return [];
  }
}
