import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { construirCsp, CSP_REPORT_ONLY } from '@/lib/seguridad/csp';

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
