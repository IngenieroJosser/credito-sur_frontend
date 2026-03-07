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

  // Si estamos en el navegador, intentar detectar el protocolo para evitar Mixed Content
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//192.168.1.100:3001`;
  }
  
  return "http://192.168.1.100:3001";
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
  timeout: 15000,
});

// Implementación de failover automático (Opción A de la propuesta)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    // Si el error es de red (desconexión, timeout) y no hemos reintentado ya con la red local
    if (!config._retry && (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error')) {
      config._retry = true;
      console.warn('Conexión al servidor principal (VPS) fallida. Conmutando automáticamente a la Red Local (LAN)...');
      
      // Cambiar la base URL a la IP local de contingencia
      const originalPath = config.url?.replace(/^\//, ''); // quitar slash inicial si existe
      config.baseURL = `${secondaryBase}/`;
      config.url = originalPath;
      
      try {
        const response = await axios(config);
        console.log('Operación exitosa en servidor local (LAN).');
        return response;
      } catch (localError) {
        console.error('El servidor local (LAN) también es inaccesible. Modo Offline estricto activado.');
        return Promise.reject(localError);
      }
    }

    return Promise.reject(error);
  }
);
