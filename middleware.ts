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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only redirect /admin/* sub-routes to clean URLs
  // Do NOT redirect /admin itself (that's the dashboard)
  for (const route of ADMIN_CLEAN_ROUTES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      const cleanPath = pathname.replace(/^\/admin/, '');
      const url = request.nextUrl.clone();
      url.pathname = cleanPath;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path((?!$).+)'],
};
