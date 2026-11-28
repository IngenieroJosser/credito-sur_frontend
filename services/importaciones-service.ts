import { apiClient } from '@/lib/api/apiClient';
import { apiRequest } from '@/lib/api/api';
import type { CreditoHistoricoDePrueba, DecisionesHistoricas, ExpedienteHistorico, RevisionHistoricaResultado, SeleccionHistorica, SimulacionHistorica, ValidacionLibroIntegral } from '@/types/importaciones-historicas';
import {
  LoteImportacion,
  ResultadoConfirmacionClientesCreditos,
  ResultadoConfirmacionInventario,
  ResultadoReversionLote,
  DetalleLoteImportacion,
  ResultadoValidacion,
} from '@/types/importaciones';

/**
 * Sacar el motivo legible de un error que llegó como Blob.
 *
 * Al pedir la respuesta con `responseType: 'blob'`, axios entrega también los
 * cuerpos JSON de error como Blob: un 403 de permisos con
 * `{ message: "No tienes permisos..." }` llega igualmente como Blob. Sin
 * rescatarlo aquí, la pantalla solo vería «Request failed with status code 403»
 * y se perdería el motivo que el backend sí explicó.
 */
async function mensajeDesdeBlob(blob: Blob): Promise<string | null> {
  try {
    const parsed = JSON.parse(await blob.text()) as { message?: unknown };
    const mensaje = parsed?.message;
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje.trim();
    if (Array.isArray(mensaje)) {
      const limpios = mensaje.map((m) => String(m ?? '').trim()).filter(Boolean);
      if (limpios.length) return limpios.join(' · ');
    }
  } catch {
    // No era JSON: se ignora y quien llama usa su mensaje de respaldo.
  }
  return null;
}

/**
 * Función privada: descarga un archivo como Blob y lo dispara como descarga en el navegador.
 * Al estar fuera del objeto, evita problemas de `this` si se desestructura el servicio.
 *
 * Usa `apiClient` (no un `fetch` suelto) para que la petición viaje con la misma
 * sesión que el resto de la aplicación: la cookie httpOnly `token`, el header
 * `Authorization` y el reintento al servidor de contingencia. Antes se hacía con
 * `fetch` y solo el token del localStorage, así que cuando la sesión vivía solo
 * en la cookie el backend respondía con el HTML de login y se guardaba como
 * «.xlsx»: un Excel corrupto en vez de un error. Por eso, además, se comprueba
 * el tipo y la firma del archivo antes de descargar nada.
 */
