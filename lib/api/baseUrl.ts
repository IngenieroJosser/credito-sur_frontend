/**
 * De dónde sale la URL del backend. Un solo sitio.
 *
 * Había ocho archivos calculándola por su cuenta, y no coincidían: unos caían
 * al backend de Render cuando `NEXT_PUBLIC_BASE_URL` faltaba, y otros a
 * `http://localhost:3001` o `http://127.0.0.1:3001`. Mientras la variable esté
 * puesta no se nota nada; el día que falte —un despliegue nuevo, una rama de
 * pruebas— unas pantallas funcionan y otras buscan un servidor que no existe
 * en esa máquina, y el fallo no se parece en nada a su causa.
 *
 * Además cada uno pegaba el prefijo `/api-credisur` a su manera. Aquí se
 * normaliza una vez: si la URL configurada ya lo trae, no se duplica.
 *
 * El `failover` a la LAN de la oficina NO vive aquí: es cosa de apiClient, que
 * es quien tiene que decidir a qué servidor reintenta una petición.
 */

const PREFIJO_API = '/api-credisur';

/** Backend por defecto cuando no hay variable configurada. */
const POR_DEFECTO =
  process.env.NODE_ENV === 'production'
    ? 'https://credito-sur-backend.onrender.com'
    : 'http://127.0.0.1:3001';

const sinBarraFinal = (url: string) => url.replace(/\/+$/, '');

/**
 * Raíz del backend, sin el prefijo de la API.
 *
 * Es lo que necesita quien no habla con la API REST: el socket de
 * notificaciones, por ejemplo, que se conecta a la raíz.
 */
export function raizBackend(): string {
  const configurada = process.env.NEXT_PUBLIC_BASE_URL || POR_DEFECTO;
  return sinBarraFinal(configurada).replace(
    new RegExp(`${PREFIJO_API}$`),
    '',
  );
}

/** Añade el prefijo de la API a una URL cualquiera, sin duplicarlo. */
export function conPrefijoApi(url: string): string {
  const base = sinBarraFinal(url);
  return base.endsWith(PREFIJO_API) ? base : `${base}${PREFIJO_API}`;
}

/** Raíz de la API REST: la raíz del backend más `/api-credisur`. */
export function baseApi(): string {
  return conPrefijoApi(raizBackend());
}
