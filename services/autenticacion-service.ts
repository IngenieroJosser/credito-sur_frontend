/**
 * ============================================================================
 * SERVICIO DE AUTENTICACIÓN
 * ============================================================================
 * 
 * @description
 * Capa de abstracción para la comunicación con el Backend de Auth (NestJS).
 * Gestiona el ciclo de vida de la sesión (Login/Logout/Perfil).
 * Incluye soporte para sesiones offline cacheadas.
 * 
 * @security
 * El token JWT se almacena en localStorage. 
 * Nota: Considerar mover a HttpOnly Cookies para mayor seguridad en producción.
 */
import { apiRequest } from "@/lib/api/api";
import { AuthResponse, LoginData, UserProfile } from "@/lib/types/autenticacion-type";
import { cacheSession, clearCachedSession } from "@/lib/auth/offlineAuth";

export async function iniciarSesion(dataLogin: LoginData) {
  const response = await apiRequest<AuthResponse>('POST', `/auth/login`, dataLogin);
  
  // Cachear sesión para uso offline
  if (response.access_token && response.usuario) {
    cacheSession(response.access_token, response.usuario);
  }
  
  return response;
}

export async function obtenerPerfil() {
  return await apiRequest<UserProfile>('GET', `/auth/perfil`);
}

export async function refreshSesion() {
  const response = await apiRequest<AuthResponse>('GET', `/auth/refresh`);

  // Cachear sesión para uso offline
  if (response.access_token && response.usuario) {
    cacheSession(response.access_token, response.usuario);
  }

  return response;
}

export async function cerrarSesion() {
  if (typeof window !== "undefined") {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearCachedSession();

    // Al cerrar sesion se borra del dispositivo la cache de datos sensibles
    // (clientes, prestamos, pagos, usuarios...). NO se toca la cola offline
    // (offline-queue): el trabajo sin enviar se conserva, asi que no rompe el
    // modo sin conexion. Import dinamico para no cargar IndexedDB en SSR.
    try {
      const { offlineStore } = await import('@/lib/offline');
      await offlineStore.clearAll();
    } catch {
      // IndexedDB no disponible o ya cerrado: no es critico.
    }
  }
}
