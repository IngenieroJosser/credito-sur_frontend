import { apiRequest } from '@/lib/api/api';

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
    return apiRequest<Producto[]>('GET', '/inventory');
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
    return apiRequest<Producto>('GET', `/inventory/${id}`);
  },

  /**
   * Crear un nuevo producto
   */
  async crearProducto(data: CrearProductoDto): Promise<Producto> {
    return apiRequest<Producto>('POST', '/inventory', data);
  },

  /**
   * Actualizar un producto existente
   */
  async actualizarProducto(id: string, data: ActualizarProductoDto): Promise<Producto> {
    return apiRequest<Producto>('PATCH', `/inventory/${id}`, data);
  },

  /**
   * Eliminar un producto
   */
  async eliminarProducto(id: string): Promise<void> {
    return apiRequest<void>('DELETE', `/inventory/${id}`);
  }
};
