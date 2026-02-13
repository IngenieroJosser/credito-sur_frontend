
import { apiRequest } from "@/lib/api/api";

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
    return apiRequest<Categoria>('POST', '/categorias', data);
  },

  async eliminar(id: string): Promise<void> {
    return apiRequest<void>('DELETE', `/categorias/${id}`);
  }
};
