/**
 * GET /api/ping
 *
 * Sonda de conectividad real, y de paso la unica forma de saber desde fuera QUE
 * version del frontend esta publicada.
 *
 * ── Lo primero ────────────────────────────────────────────────────────────
 *
 * Endpoint ultra-ligero para verificar conectividad real con internet, no
 * `navigator.onLine`. Lo usa `checkRealConnectivity()` y el service worker lo
 * deja pasar SIEMPRE a la red a proposito (`next.config.ts`).
 *
 * ── Lo segundo, agregado el 2026-11-24 ────────────────────────────────────
 *
 * Ese dia un build del backend fallo y produccion siguio sirviendo el codigo
 * anterior **sin que nada lo dijera**. El riesgo aqui es el mismo: si un build
 * de Vercel falla, el sitio de antes se queda en pie y parece que todo fue
 * bien. `VERCEL_GIT_COMMIT_SHA` lo pone Vercel; se publica abreviado a siete
 * caracteres, como `git log --oneline`, que es lo que hace falta para
 * compararlo con el repo.
 *
 * `checkRealConnectivity()` solo lee `response.ok` y no toca el cuerpo
 * -comprobado-, asi que el campo es aditivo. Y se calcula una vez al cargar el
 * modulo, no en cada peticion, porque esta sonda se llama a menudo.
 */
import { NextResponse } from 'next/server';

const COMMIT = (
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GIT_COMMIT ??
  ''
).slice(0, 7);

const SIN_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function GET() {
  return NextResponse.json(
    // Cadena vacia fuera de Vercel (local, pruebas): se informa `null` para que
    // nadie lea '' como un commit valido.
    { ok: true, commit: COMMIT || null },
    { status: 200, headers: SIN_CACHE },
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: SIN_CACHE });
}
