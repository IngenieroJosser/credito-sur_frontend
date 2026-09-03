/**
 * Content-Security-Policy (defensa en profundidad).
 *
 * Vive en su propio módulo, sin depender de `next/server`, para que se pueda
 * comprobar en las pruebas: la parte delicada es que 'unsafe-eval' no se cuele
 * en producción, y eso hay que poder verificarlo.
 *
 * NO usa nonce/strict-dynamic: esta app es una PWA offline-first con paginas
 * prerenderizadas en build (shell estatico), y un nonce por-peticion no se
 * puede inyectar en HTML estatico sin forzar render dinamico, lo que romperia
 * el offline. Se comprobo levantando el server: con strict-dynamic los scripts
 * de Next quedaban sin nonce y el navegador los bloqueaba (app en blanco).
 *
 * Lo que SI protege esta CSP:
 *  - connect-src: la exfiltracion de datos solo puede ir al backend/servicios
 *    permitidos, no a un dominio del atacante (mitigacion real anti-robo).
 *  - script-src 'self' 'unsafe-inline': bloquea cargar scripts externos de
 *    otros dominios (p. ej. <script src=evil.com>). No bloquea inline, pero no
 *    hay ningun XSS inline en el codigo (React escapa por defecto).
 *  - object-src 'none', base-uri 'self', frame-ancestors, form-action:
 *    clickjacking, inyeccion de <base>, y envio de formularios a terceros.
 *
 * Si algo se rompe al probar (p. ej. el service worker de la PWA), pon
 * CSP_REPORT_ONLY = true: la CSP pasa a "solo informar" (no bloquea nada, solo
 * registra violaciones en la consola). Diagnosticas, ajustas orígenes, y lo
 * vuelves a false para que proteja de verdad.
 */
export const CSP_REPORT_ONLY = false;

const BACKEND = 'https://credito-sur-backend.onrender.com';
const BACKEND_WS = 'wss://credito-sur-backend.onrender.com';
const BACKEND_ALT = 'https://credito-sur-frontend.onrender.com';

/**
 * En desarrollo hace falta 'unsafe-eval'.
 *
 * La recarga en caliente de Next (Fast Refresh) evalúa código en tiempo de
 * ejecución, y sin este permiso el navegador la bloquea: la consola se llena de
 * EvalError y los cambios dejan de reflejarse sin recargar a mano.
 *
 * Se limita a desarrollo a propósito: en producción no existe la recarga en
 * caliente, y permitir 'unsafe-eval' allí abriría la puerta a ejecutar como
 * código cualquier texto que llegara a entrar en la página.
 */
/**
 * El entorno entra por parametro, con el real por defecto.
 *
 * No se lee `process.env.NODE_ENV` dentro de la funcion porque el compilador lo
 * sustituye por su valor literal al construir: quedaria fijado y no habria
 * forma de comprobar en las pruebas que produccion NO lleva 'unsafe-eval', que
 * es justo lo que hay que garantizar.
 */
export function construirCsp(entorno: string | undefined = process.env.NODE_ENV): string {
  const evaluar = entorno !== 'production' ? " 'unsafe-eval'" : '';

  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${evaluar};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https://res.cloudinary.com https:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' ${BACKEND} ${BACKEND_WS} ${BACKEND_ALT} https://fcm.googleapis.com https://res.cloudinary.com http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*;
    worker-src 'self' blob:;
    manifest-src 'self';
    media-src 'self' https://res.cloudinary.com data: blob:;
    frame-ancestors 'self';
    base-uri 'self';
    form-action 'self';
    object-src 'none';

  `
    .replace(/\s{2,}/g, ' ')
    .trim();
}
