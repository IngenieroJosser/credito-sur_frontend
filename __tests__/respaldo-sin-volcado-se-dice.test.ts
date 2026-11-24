import fs from 'fs'
import path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Un respaldo sin volcado SQL no puede decir solamente «EXITOSO».
 *
 * ── Lo que pasaba ──────────────────────────────────────────────────────────
 *
 * `POST /backup/run` devuelve `estado: 'EXITOSO'` cuando el Excel se generó: el
 * volcado SQL es opcional **a propósito**, y así está escrito en
 * `backup.service.ts` («El backup es EXITOSO si el Excel se generó. El dump SQL
 * es opcional»). No es un descuido del backend.
 *
 * El problema era la pantalla. Medido con `pg_dump` ausente —que es el caso de
 * Render, donde no viene por defecto— la respuesta real fue:
 *
 *     estado:   "EXITOSO"
 *     filePath: null
 *     fileSize: null
 *     error:    "[pg_dump no disponible] No se encontró pg_dump…"
 *     metadata.artifacts.dump.skipped: true
 *
 * …y la pantalla mostraba «Estado: EXITOSO» y **nunca pintaba `error`**, aunque
 * lo recibía y lo tenía tipado (`error?: string | null`). O sea que decía que el
 * respaldo estaba hecho mientras faltaba justo la parte con la que se restaura
 * la base. Un `.xlsx` de las tablas no restaura PostgreSQL.
 *
 * En un sistema que va a guardar la cartera real de una financiera, «tienes
 * respaldo» es la frase más cara de equivocar.
 *
 * ── Por qué una prueba que lee el archivo ─────────────────────────────────
 *
 * Es una pantalla de 500 líneas con estado, paginación y descargas; montarla
 * para comprobar que un aviso se pinta costaría más de lo que vigila. Lo que no
 * puede volver es que el campo se tire.
 *
 * Las otras dos rutas (`/cobranzas/backups` y `/contador/backups`) son
 * re-exportaciones de siete líneas de esta misma pantalla, así que esto las
 * cubre: se comprueba también que sigan siéndolo.
 */
const RAIZ = process.cwd()
const PANTALLA = path.join(RAIZ, 'app', 'admin', 'sistema', 'backups', 'page.tsx')
const FUENTE = sinComentarios(fs.readFileSync(PANTALLA, 'utf8'))

describe('la pantalla de respaldos dice cuando falta el volcado', () => {
  it('pinta el aviso que manda el servidor', () => {
    // El campo llegaba y se descartaba. Lo que se exige es que se renderice.
    expect(FUENTE).toMatch(/lastRun\?\.error/)
  })

  it('distingue un EXITOSO sin volcado', () => {
    // `filePath` es la ruta del dump: en `null` cuando `pg_dump` no estaba.
    expect(FUENTE).toMatch(/estado === 'EXITOSO'/)
    expect(FUENTE).toMatch(/!lastRun\?\.filePath/)
  })

  it('y lo dice junto al estado, no en un sitio donde no se mire', () => {
    const i = FUENTE.indexOf('Estado:')
    expect(i).toBeGreaterThan(0)
    // En el mismo bloque: si el aviso se fuera a otra tarjeta, «EXITOSO»
    // seguiría leyéndose solo.
    expect(FUENTE.slice(i, i + 900)).toMatch(/sinVolcado/)
  })

  it('nombra PG_DUMP_PATH, que es lo que hay que configurar', () => {
    // Sin esto el aviso dice que algo falta y no dice qué hacer.
    expect(FUENTE).toContain('PG_DUMP_PATH')
  })
})

describe('las otras dos rutas de respaldos siguen siendo la misma pantalla', () => {
  it.each([
    ['cobranzas', path.join(RAIZ, 'app', 'cobranzas', 'backups', 'page.tsx')],
    ['contador', path.join(RAIZ, 'app', 'contador', 'backups', 'page.tsx')],
  ])('%s re-exporta la del admin', (_rol, ruta) => {
    const fuente = fs.readFileSync(ruta, 'utf8')

    expect(fuente).toContain('@/app/admin/sistema/backups/page')
    // Si alguna se convirtiera en copia, este arreglo dejaría de cubrirla y
    // habría que hacerlo tres veces: es la deuda de §P8.
    expect(fuente.split('\n').length).toBeLessThan(15)
  })
})
