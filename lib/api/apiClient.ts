import { logger } from '@/lib/logger'
import axios from "axios";

// URL Principal (VPS en la nube o servidor por defecto)
const primaryUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://credito-sur-backend.onrender.com"
    : "http://127.0.0.1:3001");

// URL de Contingencia (Servidor Físico en LAN local)
const getSecondaryUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_LOCAL_URL;
  if (envUrl) return envUrl;

  // Forzamos HTTPS para el fallback de Render para evitar problemas de Mixed Content
  // y asegurar compatibilidad con el servidor en la nube.
  return "https://credito-sur-backend.onrender.com";
};

const secondaryUrl = getSecondaryUrl();

const normalizeUrl = (url: string) => {
  const normalized = url.replace(/\/$/, "");
  return normalized.endsWith("/api-credisur") ? normalized : `${normalized}/api-credisur`;
};

const primaryBase = normalizeUrl(primaryUrl);
const secondaryBase = normalizeUrl(secondaryUrl);

export const apiClient = axios.create({
  baseURL: `${primaryBase}/`,
  timeout: 30000, // Aumentado a 30s para dar tiempo al cold start de Render
});

// Implementación de failover automático (Opción A de la propuesta)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    // Si el error es de red (desconexión, timeout) y no hemos reintentado ya
    if (!config._retry && (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error')) {
      
      // Evitar reintento si la URL secundaria es idéntica a la primaria
      if (primaryBase === secondaryBase) {
        return Promise.reject(error);
      }

      config._retry = true;
      logger.warn('Conexión al servidor principal fallida o lenta. Intentando conmutar a servidor de contingencia...');
      
      // Cambiar la base URL a la IP local de contingencia
      const originalPath = config.url?.replace(/^\//, ''); // quitar slash inicial si existe
      config.baseURL = `${secondaryBase}/`;
      config.url = originalPath;
      
      try {
        const response = await axios(config);
        logger.log('Operación exitosa en servidor de contingencia.');
        return response;
      } catch (localError) {
        const status = (localError as any)?.response?.status;
        if (status) {
          // Hubo respuesta HTTP: NO es un problema de conectividad.
          // Ej: 401/403 = token/permisos, 404 = ruta, 500 = error servidor.
          logger.warn(`[API] Fallo en servidor de contingencia con status ${status}. No se activa modo offline por esto.`);
          return Promise.reject(localError);
        }

        logger.warn('El servidor de contingencia también es inaccesible. Se mantiene el estado offline.');
        return Promise.reject(localError);
      }
    }

    return Promise.reject(error);
  }
);
