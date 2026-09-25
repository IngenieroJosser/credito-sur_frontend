import { logger } from '@/lib/logger'
import { apiRequest } from "@/lib/api/api";
import { syncService } from '@/lib/offline/syncService';
import { esErrorDeRed } from '@/lib/offline/conRespaldoOffline';

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

  /**
   * Sin conexión devuelve `null`, no el registro de la cola.
   *
   * Antes devolvía `enqueueOperation(...) as any`, un objeto con `endpoint` y
   * `method` disfrazado de configuración. Quien llama no usa el resultado —hace
   * `await` y recarga—, así que el `| null` dice lo que de verdad pasa.
   */
  async updateConfiguracion(
    data: Partial<ConfiguracionSistema>,
  ): Promise<ConfiguracionSistema | null> {
    try {
      return await apiRequest<ConfiguracionSistema>('PUT', '/configuracion', data);
    } catch (error) {
      if (esErrorDeRed(error)) {
        logger.log('[Offline Mode] Guardando actualizacion de configuracion en cola...');
        await syncService.enqueueOperation(
          'configuracion_actualizar',
          '/configuracion',
          'PUT',
          data,
          'Actualizar configuración del sistema'
        );
        return null;
      }
      throw error;
    }
  }
}

export const configuracionService = new ConfiguracionService();


