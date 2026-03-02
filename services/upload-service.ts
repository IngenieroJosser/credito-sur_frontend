import { apiClient } from "@/lib/api/apiClient";

export interface UploadResponse {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  publicId?: string;
  originalName?: string;
}

export const uploadService = {
  /**
   * Sube un archivo al servidor
   * @param file Archivo a subir
   * @returns Metadatos del archivo subido
   */
  async uploadFile(
    file: File,
    meta?: {
      clienteId?: string;
      dni?: string;
      nombres?: string;
      apellidos?: string;
      tipoContenido?: string;
    },
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (meta?.clienteId) formData.append('clienteId', meta.clienteId);
    if (meta?.dni) formData.append('dni', meta.dni);
    if (meta?.nombres) formData.append('nombres', meta.nombres);
    if (meta?.apellidos) formData.append('apellidos', meta.apellidos);
    if (meta?.tipoContenido) formData.append('tipoContenido', meta.tipoContenido);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const response = await apiClient.post<UploadResponse>('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    return response.data;
  }
};
