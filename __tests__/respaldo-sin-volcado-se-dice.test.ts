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
    /*
     * El ancla cambió, y el motivo importa.
     *
     * Antes se miraba la cercanía a «Estado:», que era la etiqueta de la
     * tarjeta «Nube VPS». Esa tarjeta estaba INVENTADA —no hay destino remoto
     * en el sistema— y se quitó, así que ahora el estado del respaldo se lee
     * en la tarjeta del servidor local, junto al tamaño.
     *
     * Lo que vigila esta prueba no cambia: que el aviso esté donde se mira el
     * respaldo y no en otra tarjeta.
     */
    const i = FUENTE.indexOf('Último respaldo')
    expect(i).toBeGreaterThan(0)
    expect(FUENTE.slice(i, i + 1600)).toMatch(/sinVolcado/)
    expect(FUENTE.slice(i, i + 1600)).toMatch(/pgDumpDisponible|noHayPgDump/)
  })

  it('nombra PG_DUMP_PATH, que es lo que hay que configurar', () => {
    // Sin esto el aviso dice que algo falta y no dice qué hacer.
    expect(FUENTE).toContain('PG_DUMP_PATH')
  })
})

describe('y lo dice ANTES de que haga falta, sin correr un respaldo', () => {
  /*
   * El aviso de arriba depende de `lastRun`: solo aparece despues del primer
   * respaldo. El caso real es el contrario —una instalacion nueva dice «Sin
   * respaldos» y no avisa de nada— asi que el dueño se enteraria el dia que
   * necesite restaurar.
   *
   * Ahora el servidor ejecuta `pg_dump --version` al pedir el estado
   * (`GET /backup/status` → `config.pgDumpDisponible`) y la pantalla lo pinta.
   * Esto es lo que contestaria la consola de Render, que es de pago.
   */
  it('lee la comprobacion real del servidor', () => {
    expect(FUENTE).toMatch(/pgDumpDisponible/)
  })

  it('la compara con `=== false`, no con una negacion', () => {
    /*
     * Mientras el estado carga el campo es `undefined`, y `!undefined` es
     * `true`: con una negacion la alarma se pintaria en cada recarga, incluso
     * en un servidor que si tiene pg_dump. Un aviso que sale siempre deja de
     * leerse.
     */
    expect(FUENTE).toMatch(/pgDumpDisponible === false/)
    expect(FUENTE).not.toMatch(/!status\?\.config\?\.pgDumpDisponible/)
  })

  it('el aviso cuenta la consecuencia, no solo que falta algo', () => {
    const i = FUENTE.indexOf('noHayPgDump ?')
    expect(i).toBeGreaterThan(0)
    const bloque = FUENTE.slice(i, i + 900)
    // Piso: si el recorte sale corto la prueba mira casi nada.
    expect(bloque.length).toBeGreaterThan(400)
    expect(bloque).toMatch(/no se restaura|con el que se restaura|restaura/i)
    expect(bloque).toContain('PG_DUMP_PATH')
  })

  it('y cuando SI esta, lo dice en vez de callar', () => {
    // Sin esto la pantalla no distingue «comprobado y esta» de «no se sabe».
    expect(FUENTE).toMatch(/pgDumpVersion/)
  })
})

describe('la pantalla no inventa una copia remota', () => {
  /*
   * La tarjeta decia «Nube VPS · Respaldo remoto · Conectado», con un punto
   * verde parpadeando y un escudo, y bajo «Ultima sincronizacion» repetia la
   * fecha del respaldo LOCAL.
   *
   * Nada de eso existia. Comprobado en el codigo del backend: el enum
   * `BackupDestino` tiene **un solo valor**, `LOCAL`, y no hay en todo el
   * modulo de respaldos una linea que suba un archivo a ningun sitio —ni S3,
   * ni SFTP, ni VPS—. La pantalla le decia al dueño que tenia una copia fuera
   * del servidor de su financiera cuando no la tiene, y encima el disco de
   * Render es efimero.
   *
   * En una pantalla de respaldos esa es la frase mas cara de equivocar.
   */
  it('no dice que hay una nube ni un respaldo remoto', () => {
    expect(FUENTE).not.toMatch(/Nube VPS/)
    expect(FUENTE).not.toMatch(/Respaldo remoto/)
    expect(FUENTE).not.toMatch(/[ÚU]ltima sincronizaci[oó]n/)
  })

  it('no pinta un «Conectado» en verde que no corresponde a nada', () => {
    expect(FUENTE).not.toMatch(/Conectado/)
  })

  it('dice donde queda de verdad el respaldo', () => {
    expect(FUENTE).toMatch(/Solo en el disco de este servidor/)
    // La ruta real, no una inventada: la manda el servidor en `config`.
    expect(FUENTE).toMatch(/config\?\.backupDir/)
  })

  it('advierte de que el disco es efimero', () => {
    /*
     * Es lo unico que de verdad hay que saber: el archivo desaparece en cada
     * despliegue, asi que o se descarga en el momento o no hay copia.
     */
    expect(FUENTE).toMatch(/ef[ií]mero/)
    expect(FUENTE).toMatch(/descargarla|descargar/)
  })

  it('y dice cual es el plan de recuperacion real', () => {
    // Las copias automaticas del Postgres administrado de Render.
    expect(FUENTE).toContain('copias')
    expect(FUENTE).toMatch(/autom[aá]ticas/)
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
