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
 * Content-Security-Policy (defensa en profundidad).
 *
 * NO usa nonce/strict-dynamic: esta app es una PWA offline-first con paginas
 * prerenderizadas en build (shell estatico), y un nonce por-peticion no se
 * puede inyectar en HTML estatico sin forzar render dinamico, lo que romperia
 * el offline. Se comprobo levantando el server: con strict-dynamic los scripts
 * de Next quedaban sin nonce y el navegador los bloqueaba (app en blanco).
 *
 * Lo que SI protege esta CSP:
 *  - connect-src: la exfiltracion de datos solo puede ir al backend/servicios
 *    permitidos, no a un dominio del atacante (mitigacion real anti-robo).
 *  - script-src 'self' 'unsafe-inline': bloquea cargar scripts externos de
 *    otros dominios (p. ej. <script src=evil.com>). No bloquea inline, pero no
 *    hay ningun XSS inline en el codigo (React escapa por defecto).
 *  - object-src 'none', base-uri 'self', frame-ancestors, form-action:
 *    clickjacking, inyeccion de <base>, y envio de formularios a terceros.
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

function construirCsp(): string {
  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https://res.cloudinary.com https:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' ${BACKEND} ${BACKEND_WS} ${BACKEND_ALT} https://fcm.googleapis.com https://res.cloudinary.com http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*;
    worker-src 'self' blob:;
    manifest-src 'self';
    media-src 'self' https://res.cloudinary.com data: blob:;
    frame-ancestors 'self';
    base-uri 'self';
    form-action 'self';
    object-src 'none';

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

  const csp = construirCsp();

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

  // Resto de páginas: se fija la CSP en la respuesta. No se usa nonce porque
  // las paginas prerenderizadas (shell offline) se generan en build y no
  // pueden llevar un nonce por-peticion; se usa 'self' + 'unsafe-inline' en
  // script-src, que si es compatible.
  return aplicarCabecerasSeguridad(NextResponse.next(), csp);
}

export const config = {
  matcher: [
    // Todas las páginas, excepto estáticos, imágenes optimizadas, el service
    // worker, el manifest, los iconos y ficheros con extensión.
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|sw-push-handler.js|workbox-|manifest|icons?/|.*\\.[\\w]+$).*)',
  ],
};
