import { apiRequest } from "@/lib/api/api";
import { syncService } from '@/lib/offline/syncService';

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: string;
  color?: string;
  activa: boolean;
  creadoEn: string;
}

export interface CrearCategoriaDto {
  nombre: string;
  descripcion?: string;
  tipo: string;
  color?: string;
}

export const categoriasService = {
  async obtenerTodas(tipo?: string): Promise<Categoria[]> {
    const endpoint = tipo ? `/categorias?tipo=${tipo}` : '/categorias';
    return apiRequest<Categoria[]>('GET', endpoint);
  },

  async crear(data: CrearCategoriaDto): Promise<Categoria> {
    try {
      return await apiRequest<Categoria>('POST', '/categorias', data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        console.log('[Offline Mode] Guardando creacion de categoria en cola...');
        return await syncService.enqueueOperation(
          'categoria_crear',
          '/categorias',
          'POST',
          data,
          'Crear categoría: ' + data.nombre
        ) as any;
      }
      throw error;
    }
  },

  async eliminar(id: string): Promise<void> {
    try {
      return await apiRequest<void>('DELETE', `/categorias/${id}`);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        console.log('[Offline Mode] Guardando eliminacion de categoria en cola...');
        await syncService.enqueueOperation(
          'categoria_eliminar',
          `/categorias/${id}`,
          'DELETE',
          null,
          'Eliminar categoría ID: ' + id
        );
        return;
      }
      throw error;
    }
  }
};
