/**
 * A qué pantalla entra cada rol.
 *
 * Vivía duplicado dentro de la página de login. Se saca aquí porque la raíz
 * ("/") también lo necesita: es el `start_url` de la PWA y mandaba SIEMPRE al
 * login, incluso con la sesión abierta. Se veía el login un instante y de ahí
 * rebotaba a la pantalla del rol; ese parpaso es lo que se quita.
 */

export const RUTA_POR_ROL: Record<string, string> = {
  COBRADOR: '/cobranzas',
  COORDINADOR: '/coordinador',
  SUPER_ADMINISTRADOR: '/admin',
  ADMIN: '/admin',
  ADMINISTRADOR: '/admin',
  SUPERVISOR: '/supervisor',
  CONTADOR: '/contador/contable',
  PUNTO_DE_VENTA: '/punto-de-venta',
}

/** Pantalla inicial del rol; `/admin` si el rol no está en el mapa. */
export function rutaDeRol(rol?: string | null): string {
  return RUTA_POR_ROL[String(rol || '').toUpperCase()] || '/admin'
}

/**
 * Pantalla a la que debe entrar quien abre la app: la de su rol si hay sesión
 * guardada, o el login si no la hay.
 *
 * No valida el token contra el servidor a propósito: la app es offline-first y
 * aquí solo se decide a dónde ir. Si el token está vencido, la pantalla de
 * destino lo detecta y manda al login.
 */
export function rutaDeEntrada(): string {
  try {
    const token = localStorage.getItem('token')
    const usuario = localStorage.getItem('user')
    if (!token || !usuario) return '/login'
    return rutaDeRol(JSON.parse(usuario)?.rol)
  } catch {
    return '/login'
  }
}
