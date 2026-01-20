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

  const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const isGET = method.toUpperCase() === "GET";
  const cacheKey = getCacheKey(method, url);

  // 1. CACHE HIT
  if (isGET) {
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

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

    // 2. CACHE STORE / INVALIDATE
    if (isGET) {
      setCache(cacheKey, response.data, cacheTTL);
    } else {
      invalidateCache();
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
      const networkError: ApiError = {
        statusCode: 0,
        message: "Error de conexión con el servidor. Verifique su conexión a internet.",
        error: err.message
      };
      console.error('Network error:', networkError);
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
      errorMessage = "No autorizado. Por favor, inicie sesión.";
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } else if (status === 404) {
      errorMessage = "Recurso no encontrado";
    } else if (status === 500) {
      errorMessage = "Error interno del servidor";
    }

    const apiError: ApiError = {
      statusCode: status,
      message: errorMessage,
      error: err.response.data
    };

    console.error('API Error:', {
      status: apiError.statusCode,
      message: apiError.message,
      url,
      method,
      data: err.response.data
    });

    throw apiError;
  }
};

// Función auxiliar para formatear errores para el estado del componente
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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