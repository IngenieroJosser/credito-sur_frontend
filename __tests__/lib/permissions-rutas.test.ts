/**
 * Verifica que el menú NO enlace a rutas que el proxy redirige.
 *
 * El proxy redirige /admin/<ruta-limpia> quitando el prefijo /admin. Si el menú
 * enlaza a la versión con /admin, cada clic dispara una redirección de servidor
 * = navegación COMPLETA (se recarga el aside y se cierran los submenús). Para
 * admin/superadmin el menú debe enlazar directo a la URL final.
 *
 * Para los demás roles, los paths se traducen a su prefijo (/coordinador/...,
 * /cobranzas/...), que el proxy nunca toca.
 */
import { obtenerModulos, type Rol } from '@/lib/permissions';

// Mismas rutas que ADMIN_CLEAN_ROUTES en proxy.ts
const RUTAS_QUE_EL_PROXY_REDIRIGE = [
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

const ROLES: Rol[] = [
  'SUPER_ADMINISTRADOR',
  'ADMIN',
  'COORDINADOR',
  'SUPERVISOR',
  'CONTADOR',
  'COBRADOR',
  'PUNTO_DE_VENTA',
] as Rol[];

const recolectarPaths = (mods: any[]): string[] =>
  mods.flatMap((m) => [
    ...(m?.path ? [m.path] : []),
    ...(Array.isArray(m?.submodulos) ? recolectarPaths(m.submodulos) : []),
  ]);

const esRedirigida = (p: string) =>
  RUTAS_QUE_EL_PROXY_REDIRIGE.some((r) => p === r || p.startsWith(`${r}/`));

describe('Rutas del menú: ninguna dispara la redirección del proxy', () => {
  it.each(ROLES)('rol %s no enlaza a rutas redirigidas', (rol) => {
    const paths = recolectarPaths(obtenerModulos(rol));
    const problematicas = paths.filter(esRedirigida);
    expect(problematicas).toEqual([]);
  });

  it('admin/superadmin usan la URL limpia (sin /admin) para esas rutas', () => {
    for (const rol of ['SUPER_ADMINISTRADOR', 'ADMIN'] as Rol[]) {
      const paths = recolectarPaths(obtenerModulos(rol));
      // Debe existir el módulo de importaciones y apuntar a la URL final
      expect(paths).toContain('/sistema/importaciones');
    }
  });

  it('los demás roles reciben su propio prefijo, no /admin', () => {
    const porRol: Record<string, string> = {
      COORDINADOR: '/coordinador',
      SUPERVISOR: '/supervisor',
      CONTADOR: '/contador',
      COBRADOR: '/cobranzas',
      PUNTO_DE_VENTA: '/punto-de-venta',
    };
    for (const [rol, prefijo] of Object.entries(porRol)) {
      const paths = recolectarPaths(obtenerModulos(rol as Rol));
      // Ningún path debe quedar bajo /admin/ para estos roles
      const bajoAdmin = paths.filter((p) => p.startsWith('/admin/'));
      expect({ rol, bajoAdmin }).toEqual({ rol, bajoAdmin: [] });
      // Y al menos uno debe usar su prefijo
      expect(paths.some((p) => p.startsWith(prefijo))).toBe(true);
    }
  });
});

/**
 * Algunas rutas ya no tienen pantalla propia: solo montan un componente vacio
 * que redirige en el cliente a la real. Si el menu enlaza a una de ellas, el
 * usuario monta una pantalla, salta a otra y —como origen y destino viven en
 * arboles de layout distintos— el shell entero se remonta: parece que la
 * aplicacion se recarga hasta el aside.
 */
const PAGINAS_SOLO_REENVIO = [
  '/admin/articulos',
  '/admin/cuentas-mora',
  '/admin/cuentas-vencidas',
  '/admin/rutas/asignacion',
  '/admin/solicitudes',
  '/coordinador/articulos',
  '/coordinador/cuentas-mora',
  '/coordinador/cuentas-vencidas',
  '/coordinador/notificaciones',
  '/contador/cuentas-mora',
  '/supervisor/auditoria',
  '/supervisor/clientes/nuevo',
  '/supervisor/creditos-articulos/nuevo',
  '/cobranzas/auditoria',
  '/cobranzas/perfil',
];

describe('El menu nunca enlaza a una pantalla que solo reenvia', () => {
  it.each(ROLES)('rol %s', (rol) => {
    const paths = recolectarPaths(obtenerModulos(rol));
    const reenvios = paths.filter((p) => PAGINAS_SOLO_REENVIO.includes(p));
    expect({ rol, reenvios }).toEqual({ rol, reenvios: [] });
  });

  it('las pantallas compartidas se enlazan sin prefijo de rol', () => {
    for (const rol of ROLES) {
      const paths = recolectarPaths(obtenerModulos(rol));
      const conPrefijo = paths.filter((p) =>
        /^\/[a-z-]+\/(articulos|cuentas-mora|cuentas-vencidas)$/.test(p),
      );
      expect({ rol, conPrefijo }).toEqual({ rol, conPrefijo: [] });
    }
  });
});
