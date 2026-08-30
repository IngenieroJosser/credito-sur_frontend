/* eslint-disable @typescript-eslint/no-require-imports */
import type { NextConfig } from "next";
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    importScripts: ["/sw-push-handler.js"],
    // Excluir /api/ping del caché: debe ir SIEMPRE a la red
    // para que checkRealConnectivity() sea preciso
    runtimeCaching: [
      {
        urlPattern: /^\/api\/ping$/,
        handler: 'NetworkOnly',
      },
      {
        // Paginas (navegaciones/documento): red primero; si no hay conexion,
        // se sirve la version cacheada. Asi un F5 offline sobre una pagina ya
        // visitada (incluidas las de detalle [id]) funciona en vez de quedar
        // en blanco.
        urlPattern: ({ request }: { request: Request }) =>
          request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'paginas',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // JS/CSS de Next: cache primero (se sirven offline al recargar).
        urlPattern: /\/_next\/(static|image)\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-assets',
          expiration: { maxEntries: 600, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=()' },
      ...(process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
        : []),
    ];

    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async rewrites() {
    return [
      // Clean URLs for ADMIN/SUPER_ADMIN — strip /admin prefix
      // Each admin sub-route gets a clean alias
      { source: '/creditos', destination: '/admin/creditos' },
      { source: '/creditos/:path*', destination: '/admin/creditos/:path*' },
      { source: '/clientes', destination: '/admin/clientes' },
      { source: '/clientes/:path*', destination: '/admin/clientes/:path*' },
      { source: '/prestamos', destination: '/admin/prestamos' },
      { source: '/prestamos/:path*', destination: '/admin/prestamos/:path*' },
      { source: '/rutas', destination: '/admin/rutas' },
      { source: '/rutas/:path*', destination: '/admin/rutas/:path*' },
      { source: '/users', destination: '/admin/users' },
      { source: '/users/:path*', destination: '/admin/users/:path*' },
      { source: '/archivados', destination: '/admin/archivados' },
      { source: '/pagos', destination: '/admin/pagos' },
      { source: '/pagos/:path*', destination: '/admin/pagos/:path*' },
      { source: '/solicitudes', destination: '/admin/solicitudes' },
      { source: '/sistema/:path*', destination: '/admin/sistema/:path*' },
      { source: '/reportes/operativos', destination: '/admin/reportes/operativos' },
      { source: '/aprobaciones', destination: '/admin/aprobaciones' },
      { source: '/revisiones', destination: '/admin/revisiones' },
      { source: '/notificaciones', destination: '/admin/notificaciones' },
    ];
  },
};

export default withPWA(nextConfig);
