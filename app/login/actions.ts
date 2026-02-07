'use server';

import { cookies } from 'next/headers';
import { iniciarSesion } from '@/services/autenticacion-service';
import { LoginData } from '@/lib/types/autenticacion-type';

export interface LoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
  user?: any;
  token?: string;
}

/**
 * Server Action para iniciar sesión
 * - Ejecuta la petición al backend desde el servidor de Next.js
 * - Maneja la cookie de sesión de forma segura (HttpOnly)
 */
export async function loginAction(data: LoginData): Promise<LoginResult> {
  const cookieStore = await cookies();

  try {
    // 1. Llamar al backend real
    // Nota: iniciarSesion debe usar fetch compatible con Node o lo adaptamos
    const response = await iniciarSesion(data);

    if (!response || !response.access_token) {
      return { success: false, error: 'Respuesta inválida del servidor' };
    }

    // 2. Establecer Cookie Segura
    // Esta cookie será visible para el servidor en futuras peticiones SSR
    cookieStore.set('token', response.access_token, {
      httpOnly: true, // No accesible por JS del cliente (seguridad XSS)
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: '/',
    });
    
    // También guardamos una cookie pública con el rol para middleware/redirecciones ligeras
    if (response.usuario?.rol) {
      cookieStore.set('user_role', response.usuario.rol, {
        httpOnly: false, // Accesible por JS para UI condicional
        path: '/',
      });
    }

    // 3. Determinar redirección
    const roleRedirects: Record<string, string> = {
      'COBRADOR': '/cobranzas',
      'COORDINADOR': '/coordinador',
      'SUPER_ADMINISTRADOR': '/admin',
      'ADMINISTRADOR': '/admin',
      'SUPERVISOR': '/supervisor',
      'CONTADOR': '/contador/contable'
    };

    const redirectPath = (response.usuario?.rol && roleRedirects[response.usuario.rol]) || '/admin';

    // 4. Retornar éxito
    return {
      success: true,
      redirectTo: redirectPath,
      user: response.usuario,
      token: response.access_token
    };

  } catch (error: any) {
    console.error('Error en loginAction:', error);
    
    // Manejo de errores básicos
    // En una app real, mapearíamos códigos de error del backend
    let msg = 'Error al iniciar sesión';
    if (error?.response?.status === 401) msg = 'Credenciales incorrectas';
    if (error?.code === 'ECONNREFUSED') msg = 'No se pudo conectar con el servidor';

    return { success: false, error: msg };
  }
}

/**
 * Server Action para cerrar sesión
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  cookieStore.delete('user_role');
  return { success: true };
}
