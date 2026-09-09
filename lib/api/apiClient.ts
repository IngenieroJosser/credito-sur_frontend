import { logger } from '@/lib/logger'
import axios from "axios";

// URL Principal (VPS en la nube o servidor por defecto)
const primaryUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://credito-sur-backend.onrender.com"
    : "http://127.0.0.1:3001");

// URL de Contingencia (Servidor Físico en LAN local).
//
// Solo existe si se configura NEXT_PUBLIC_LOCAL_URL. Antes, cuando no estaba
// definida, se caía por defecto al backend de Render (PRODUCCION): si el backend
// local tardaba o fallaba un instante, la misma pantalla pasaba a leer la base de
// produccion sin avisar. Eso hacia que un cliente recien importado en local
// saliera como "Cliente no encontrado" (no existe alla) y que algunas listas
// mostraran datos que no eran los de esta maquina.
//
// Ademas de confuso era peligroso: una escritura podia terminar en produccion.
// El failover es para el servidor de la oficina en LAN, no para produccion.
const getSecondaryUrl = (): string | null =>
  process.env.NEXT_PUBLIC_LOCAL_URL || null;

const secondaryUrl = getSecondaryUrl();

const normalizeUrl = (url: string) => {
  const normalized = url.replace(/\/$/, "");
  return normalized.endsWith("/api-credisur") ? normalized : `${normalized}/api-credisur`;
};

const primaryBase = normalizeUrl(primaryUrl);
const secondaryBase = secondaryUrl ? normalizeUrl(secondaryUrl) : null;

export const apiClient = axios.create({
  baseURL: `${primaryBase}/`,
  timeout: 30000, // Aumentado a 30s para dar tiempo al cold start de Render
  // Envia la cookie httpOnly 'token' al backend (cross-site). El header
  // Authorization se sigue mandando: ambos caminos valen, no rompe nada.
  withCredentials: true,
});

// Implementación de failover automático (Opción A de la propuesta)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    // Si el error es de red (desconexión, timeout) y no hemos reintentado ya
    if (!config._retry && (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error')) {

      // Si el navegador está offline, NO tiene sentido conmutar al servidor de
      // contingencia: ese intento solo produce un error de red extra (o un
      // error de CORS al golpear el backend público desde localhost). Se
      // rechaza directo y las capas superiores usan la caché offline.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return Promise.reject(error);
      }

      // Sin servidor de contingencia configurado no hay a donde conmutar, y si
      // es el mismo que el principal el reintento no aporta nada.
      if (!secondaryBase || primaryBase === secondaryBase) {
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
