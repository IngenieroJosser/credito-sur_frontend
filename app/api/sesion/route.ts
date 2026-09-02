import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Establece las cookies de sesion despues de que el cliente se autentique
 * contra el backend.
 *
 * Antes esto era una Server Action. El problema: cada compilacion les asigna un
 * identificador nuevo, y esta aplicacion es una PWA cuyo service worker guarda
 * el login en cache. Tras un despliegue, un navegador que aun servia el login
 * viejo invocaba un identificador inexistente y Next mostraba en crudo
 * "Server Action ... was not found on the server".
 *
 * Un route handler tiene una URL fija que no cambia entre despliegues, asi que
 * un cliente cacheado antiguo sigue funcionando y ese error no puede ocurrir.
 */
const OCHO_HORAS = 60 * 60 * 8;

export async function POST(request: Request) {
  let token: unknown;
  let rol: unknown;

  try {
    ({ token, rol } = await request.json());
  } catch {
    return NextResponse.json(
      { success: false, error: 'Peticion mal formada' },
      { status: 400 },
    );
  }

  if (typeof token !== 'string' || !token) {
    return NextResponse.json(
      { success: false, error: 'Token no proporcionado' },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const comunes = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: OCHO_HORAS,
    path: '/',
  };

  cookieStore.set('token', token, { ...comunes, httpOnly: true });

  // Cookie publica con el rol, que la interfaz lee en el cliente.
  if (typeof rol === 'string' && rol) {
    cookieStore.set('user_role', rol, { ...comunes, httpOnly: false });
  }

  return NextResponse.json({ success: true });
}

/** Cierra la sesion borrando ambas cookies. */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  cookieStore.delete('user_role');
  return NextResponse.json({ success: true });
}
