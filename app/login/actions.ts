import { cookies } from 'next/headers';

export interface SetAuthCookiesResult {
  success: boolean;
  error?: string;
}

/**
 * Acción de servidor para establecer las cookies fuertemente tipadas y seguras.
 * Se llama DESPUÉS de que el cliente realice el inicio de sesión exitoso contra 
 * el backend, evitando los límites de timeout (10s) de Vercel (Serverless Functions)
 * en arranques fríos (Cold Starts).
 */
export async function setAuthCookiesAction(token: string, rol: string): Promise<SetAuthCookiesResult> {
  const cookieStore = await cookies();

  try {
    if (!token) {
      return { success: false, error: 'Token no proporcionado' };
    }

    // Guardamos el token en una cookie segura HttpOnly.
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: '/',
    });
    
    // Cookie pública con el rol para lógica de UI
    if (rol) {
      cookieStore.set('user_role', rol, {
        httpOnly: false,
        path: '/',
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error al configurar cookies:', error);
    return { success: false, error: 'Error interno al configurar sesión' };
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

