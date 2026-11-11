/**
 * Cómo se llama un permiso cuando se le habla a una persona.
 *
 * La pantalla de acceso restringido decía «Permiso requerido: CONTABLE_VIEW»,
 * y eso no significa nada para quien usa el sistema: ni le dice qué módulo es
 * ni qué pedirle a su administrador. El cobrador que abre por error la pantalla
 * del contador se queda mirando una palabra en inglés y en mayúsculas.
 *
 * Los nombres no están inventados aquí: son los que el propio sistema ya tiene
 * guardados en la tabla de permisos, columna `nombre` —«Ver Módulo Contable»,
 * «Ver Cuentas Vencidas»—. Se copian en el frontend en vez de pedirlos al
 * servidor porque el caso de uso es justo el contrario: se necesita el nombre
 * del permiso que la persona NO tiene, y la sesión solo trae los que sí.
 * Pedirlo costaría una petición más en una pantalla que es un callejón sin
 * salida.
 *
 * Si algún día se añade un permiso y no se agrega aquí, no se rompe nada: se
 * muestra el código convertido a algo legible. Peor que el nombre de verdad,
 * mejor que `CONTABLE_VIEW`.
 */

/** Los nombres tal como están en la tabla `permisos`, columna `nombre`. */
const NOMBRES: Record<string, string> = {
  ARTICULOS_VIEW: 'Ver Artículos',
  AUDIT_VIEW: 'Ver Auditoría',
  CONTABLE_VIEW: 'Ver Módulo Contable',
  CREDITOS_ARTICULOS_VIEW: 'Ver Créditos de Artículos',
  CUENTAS_VENCIDAS_VIEW: 'Ver Cuentas Vencidas',
  REPORTES_FINANCIEROS_VIEW: 'Ver Reportes Financieros',
}

/**
 * El nombre legible de un permiso, o una versión presentable de su código.
 *
 * La conversión de respaldo quita el sufijo técnico y baja las mayúsculas:
 * `REPORTES_FINANCIEROS_VIEW` queda «Reportes financieros». No intenta ser
 * elegante, solo dejar de gritar en inglés.
 */
export function nombreDePermiso(permiso: string | null | undefined): string {
  if (!permiso) return 'un permiso que no tienes'

  const conocido = NOMBRES[permiso]
  if (conocido) return conocido

  const legible = permiso
    .replace(/_(VIEW|READ|LIST|CREATE|UPDATE|DELETE|MANAGE)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()

  if (!legible) return permiso
  return legible.charAt(0).toUpperCase() + legible.slice(1)
}
