import { apiRequest } from "@/lib/api/api";

export interface ConfiguracionSistema {
  id: string;
  autoAprobarClientes: boolean;
  autoAprobarCreditos: boolean;
}

class ConfiguracionService {
  async getConfiguracion(): Promise<ConfiguracionSistema> {
    try {
      const config = await apiRequest<ConfiguracionSistema>('GET', '/configuracion');
      return config || {
        id: 'default',
        autoAprobarClientes: false,
        autoAprobarCreditos: false,
      };
    } catch (e) {
      return {
        id: 'default',
        autoAprobarClientes: false,
        autoAprobarCreditos: false,
      };
    }
  }

  async updateConfiguracion(data: Partial<ConfiguracionSistema>): Promise<ConfiguracionSistema> {
    return apiRequest<ConfiguracionSistema>('PUT', '/configuracion', data);
  }
}

export const configuracionService = new ConfiguracionService();
