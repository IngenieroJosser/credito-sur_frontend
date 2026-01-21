import { apiRequest } from "@/lib/api/api";
import { AuthResponse, LoginData, UserProfile } from "@/lib/types/autenticacion-type";

export async function iniciarSesion(dataLogin: LoginData) {
  return await apiRequest<AuthResponse>('POST', `/auth/login`, dataLogin);
}

export async function obtenerPerfil() {
  return await apiRequest<UserProfile>('GET', `/auth/perfil`);
}

export async function cerrarSesion() {
  if (typeof window !== "undefined") {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}