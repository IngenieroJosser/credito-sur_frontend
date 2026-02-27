import { apiRequest } from "@/lib/api/api";
import { syncService } from '@/lib/offline/syncService';

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
    try {
      return await apiRequest<ConfiguracionSistema>('PUT', '/configuracion', data);
    } catch (error: any) {
      if (
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.statusCode === 0 || 
        error?.message?.includes('network') ||
        error?.code === 'ERR_NETWORK'
      ) {
        console.log('[Offline Mode] Guardando actualizacion de configuracion en cola...');
        return await syncService.enqueueOperation(
          'configuracion_actualizar',
          '/configuracion',
          'PUT',
          data,
          'Actualizar configuración del sistema'
        ) as any;
      }
      throw error;
    }
  }
}

export const configuracionService = new ConfiguracionService();
