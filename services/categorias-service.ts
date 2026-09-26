import { logger } from '@/lib/logger'
import { apiRequest } from "@/lib/api/api";
import { syncService } from '@/lib/offline/syncService';
import {
  conRespaldoOffline,
  esErrorDeRed,
} from '@/lib/offline/conRespaldoOffline';

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
    // Sin conexión se devuelve la categoría que se acaba de pedir, no el registro
    // de la cola.
    //
    // Antes esto era `return await syncService.enqueueOperation(...) as any`, y ese
    // registro tiene `id`, `endpoint`, `method`… pero NO tiene `nombre`. Quien
    // llama lo mete en el desplegable y lo pinta, asi que sin conexión aparecía una
    // opción en blanco y se seleccionaba el id de la cola.
    //
    // Va por `conRespaldoOffline`, que es el helper que ya centraliza esto: encola
    // solo ante error de red, relanza cualquier otro, y devuelve el valor optimista.
    // El `tempId` se le pasa para que el sync lo cambie por el id real al subir.
    const tempId = `temp-cat-${Date.now()}`;

    return conRespaldoOffline<Categoria>(
      () => apiRequest<Categoria>('POST', '/categorias', data),
      {
        type: 'categoria_crear',
        endpoint: '/categorias',
        method: 'POST',
        data,
        description: 'Crear categoría: ' + data.nombre,
        tempId,
      },
      {
        id: tempId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo: data.tipo,
        color: data.color,
        activa: true,
        creadoEn: new Date().toISOString(),
      },
    );
  },

  async eliminar(id: string): Promise<void> {
    try {
      return await apiRequest<void>('DELETE', `/categorias/${id}`);
    } catch (error) {
      if (esErrorDeRed(error)) {
        logger.log('[Offline Mode] Guardando eliminacion de categoria en cola...');
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


