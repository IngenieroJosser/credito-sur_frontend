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
 * Acción de servidor para manejar el inicio de sesión.
 * Se ejecuta exclusivamente en el lado del servidor, protegiendo la lógica sensible.
 */
export async function loginAction(data: LoginData): Promise<LoginResult> {
  const cookieStore = await cookies();

  try {
    // Intentamos autenticar contra el backend principal
    const response = await iniciarSesion(data);

    if (!response || !response.access_token) {
      return { success: false, error: 'Respuesta inválida del servidor' };
    }

    // Guardamos el token en una cookie segura HttpOnly.
    // Esto es vital porque evita que JavaScript del lado del cliente pueda leer el token,
    // protegiendo contra ataques XSS.
    cookieStore.set('token', response.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // Sesión válida por 1 semana
      path: '/',
    });
    
    // Además, guardamos el rol en una cookie pública.
    // Esto sí puede leerlo el cliente para saber qué interfaz mostrar antes de hacer peticiones.
    if (response.usuario?.rol) {
      cookieStore.set('user_role', response.usuario.rol, {
        httpOnly: false, // Accesible por JS para lógica UI
        path: '/',
      });
    }

    // Usamos rutaDefault del backend (dinámico). Fallback hardcodeado por compatibilidad.
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

    // Todo salió bien, devolvemos los datos al cliente para que actualice su estado
    return {
      success: true,
      redirectTo: redirectPath,
      user: response.usuario,
      token: response.access_token
    };

  } catch (error: any) {
    // Traducimos los errores técnicos a mensajes amigables para el usuario
    const status = error?.statusCode || error?.response?.status;
    let msg = error?.message || 'Error al iniciar sesión';
    
    if (status === 401) msg = 'Credenciales incorrectas';
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('fetch')) msg = 'No se pudo conectar con el servidor';

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
