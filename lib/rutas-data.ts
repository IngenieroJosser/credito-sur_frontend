import { cookies } from 'next/headers';
import { raizBackend } from '@/lib/api/baseUrl';
import type { RutaDeLista } from '@/types/domain';

/**
 * Las cifras del dia tal como las ANIDA el detalle, `GET /routes/:id`
 * (`routes.service.ts:2413-2422`). El listado manda las mismas cifras pero PLANAS
 * en la raiz, y esa otra forma esta en `RutaDeListado` (`services/rutas-service.ts`).
 *
 * Los dos tipos estan repetidos a proposito: este archivo importa `next/headers`,
 * o sea que solo corre en el servidor, y el servicio de rutas corre en el cliente.
 * Si se cambia uno hay que cambiar el otro.
 */
export interface RutaEstadisticas {
  clientesAsignados: number;
  cobranzaDelDia: number;
  metaDelDia: number;
  clientesNuevos: number;
  totalDeuda: number;
  prestamosActivos: number;
  avanceDiario: number;
  /**
   * Efectivo que el cobrador ya entrego hoy. Solo lo manda el detalle
   * (`routes.service.ts:2421`); el listado no lo incluye, de ahi el opcional.
   */
  efectivoEntregado?: number;
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
    const apiUrl = raizBackend();

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


/**
 * La forma de una ruta del listado vive en `types/domain.ts`.
 *
 * Aqui habia una cuarta copia de la misma interfaz. Se deja como alias para que no
 * puedan volver a separarse.
 *
 * Nota: ni `getRutasList` ni `getRutaDetalle` de este archivo tienen consumidores
 * hoy; lo unico que se usa de aqui es el tipo `RutaDetalleMock`.
 */
export type Ruta = RutaDeLista;

export async function getRutasList(): Promise<Ruta[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    // Si no hay token, retornamos array vacío sin intentar fetch que daría 401
    if (!token) {
      // Opcional: Podríamos redirigir aquí, pero mejor dejar que el middleware o layout manejen la redirección general
      return [];
    }

    const apiUrl = raizBackend();

    // Traer las rutas con un límite prudente para evitar timeouts
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
