import { apiClient } from '@/lib/api/apiClient';
import { apiRequest } from '@/lib/api/api';
import {
  LoteImportacion,
  ResultadoConfirmacionClientesCreditos,
  ResultadoConfirmacionInventario,
  ResultadoReversionLote,
  ResultadoValidacion,
} from '@/types/importaciones';

// Obtener la URL base desde la configuración del cliente (quitando el slash final si existe)
const getBaseUrl = () => {
  const baseURL = apiClient.defaults.baseURL || '';
  return baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
};

/**
 * Función privada: descarga un archivo como Blob y lo dispara como descarga en el navegador.
 * Al estar fuera del objeto, evita problemas de `this` si se desestructura el servicio.
 */
async function descargarArchivo(endpoint: string, nombreFallback: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const baseUrl = getBaseUrl();
  const fullUrl = `${baseUrl}${endpoint}`;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error('No se pudo descargar la plantilla');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;

  // Intentar extraer el nombre real desde el header Content-Disposition
  let filename = nombreFallback;
  const disposition = response.headers.get('content-disposition');
  if (disposition && disposition.includes('attachment')) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches?.[1]) {
      filename = matches[1].replace(/['"]/g, '');
    }
  }

  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

export const importacionesService = {
  /** Últimas importaciones confirmadas, con su posibilidad de deshacerse. */
  async listarLotes(): Promise<LoteImportacion[]> {
    return await apiRequest<LoteImportacion[]>('GET', '/importaciones/lotes', undefined, {
      cacheTTL: 0,
    });
  },

  /** Deshace una importación: elimina los clientes y créditos que creó. */
  async revertirLote(loteId: string): Promise<ResultadoReversionLote> {
    return await apiRequest<ResultadoReversionLote>(
      'POST',
      `/importaciones/lotes/${loteId}/revertir`,
    );
  },

  /**
   * Descarga la plantilla de clientes y créditos
   */
  async descargarPlantillaClientesCreditos(): Promise<void> {
    await descargarArchivo(
      '/importaciones/plantilla/clientes-creditos',
      'plantilla_importacion_credisur_clientes_creditos.xlsx',
    );
  },

  /**
   * Descarga la plantilla de inventario
   */
  async descargarPlantillaInventario(): Promise<void> {
    await descargarArchivo(
      '/importaciones/plantilla/inventario',
      'plantilla_importacion_credisur_inventario.xlsx',
    );
  },

  /**
   * Valida un archivo de clientes y créditos
   */
  async validarClientesCreditos(file: File): Promise<ResultadoValidacion> {
    const formData = new FormData();
    formData.append('file', file);
    return await apiRequest<ResultadoValidacion>(
      'POST',
      '/importaciones/clientes-creditos/validar',
      formData,
    );
  },

  /**
   * Valida un archivo de inventario
   */
  async validarInventario(file: File): Promise<ResultadoValidacion> {
    const formData = new FormData();
    formData.append('file', file);
    return await apiRequest<ResultadoValidacion>(
      'POST',
      '/importaciones/inventario/validar',
      formData,
    );
  },

  /**
   * Confirma e importa un archivo de clientes y créditos ya validado.
   */
  async confirmarClientesCreditos(file: File): Promise<ResultadoConfirmacionClientesCreditos> {
    const formData = new FormData();
    formData.append('file', file);
    return await apiRequest<ResultadoConfirmacionClientesCreditos>(
      'POST',
      '/importaciones/clientes-creditos/confirmar',
      formData,
    );
  },

  /**
   * Confirma e importa un archivo de inventario ya validado.
   */
  async confirmarInventario(file: File): Promise<ResultadoConfirmacionInventario> {
    const formData = new FormData();
    formData.append('file', file);
    return await apiRequest<ResultadoConfirmacionInventario>(
      'POST',
      '/importaciones/inventario/confirmar',
      formData,
    );
  },
};
