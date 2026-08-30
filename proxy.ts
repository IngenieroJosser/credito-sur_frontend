import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_CLEAN_ROUTES = [
  '/admin/creditos',
  '/admin/clientes',
  '/admin/prestamos',
  '/admin/rutas',
  '/admin/users',
  '/admin/archivados',
  '/admin/pagos',
  '/admin/solicitudes',
  '/admin/sistema',
  '/admin/reportes/operativos',
  '/admin/aprobaciones',
];

/**
 * Content-Security-Policy con nonce por petición (defensa real contra XSS).
 *
 * Cada respuesta HTML lleva un nonce único; solo se ejecutan los scripts con
 * ese nonce o los que ellos carguen (`strict-dynamic`). Aunque se inyectara un
 * <script> por XSS, el navegador no lo ejecutaría. Next.js aplica el nonce a
 * sus propios scripts en línea al leerlo de la cabecera de la petición.
 *
 * `'unsafe-inline'` y `https:` en script-src son SOLO respaldo para navegadores
 * viejos: los que soportan `strict-dynamic` los ignoran.
 *
 * Si algo se rompe al probar (p. ej. el service worker de la PWA), pon
 * CSP_REPORT_ONLY = true: la CSP pasa a "solo informar" (no bloquea nada, solo
 * registra violaciones en la consola). Diagnosticas, ajustas orígenes, y lo
 * vuelves a false para que proteja de verdad.
 */
const CSP_REPORT_ONLY = false;

const BACKEND = 'https://credito-sur-backend.onrender.com';
const BACKEND_WS = 'wss://credito-sur-backend.onrender.com';
const BACKEND_ALT = 'https://credito-sur-frontend.onrender.com';

function construirCsp(nonce: string): string {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https://res.cloudinary.com https:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' ${BACKEND} ${BACKEND_WS} ${BACKEND_ALT} https://fcm.googleapis.com https://res.cloudinary.com;
    worker-src 'self' blob:;
    manifest-src 'self';
    media-src 'self' https://res.cloudinary.com data: blob:;
    frame-ancestors 'self';
    base-uri 'self';
    form-action 'self';
    object-src 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function aplicarCabecerasSeguridad(res: NextResponse, csp: string) {
  const nombre = CSP_REPORT_ONLY
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';
  res.headers.set(nombre, csp);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self)',
  );
  return res;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = construirCsp(nonce);

  // Redirección de rutas limpias de admin (lógica original), ahora con las
  // cabeceras de seguridad.
  for (const route of ADMIN_CLEAN_ROUTES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      const cleanPath = pathname.replace(/^\/admin/, '');
      const url = request.nextUrl.clone();
      url.pathname = cleanPath;
      return aplicarCabecerasSeguridad(NextResponse.redirect(url), csp);
    }
  }

  // Resto de páginas: se pasa el nonce a Next por la cabecera de la petición
  // para que lo aplique a sus scripts en línea, y se fija la CSP en la
  // respuesta.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return aplicarCabecerasSeguridad(response, csp);
}

export const config = {
  matcher: [
    // Todas las páginas, excepto estáticos, imágenes optimizadas, el service
    // worker, el manifest, los iconos y ficheros con extensión.
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|sw-push-handler.js|workbox-|manifest|icons?/|.*\\.[\\w]+$).*)',
  ],
};
