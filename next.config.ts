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
    ],
  },
});

const nextConfig: NextConfig = {
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
