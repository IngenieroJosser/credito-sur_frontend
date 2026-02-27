import { apiRequest } from '@/lib/api/api';
import { syncService } from '@/lib/offline/syncService';
import { offlineStore } from '@/lib/offline/offlineDb';

export interface PrecioProducto {
  meses: number;
  precio: number;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  categoriaId?: string;
  marca: string | null;
  modelo: string | null;
  costo: number;
  stock: number;
  stockMinimo: number;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
  precios?: PrecioProducto[];
}

export interface CrearProductoDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  categoriaId?: string;
  marca?: string;
  modelo?: string;
  costo: number;
  stock?: number;
  stockMinimo?: number;
  precioContado?: number;
  precios?: { meses: number; precio: number }[];
}

export interface ActualizarProductoDto {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  categoriaId?: string;
  marca?: string;
  modelo?: string;
  costo?: number;
  stock?: number;
  stockMinimo?: number;
  activo?: boolean;
  precioContado?: number;
  precios?: { meses: number; precio: number }[];
}

export interface EstadisticasInventario {
  totalProductos: number;
  productosActivos: number;
  productosBajoStock: number;
  valorTotalInventario: number;
}

export const inventarioService = {
  /**
   * Obtener todos los productos
   */
  async obtenerProductos(): Promise<Producto[]> {
    try {
      return await apiRequest<Producto[]>('GET', '/inventory');
    } catch (error) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('[Offline Mode] Cargando productos desde cache local...');
        const cached = await offlineStore.getAll<Producto>('productos');
        if (cached.length > 0) return cached;
      }
      throw error;
    }
  },

  /**
   * Obtener estadisticas del inventario
   */
  async obtenerEstadisticas(): Promise<EstadisticasInventario> {
    return apiRequest<EstadisticasInventario>('GET', '/inventory/stats');
  },

  /**
   * Obtener un producto por ID
   */
  async obtenerProductoPorId(id: string): Promise<Producto> {
    try {
      return await apiRequest<Producto>('GET', `/inventory/${id}`);
    } catch (error) {
       if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('[Offline Mode] Buscando producto ID ' + id + ' en cache local...');
        const cached = await offlineStore.getById<Producto>('productos', id);
        if (cached) return cached;
      }
      throw error;
    }
  },

  /**
   * Crear un nuevo producto
   */
  async crearProducto(data: CrearProductoDto): Promise<Producto> {
    try {
      return await apiRequest<Producto>('POST', '/inventory', data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        console.log('[Offline Mode] Guardando creacion de producto en cola...');
        return await syncService.enqueueOperation(
          'producto_crear',
          '/inventory',
          'POST',
          data,
          'Crear producto: ' + data.nombre
        ) as any;
      }
      throw error;
    }
  },

  /**
   * Actualizar un producto existente
   */
  async actualizarProducto(id: string, data: ActualizarProductoDto): Promise<Producto> {
    try {
      return await apiRequest<Producto>('PATCH', `/inventory/${id}`, data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        console.log('[Offline Mode] Guardando actualizacion de producto en cola...');
        return await syncService.enqueueOperation(
          'producto_actualizar',
          `/inventory/${id}`,
          'PATCH',
          data,
          'Actualizar producto ID: ' + id
        ) as any;
      }
      throw error;
    }
  },

  /**
   * Eliminar un producto
   */
  async eliminarProducto(id: string): Promise<void> {
    try {
      return await apiRequest<void>('DELETE', `/inventory/${id}`);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        console.log('[Offline Mode] Guardando eliminacion de producto en cola...');
        await syncService.enqueueOperation(
          'producto_eliminar',
          `/inventory/${id}`,
          'DELETE',
          null,
          'Eliminar producto ID: ' + id
        );
        return;
      }
      throw error;
    }
  }
};
