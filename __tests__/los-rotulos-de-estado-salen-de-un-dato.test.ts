import fs from 'fs'
import path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Un rótulo de estado tiene que salir de un dato, no estar escrito a mano.
 *
 * ── De dónde sale esta prueba ─────────────────────────────────────────────
 *
 * La pantalla de respaldos decía «Nube VPS · Respaldo remoto · **Conectado**»
 * con un punto verde parpadeando, y no había ninguna nube: el enum
 * `BackupDestino` tiene un solo valor, `LOCAL`, y nada en el backend sube un
 * archivo a ningún sitio. Era texto fijo afirmando algo que nadie comprobaba.
 *
 * Después de arreglarlo se barrió el resto de la interfaz buscando el mismo
 * patrón —palabras de estado como texto literal dentro del marcado, sin
 * `{...}`— sobre los 471 archivos `.tsx`. Salieron **tres**:
 *
 *   1. `app/login/page.tsx` — un punto verde con «En línea», marcado en el
 *      propio código como «(Decorativo)». En la pantalla de entrar: si el
 *      servidor está caído, quien no puede entrar lee «En línea» y concluye
 *      que falla su contraseña.
 *   2. `app/admin/sistema/backups/page.tsx` — «Activo» junto a «Servidor
 *      Local»: si `GET /backup/status` fallaba, salía el error y a su derecha
 *      un punto verde diciendo que todo bien.
 *   3. `components/push/PushNotificationManager.tsx` — «Activo», pero ese
 *      **ya estaba bien**: va dentro de `{isSubscribed && …}`. No se tocó.
 *
 * Dos de tres eran reales. Esta prueba vigila que no vuelvan.
 */
const RAIZ = process.cwd()

const leer = (...partes: string[]) =>
  sinComentarios(fs.readFileSync(path.join(RAIZ, ...partes), 'utf8'))

const LOGIN = leer('app', 'login', 'page.tsx')
const BACKUPS = leer('app', 'admin', 'sistema', 'backups', 'page.tsx')

describe('el indicador de la pantalla de entrar dice la verdad', () => {
  it('no es decorativo: sale del estado real de la conexión', () => {
    // Piso: si el archivo no se leyera, todo lo de abajo pasaría en vacío.
    expect(LOGIN.length).toBeGreaterThan(10_000)

    expect(LOGIN).toMatch(/useOnlineStatus/)
    expect(LOGIN).toMatch(/const estaEnLinea = useOnlineStatus\(\)/)
  })

  it('y cuando no hay conexión lo dice, en vez de seguir en verde', () => {
    /*
     * Es la mitad que importa: un indicador que solo sabe decir «En línea» no
     * es un indicador. Y aquí abajo está el botón de acceso sin conexión, así
     * que saberlo sirve para algo.
     */
    expect(LOGIN).toMatch(/Sin conexi[oó]n/)
    expect(LOGIN).toMatch(/estaEnLinea \? 'En l[ií]nea' : 'Sin conexi[oó]n'/)
  })

  it('ya no queda el punto verde fijo', () => {
    // El marcado de antes: `<div className="w-1.5 h-1.5 bg-green-400 ...">`
    // sin condición ninguna.
    expect(LOGIN).not.toMatch(/w-1\.5 h-1\.5 bg-green-400/)
  })
})

describe('la pantalla de respaldos no afirma estados que no comprueba', () => {
  it('«Activo» sale del estado que mandó el servidor', () => {
    expect(BACKUPS.length).toBeGreaterThan(10_000)
    expect(BACKUPS).toMatch(/status \? 'Activo'/)
  })

  it('y no hay un punto verde incondicional', () => {
    /*
     * Había dos: el de «Servidor Local» y el de la «Nube VPS» inventada. El
     * segundo se fue con la tarjeta; este queda condicionado.
     */
    expect(BACKUPS).not.toMatch(
      /className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/,
    )
  })
})
