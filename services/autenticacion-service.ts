import { apiRequest } from "@/lib/api/api";
import { AuthResponse, LoginData } from "@/lib/types/autenticacion-type";

export async function iniciarSesion(dataLogin:LoginData) {
  return await apiRequest<AuthResponse>('POST', `/auth/login`, dataLogin);
}
