/**
 * Inventario de pantallas, GENERADO de `app/**\/page.tsx`.
 *
 * Se genera y no se escribe a mano para que una pantalla nueva entre sola en la prueba:
 * una lista a mano se queda corta en la siguiente rama y nadie se entera.
 *
 * Regenerar: `node e2e/generar-inventario.mjs`
 */

/** Las 112 pantallas sin parametros en la URL. */
export const PANTALLAS_ESTATICAS = [
  '/.',
  '/admin',
  '/admin/aprobaciones',
  '/admin/archivados',
  '/admin/articulos',
  '/admin/articulos/nuevo',
  '/admin/auditoria',
  '/admin/clientes',
  '/admin/clientes/nuevo',
  '/admin/contable',
  '/admin/contable/cierre-caja',
  '/admin/contable/movimientos/nuevo',
  '/admin/creditos',
  '/admin/creditos-articulos',
  '/admin/creditos-articulos/nuevo',
  '/admin/creditos/nuevo',
  '/admin/cuentas-mora',
  '/admin/cuentas-vencidas',
  '/admin/notificaciones',
  '/admin/operaciones/punto-de-venta',
  '/admin/pagos/historial',
  '/admin/pagos/registro',
  '/admin/perfil',
  '/admin/prestamos',
  '/admin/prestamos/nuevo',
  '/admin/reportes/financieros',
  '/admin/reportes/operativos',
  '/admin/revisiones',
  '/admin/rutas',
  '/admin/rutas/asignacion',
  '/admin/sistema/backups',
  '/admin/sistema/configuracion',
  '/admin/sistema/importaciones',
  '/admin/sistema/sincronizacion',
  '/admin/solicitudes',
  '/admin/users',
  '/admin/users/nuevo',
  '/articulos',
  '/auditoria',
  '/cobranzas',
  '/cobranzas/auditoria',
  '/cobranzas/backups',
  '/cobranzas/clientes/nuevo',
  '/cobranzas/notificaciones',
  '/cobranzas/perfil',
  '/cobranzas/prestamos/nuevo',
  '/cobranzas/solicitudes',
  '/contable',
  '/contable/cierre-caja',
  '/contador',
  '/contador/articulos',
  '/contador/backups',
  '/contador/contable',
  '/contador/contable/cierre-caja',
  '/contador/cuentas-mora',
  '/contador/cuentas-vencidas',
  '/contador/notificaciones',
  '/contador/pagos/historial',
  '/contador/perfil',
  '/contador/reportes/financieros',
  '/contingencia',
  '/coordinador',
  '/coordinador/aprobaciones',
  '/coordinador/archivados',
  '/coordinador/articulos',
  '/coordinador/backups',
  '/coordinador/clientes',
  '/coordinador/creditos',
  '/coordinador/creditos/nuevo',
  '/coordinador/cuentas-mora',
  '/coordinador/cuentas-vencidas',
  '/coordinador/notificaciones',
  '/coordinador/pagos/historial',
  '/coordinador/perfil',
  '/coordinador/reportes',
  '/coordinador/revisiones',
  '/coordinador/rutas',
  '/coordinador/rutas/asignacion',
  '/coordinador/sistema/sincronizacion',
  '/creditos-articulos',
  '/creditos-articulos/nuevo',
  '/cuentas-mora',
  '/cuentas-vencidas',
  '/login',
  '/notificaciones',
  '/pagos/historial',
  '/perfil',
  '/punto-de-venta',
  '/punto-de-venta/articulos',
  '/punto-de-venta/backups',
  '/punto-de-venta/creditos-articulos',
  '/punto-de-venta/creditos-articulos/nuevo',
  '/punto-de-venta/notificaciones',
  '/punto-de-venta/perfil',
  '/recuperar-contrasena',
  '/reportes/financieros',
  '/supervisor',
  '/supervisor/auditoria',
  '/supervisor/backups',
  '/supervisor/clientes',
  '/supervisor/clientes/nuevo',
  '/supervisor/creditos-articulos/nuevo',
  '/supervisor/creditos/nuevo',
  '/supervisor/cuentas-mora',
  '/supervisor/cuentas-vencidas',
  '/supervisor/notificaciones',
  '/supervisor/perfil',
  '/supervisor/prestamos/nuevo',
  '/supervisor/reportes/operativos',
  '/supervisor/revisiones',
  '/supervisor/rutas',
  '/test',
] as const

/** Las 45 pantallas que piden un id en la URL. Se resuelven con datos reales. */
export const PANTALLAS_DINAMICAS = [
  '/admin/articulos/[id]',
  '/admin/articulos/[id]/editar',
  '/admin/clientes/[id]',
  '/admin/clientes/[id]/editar',
  '/admin/contable/cajas/[id]',
  '/admin/contable/cajas/[id]/editar',
  '/admin/contable/historial/[id]',
  '/admin/contable/movimientos/[id]',
  '/admin/creditos-articulos/[id]',
  '/admin/creditos-articulos/[id]/editar',
  '/admin/cuentas-mora/[id]',
  '/admin/cuentas-vencidas/[id]',
  '/admin/pagos/registrar/[clienteId]',
  '/admin/prestamos/[id]',
  '/admin/prestamos/[id]/editar',
  '/admin/reportes/financieros/detalle/[id]',
  '/admin/rutas/[id]',
  '/admin/users/[id]',
  '/admin/users/[id]/editar',
  '/contable/cajas/[id]',
  '/contable/cajas/[id]/editar',
  '/contable/historial/[id]',
  '/contable/movimientos/[id]',
  '/contador/contable/cajas/[id]',
  '/contador/contable/historial/[id]',
  '/contador/contable/movimientos/[id]',
  '/contador/cuentas-vencidas/[id]',
  '/contador/reportes/financieros/detalle/[id]',
  '/coordinador/clientes/[id]',
  '/coordinador/creditos/[id]',
  '/coordinador/creditos/[id]/editar',
  '/coordinador/cuentas-mora/[id]',
  '/coordinador/cuentas-vencidas/[id]',
  '/coordinador/reportes/[id]',
  '/coordinador/rutas/[id]',
  '/creditos-articulos/[id]',
  '/creditos-articulos/[id]/editar',
  '/punto-de-venta/creditos-articulos/[id]',
  '/reportes/financieros/detalle/[id]',
  '/supervisor/clientes/[id]',
  '/supervisor/clientes/[id]/editar',
  '/supervisor/cuentas-mora/[id]',
  '/supervisor/cuentas-vencidas/[id]',
  '/supervisor/pagos/registrar/[clienteId]',
  '/supervisor/rutas/[id]',
] as const
