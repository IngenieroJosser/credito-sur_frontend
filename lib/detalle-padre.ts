/**
 * Utilidades para el "cold-start" offline: cuando un F5 sin conexión cae en una
 * vista de detalle `[id]` nunca cacheada, calculamos su LISTA PADRE (una página
 * estática que sí renderiza offline) para reenviar al usuario allí en vez de
 * dejarlo en la pantalla de contingencia.
 */

/** ¿Un segmento de ruta parece un id (uuid, token largo o id temporal offline)? */
export const pareceId = (seg: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) ||
  /^[a-z0-9]{16,}$/i.test(seg) ||
  seg.startsWith('temp-');

const ACCIONES_NO_LISTA = new Set(['registrar', 'nuevo', 'nueva', 'crear']);

/**
 * A partir de la URL que se intentó abrir, devuelve la lista padre de una vista
 * de detalle, o null si no parece un detalle con lista padre navegable.
 *   /coordinador/clientes/<id>         -> /coordinador/clientes
 *   /coordinador/clientes/<id>/editar  -> /coordinador/clientes
 *   /supervisor/pagos/registrar/<id>   -> null (no es lista)
 *   /coordinador/clientes              -> null (ya es lista)
 */
export const listaPadreDeDetalle = (pathname: string): string | null => {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length < 2) return null;

  // Ignorar el sufijo de acción "editar" (el id está justo antes).
  let fin = segs.length;
  if (segs[fin - 1] === 'editar') fin -= 1;

  const ultimo = segs[fin - 1];
  if (!ultimo || !pareceId(ultimo)) return null; // no es un detalle [id]

  const padreSegs = segs.slice(0, fin - 1);
  if (padreSegs.length < 1) return null;
  // El padre debe ser una lista, no una acción como ".../registrar".
  if (ACCIONES_NO_LISTA.has(padreSegs[padreSegs.length - 1])) return null;

  return '/' + padreSegs.join('/');
};
