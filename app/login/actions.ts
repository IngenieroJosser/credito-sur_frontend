'use server';

import { cookies } from 'next/headers';
import { LoginData } from '@/lib/types/autenticacion-type';
import { apiClient } from '@/lib/api/apiClient';

export interface LoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
  user?: any;
  token?: string;
}

/**
 * Acción de servidor para manejar el inicio de sesión.
 * Se ejecuta exclusivamente en el lado del servidor, protegiendo la lógica sensible.
 * Usa fetch nativo (no Axios) porque en el servidor no hay localStorage ni browser APIs.
 */
export async function loginAction(data: LoginData): Promise<LoginResult> {
  const cookieStore = await cookies();

  try {
    const res = await apiClient.post('/auth/login', data);
    const response = res.data as any;

    if (!response || !response.access_token) {
      return { success: false, error: 'Respuesta inválida del servidor' };
    }

    // Guardamos el token en una cookie segura HttpOnly.
    cookieStore.set('token', response.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: '/',
    });
    
    // Cookie pública con el rol para lógica de UI
    if (response.usuario?.rol) {
      cookieStore.set('user_role', response.usuario.rol, {
        httpOnly: false,
        path: '/',
      });
    }

    // Ruta de redirección basada en el rol
    const fallbackRedirects: Record<string, string> = {
      'COBRADOR': '/cobranzas',
      'COORDINADOR': '/coordinador',
      'SUPER_ADMINISTRADOR': '/admin',
      'ADMINISTRADOR': '/admin',
      'SUPERVISOR': '/supervisor',
      'CONTADOR': '/contable',
      'PUNTO_DE_VENTA': '/punto-de-venta'
    };

    const redirectPath = response.usuario?.rutaDefault 
      || (response.usuario?.rol && fallbackRedirects[response.usuario.rol]) 
      || '/admin';

    return {
      success: true,
      redirectTo: redirectPath,
      user: response.usuario,
      token: response.access_token
    };

  } catch (error: any) {
    const status = error?.response?.status;
    const messageFromBody = error?.response?.data?.message;
    let msg = messageFromBody || error?.message || 'Error al iniciar sesión';

    if (status === 401) {
      msg = 'Credenciales incorrectas';
    } else if (error?.code === 'ECONNREFUSED') {
      msg = 'No se pudo conectar con el servidor';
    }

    return { success: false, error: msg };
  }
}

/**
 * Cierra la sesión eliminando las cookies de autenticación.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  // Limpiamos tanto la cookie segura como la pública
  cookieStore.delete('token');
  cookieStore.delete('user_role');
  return { success: true };
}
