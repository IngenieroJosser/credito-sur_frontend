'use server';

import { cookies } from 'next/headers';
import { LoginData } from '@/lib/types/autenticacion-type';

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
    const defaultBaseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://credito-sur-backend.onrender.com'
        : 'http://localhost:3001/api-credisur';

    const backendUrl = (process.env.NEXT_PUBLIC_BASE_URL || defaultBaseUrl).replace(/\/$/, '');
    const loginUrl = `${backendUrl}/auth/login`;
    
    console.log(`[Server Action] Login => ${loginUrl}`);

    // Petición directa con fetch nativo (funciona en Node/Vercel sin problemas)
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      console.log(`[Server Action] Error ${res.status}:`, JSON.stringify(errorBody));
      
      if (res.status === 401) {
        return { success: false, error: 'Credenciales incorrectas' };
      }
      return { success: false, error: errorBody?.message || `Error del servidor (${res.status})` };
    }

    const response = await res.json();

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
    console.error('[Server Action] Login error:', error?.message || error);
    
    let msg = error?.message || 'Error al iniciar sesión';
    if (error?.code === 'ECONNREFUSED' || msg.includes('fetch')) {
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
