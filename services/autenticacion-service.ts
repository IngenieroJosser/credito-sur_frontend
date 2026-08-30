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
import { clearCache } from "@/lib/api/apiCache";
import { offlineStore } from "@/lib/offline/offlineDb";
import { logoutAction } from "@/app/login/actions";

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
    await logoutAction();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearCachedSession();
    await clearCache();
    await offlineStore.clearAll();
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  }
}
