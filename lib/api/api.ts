// app/lib/api/api.ts
import { AxiosRequestConfig, Method, AxiosError } from "axios";
import { apiClient } from "./apiClient";
import {
  getCacheKey,
  getCached,
  setCache,
  invalidateCache,
} from "./apiCache";

export type ApiRequestConfig = AxiosRequestConfig & {
  cacheTTL?: number;
  timeout?: number;
};

export interface ApiError {
  statusCode: number;
  message: string;
  error?: unknown;
}

export const apiRequest = async <T>(
  method: Method,
  endpoint: string,
  data?: unknown,
  config?: ApiRequestConfig
): Promise<T> => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const url = endpoint.startsWith("/") ? endpoint.substring(1) : endpoint;
  const isGET = method.toUpperCase() === "GET";
  const cacheKey = getCacheKey(method, url);

  const requestedCacheTTL = config?.cacheTTL;

  // 1. CACHE HIT (ahora asíncrono)
  if (isGET && requestedCacheTTL !== 0) {
    const cached = await getCached<T>(cacheKey);
    if (cached) return cached;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  if (!(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Separar cacheTTL del config y manejar timeout
  const { cacheTTL, timeout = 10000, ...axiosConfig } = config || {};

  try {
    const response = await apiClient.request<T>({
      method,
      url,
      data,
      headers,
      timeout,
      ...axiosConfig,
    });

    // 2. CACHE STORE / INVALIDATE (ahora asíncrono)
    if (isGET) {
      await setCache(cacheKey, response.data, cacheTTL);
    } else {
      await invalidateCache();
      
      // Feedback visual global en la cola de sync para operaciones que no son GET
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
        try {
          const { logSyncActivity } = await import('@/lib/offline/offlineQueue');
          const description = `${method.toUpperCase()} ${url.split('?')[0]}`;
          logSyncActivity(description);
        } catch (e) {
          // Ignorar si falla el log
        }
      }
    }

    return response.data;
  } catch (error) {
    const err = error as AxiosError<{ message?: string } & Record<string, unknown>>;

    // Manejo específico de timeout
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      const timeoutError: ApiError = {
        statusCode: 408,
        message: "La solicitud está tardando demasiado. Por favor, verifique su conexión.",
        error: "Request timeout"
      };
      console.error('Timeout error:', timeoutError);
      throw timeoutError;
    }

    // Manejo específico de error de red
    if (!err.response) {
      // Detectar diferentes tipos de errores de red
      let errorMessage = "Error de conexión con el servidor. Verifique su conexión a internet.";
      
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = "No se pudo conectar con el servidor. Verifique que el backend esté corriendo y accesible.";
      } else if (err.code === 'ECONNREFUSED') {
        errorMessage = "El servidor rechazó la conexión. Verifique que el backend esté corriendo en el puerto correcto.";
      } else if (err.code === 'ETIMEDOUT') {
        errorMessage = "La conexión con el servidor está tardando demasiado. Verifique su conexión a internet.";
      }
      
      const networkError: ApiError = {
        statusCode: 0,
        message: errorMessage,
        error: err.message || err.code || 'Network Error'
      };
      
      console.error('[API] Error de red completo:', {
        code: err.code,
        message: err.message,
        config: {
          url: err.config?.url,
          baseURL: err.config?.baseURL,
          method: err.config?.method,
        },
        error: networkError
      });
      
      throw networkError;
    }

    // 3. MANEJO CENTRALIZADO DE ERRORES HTTP
    const status = err.response.status;
    
    // Extraer mensaje del error
    let errorMessage = err.response.data?.message || `Error ${status}`;
    
    // Mensajes específicos por código de error
    if (status === 400) {
      errorMessage = err.response.data?.message || "Error de validación en la solicitud";
    } else if (status === 401) {
      errorMessage = "No autorizado. La sesión permanece activa en modo seguro.";
      if (typeof window !== "undefined") {
        console.warn('[API] 401 recibido. Se mantiene la sesión. No se redirige al login.');
      }
    } else if (status === 404) {
      errorMessage = err.response.data?.message || "Recurso no encontrado";
    } else if (status === 500) {
      errorMessage = "Error interno del servidor";
    }

    const apiError: ApiError = {
      statusCode: status,
      message: errorMessage,
      error: err.response.data
    };

    throw apiError;
  }
};

// Función auxiliar para formatear errores para el estado del componente
export const formatErrorForComponent = (error: any): string => {
  if (typeof error === 'string') return error;
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.statusCode) {
    switch (error.statusCode) {
      case 400:
        return "Error de validación en la solicitud. Por favor, contacte al administrador.";
      case 404:
        return "Endpoint no encontrado. Verifique la URL de la API.";
      case 408:
        return "La solicitud está tardando demasiado. Por favor, verifique su conexión.";
      case 500:
        return "Error interno del servidor. Por favor, intente más tarde.";
      default:
        return `Error ${error.statusCode}: ${error.message || 'Error desconocido'}`;
    }
  }
  
  return "No se pudo completar la solicitud. Por favor, intente más tarde.";
};
