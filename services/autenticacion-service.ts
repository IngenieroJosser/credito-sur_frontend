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

export async function cerrarSesion() {
  if (typeof window !== "undefined") {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearCachedSession();
  }
}
