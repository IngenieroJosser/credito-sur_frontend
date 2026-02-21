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
    const rawBaseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://credito-sur-backend.onrender.com"
        : "http://localhost:3001");

    const normalizedBase = rawBaseUrl.replace(/\/$/, "");
    const apiBase = normalizedBase.endsWith("/api-credisur")
      ? normalizedBase
      : `${normalizedBase}/api-credisur`;

    // Controller para forzar timeout de 55 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      cache: 'no-store', // Evitar caché agresivo de Next
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
        let msg = responseData?.message || 'Error al iniciar sesión';
        if (res.status === 401) {
            msg = 'Credenciales incorrectas';
        }
        return { success: false, error: msg };
    }

    if (!responseData || !responseData.access_token) {
      return { success: false, error: 'Respuesta inválida del servidor' };
    }

    // Guardamos el token en una cookie segura HttpOnly.
    cookieStore.set('token', responseData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: '/',
    });
    
    // Cookie pública con el rol para lógica de UI
    if (responseData.usuario?.rol) {
      cookieStore.set('user_role', responseData.usuario.rol, {
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

    const redirectPath = responseData.usuario?.rutaDefault 
      || (responseData.usuario?.rol && fallbackRedirects[responseData.usuario.rol]) 
      || '/admin';

    return {
      success: true,
      redirectTo: redirectPath,
      user: responseData.usuario,
      token: responseData.access_token
    };

  } catch (error: any) {
    let msg = 'Error al iniciar sesión';

    if (error?.name === 'AbortError' || error?.message?.includes('timeout') || error?.message?.includes('fetch failed')) {
      msg = 'El servidor está iniciando (Cold Start). Por favor, intenta de nuevo en unos segundos.';
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
