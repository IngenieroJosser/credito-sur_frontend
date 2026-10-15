import { request } from '@playwright/test'

/**
 * Pide /login una vez antes de que corra la primera prueba.
 *
 * `next dev` compila cada ruta la PRIMERA vez que alguien la pide, y en esta app
 * eso puede pasar del minuto. Sin este calentamiento la primera prueba se come la
 * compilación y falla por eso, no por la pantalla: con el servidor frío fallaban
 * las tres y con el ya caliente pasaban las tres, sobre el mismo código.
 *
 * Se ignora cualquier fallo a propósito: si la app no arranca, que lo diga la
 * prueba con su mensaje y su captura, no este archivo.
 */
export default async function calentar() {
  const base = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PUERTO || 3000}`
  const contexto = await request.newContext({ baseURL: base })
  try {
    await contexto.get('/login', { timeout: 180_000 })
  } catch {
    // Silencio deliberado: ver el comentario de arriba.
  } finally {
    await contexto.dispose()
  }
}
