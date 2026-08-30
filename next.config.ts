/* eslint-disable @typescript-eslint/no-require-imports */
import type { NextConfig } from "next";
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  // Pagina de respaldo cuando una navegacion no esta en cache y no hay red.
  // next-pwa la precachea y la sirve en vez del error del navegador.
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    disableDevLogs: true,
    importScripts: ["/sw-push-handler.js"],
    // Excluir /api/ping del caché: debe ir SIEMPRE a la red
    // para que checkRealConnectivity() sea preciso
    runtimeCaching: [
      {
        // /api/ping SIEMPRE a la red: es la sonda de conectividad real.
        urlPattern: /\/api\/ping/,
        handler: 'NetworkOnly',
      },
      {
        // Peticiones RSC de Next (navegacion App Router): red primero, cache
        // si no hay conexion.
        urlPattern: ({ url }: { url: URL }) =>
          url.pathname.startsWith('/_next/') === false &&
          (url.search.includes('_rsc=') || false),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'rsc',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Documentos (F5 / apertura directa): red primero; sin red se sirve la
        // version cacheada y, si no existe, la pagina /offline (fallback).
        urlPattern: ({ request }: { request: Request }) =>
          request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'paginas',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // JS/CSS de Next: cache primero.
        urlPattern: /\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 600, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/_next\/image\?url=.+$/i,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'next-image', expiration: { maxEntries: 300 } },
      },
      {
        // Imagenes y fuentes.
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf|eot)$/i,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'assets', expiration: { maxEntries: 400 } },
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