async function descargarArchivo(endpoint: string, nombreFallback: string, archivos?: FormData): Promise<void> {
  const url = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  let response;
  try {
    response = await apiClient.request<Blob>({
      method: archivos ? 'POST' : 'GET',
      url,
      data: archivos,
      responseType: 'blob',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (error) {
    // El backend sabe por qué no se pudo (permisos, sesión vencida, plantilla
    // rota). Con responseType blob ese motivo viene dentro de un Blob: se
    // rescata para mostrarlo en vez de un mensaje genérico.
    const data = (error as { response?: { data?: unknown } })?.response?.data;
    if (data instanceof Blob) {
      const mensaje = await mensajeDesdeBlob(data);
      if (mensaje) throw new Error(mensaje);
    }
    throw error;
  }

  const blob = response.data;
  const contentType = String(response.headers['content-type'] ?? '').toLowerCase();

  // Nunca guardar como .xlsx algo que no lo es. Si el servidor devolvió HTML
  // (una página de error o de login) o JSON, se avisa y no se descarga nada.
  if (contentType.includes('application/json') || contentType.includes('text/html')) {
    const mensaje = await mensajeDesdeBlob(blob);
    throw new Error(mensaje ?? 'No se pudo descargar la plantilla');
  }

  // Todo .xlsx es un ZIP y empieza por «PK». Es la comprobación que de verdad
  // distingue un Excel de un error disfrazado, por si el servidor no declaró
  // bien el content-type.
  const firma = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (firma.length < 2 || firma[0] !== 0x50 || firma[1] !== 0x4b) {
    throw new Error('El archivo recibido no es un Excel válido. Vuelve a iniciar sesión e inténtalo de nuevo.');
  }

  const objectUrl = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;

  // Intentar extraer el nombre real desde el header Content-Disposition
  let filename = nombreFallback;
  const disposition = String(response.headers['content-disposition'] ?? '');
  if (disposition.includes('attachment')) {
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

  window.URL.revokeObjectURL(objectUrl);
}

export const importacionesService = {
  /** Últimas importaciones confirmadas, con su posibilidad de deshacerse. */
  async listarLotes(): Promise<LoteImportacion[]> {
    return await apiRequest<LoteImportacion[]>('GET', '/importaciones/lotes', undefined, {
      cacheTTL: 0,
    });
  },

  /** Todo lo que creó una importación, para revisarlo antes de deshacer nada. */
  async detalleLote(loteId: string): Promise<DetalleLoteImportacion> {
    return await apiRequest<DetalleLoteImportacion>(
      'GET',
      `/importaciones/lotes/${loteId}`,
      undefined,
      { cacheTTL: 0 },
    );
  },

  /**
   * Deshace una importación. Sin `prestamoIds` se deshace entera; con la lista,
   * solo esos créditos.
   */
  async revertirLote(
    loteId: string,
    prestamoIds?: string[],
  ): Promise<ResultadoReversionLote> {
    return await apiRequest<ResultadoReversionLote>(
      'POST',
      `/importaciones/lotes/${loteId}/revertir`,
      prestamoIds?.length ? { prestamoIds } : undefined,
    );
  },

  validarLibroIntegral(archivo: File): Promise<ValidacionLibroIntegral> {
    const datos = new FormData();
    datos.append('integral', archivo);
    return apiRequest<ValidacionLibroIntegral>('POST', '/importaciones/integral/validar', datos);
  },

  confirmarLibroOperativo(archivo: File) {
    const datos = new FormData();
    datos.append('integral', archivo);
    return apiRequest('POST', '/importaciones/integral/confirmar', datos);
  },

  listarExpedientesHistoricos() {
    return apiRequest<ExpedienteHistorico[]>('GET', '/importaciones/historicos/expedientes', undefined, { cacheTTL: 0 });
  },

  abrirExpedienteHistorico(id: string) {
    return apiRequest<RevisionHistoricaResultado>('GET', `/importaciones/historicos/expedientes/${id}`, undefined, { cacheTTL: 0 });
  },

  listarCreditosHistoricosDePrueba(id: string) {
    return apiRequest<CreditoHistoricoDePrueba[]>('GET', `/importaciones/historicos/expedientes/${id}/creditos-prueba`, undefined, { cacheTTL: 0 });
  },

  simularAbonoHistorico(id: string, prestamoId: string, monto: number) {
    return apiRequest<SimulacionHistorica>('POST', `/importaciones/historicos/expedientes/${id}/simular-abono`, { prestamoId, monto });
  },

  guardarRevisionHistorica(id: string, revision: number, decisiones: DecisionesHistoricas) {
    return apiRequest<RevisionHistoricaResultado>('POST', `/importaciones/historicos/expedientes/${id}/revisiones`, { revision, decisiones });
  },

  async descargarExpedienteHistorico(id: string) {
    await descargarArchivo(`/importaciones/historicos/expedientes/${id}/consolidado`, 'consolidado-historico-revision.xlsx');
  },

  async prepararHistoricos(archivos: FormData): Promise<void> {
    await descargarArchivo('/importaciones/historicos/preparar', 'consolidado-historico-revision.xlsx', archivos);
  },
  async confirmarIntegralDePrueba(id: string, revision: number, seleccion: SeleccionHistorica, evidencia: string) {
    await apiRequest('POST', `/importaciones/historicos/expedientes/${id}/confirmar-prueba`, {
      revision, ...seleccion, evidencia,
    });
  },

  async descargarPlantillaIntegral(): Promise<void> {
    await descargarArchivo('/importaciones/plantilla/integral', 'plantilla-integral-credisur.xlsx');
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
