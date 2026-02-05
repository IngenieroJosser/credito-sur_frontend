import { apiClient } from "@/lib/api/apiClient";

export interface UploadResponse {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
}

export const uploadService = {
  /**
   * Sube un archivo al servidor
   * @param file Archivo a subir
   * @returns Metadatos del archivo subido
   */
  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

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
