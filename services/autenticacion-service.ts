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
import { cacheSession, clearCachedSession, programarPurgaDatosOffline } from "@/lib/auth/offlineAuth";

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
    // Borrado de las cookies de sesion. Se ignora el fallo a proposito: sin
    // conexion la peticion no sale, y aun asi el cierre de sesion local debe
    // completarse en vez de abortar dejando la sesion a medias.
    await fetch('/api/sesion', { method: 'DELETE' }).catch(() => undefined);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearCachedSession();

    // No se borra la cache al instante: se programa una purga completa para 8 h
    // despues (datos offline + cache de API + caches del navegador/PWA). Asi,
    // si el usuario vuelve a entrar dentro de ese margen, no pierde sus datos
    // ni tiene que re-descargar. Si no vuelve, todo se limpia al abrir la app
    // pasadas las 8 h. La cola offline (trabajo sin enviar) nunca se toca.
    programarPurgaDatosOffline();
  }
}
