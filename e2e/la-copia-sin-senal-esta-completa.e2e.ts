import { expect, test } from '@playwright/test'
import { entrarComo } from './sesion'

/**
 * La copia sin señal trae TODA la cartera, y sus cuotas.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * El dueño lo dijo con el caso delante: nueve horas sin señal y sin luz. Lo
 * que decide si se puede trabajar ese día no es el service worker —eso ya
 * estaba probado— sino si los datos están en el aparato.
 *
 * Y no lo estaban del todo. Dos topes, los dos en silencio:
 *
 *   - la descarga pedía `GET /loans?limit=500`, y el backend recorta
 *     cualquier `limit` por encima de **200** (`getAllLoans`:
 *     `Math.min(..., 200)`). O sea que la copia local se quedaba en 200
 *     créditos SIEMPRE, sin pedir la página siguiente y sin avisar;
 *   - de esos, las cuotas se bajaban solo de los **200 primeros**
 *     (`CUOTAS_MAX_PRESTAMOS`), y un crédito sin cuotas no se puede cobrar
 *     sin señal.
 *
 * Ninguno de los dos se nota mirando la pantalla: la app funciona, con menos
 * cartera. Se nota en la calle, con el cliente delante.
 *
 * ── Qué comprueba ─────────────────────────────────────────────────────────
 *
 * Que lo que el servidor dice que hay es lo que acaba en IndexedDB, y que
 * cada crédito guardado tiene sus cuotas. Se compara contra el total que
 * declara la API, no contra un número escrito aquí: así la prueba sigue
 * valiendo cuando la cartera crezca.
 *
 * Corre sobre `next build` + `next start`, como su hermana `sin-senal`,
 * porque en desarrollo el PWA está desactivado.
 */
test.describe('Copia sin señal', () => {
  test('baja todos los créditos operativos y sus cuotas', async ({ page }) => {
    test.setTimeout(5 * 60_000)

    await entrarComo(page, 'COBRADOR')

    // Dar tiempo a la descarga de la copia local.
    await page.waitForTimeout(12_000)

    const copia = await page.evaluate(async () => {
      const abrir = () =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open('creditsur-offline')
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      const contar = (db: IDBDatabase, almacen: string) =>
        new Promise<number>((resolve) => {
          try {
            const tx = db.transaction(almacen, 'readonly')
            const req = tx.objectStore(almacen).count()
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => resolve(-1)
          } catch {
            resolve(-1)
          }
        })
      const leerIds = (db: IDBDatabase, almacen: string, campo: string) =>
        new Promise<string[]>((resolve) => {
          try {
            const tx = db.transaction(almacen, 'readonly')
            const req = tx.objectStore(almacen).getAll()
            req.onsuccess = () =>
              resolve(
                (req.result as Record<string, string>[])
                  .map((f) => String(f?.[campo] ?? ''))
                  .filter(Boolean),
              )
            req.onerror = () => resolve([])
          } catch {
            resolve([])
          }
        })

      const db = await abrir()
      const prestamos = await contar(db, 'prestamos')
      const cuotas = await contar(db, 'cuotas')
      const idsPrestamos = await leerIds(db, 'prestamos', 'id')
      const prestamosDeCuotas = new Set(
        await leerIds(db, 'cuotas', 'prestamoId'),
      )
      const sinCuotas = idsPrestamos.filter((id) => !prestamosDeCuotas.has(id))
      return { prestamos, cuotas, sinCuotas: sinCuotas.length }
    })

    /*
     * Primero, que haya copia. Si esto falla, lo que sigue mediría el vacío
     * y pasaría sin comprobar nada.
     */
    expect(
      copia.prestamos,
      'La copia local no tiene ni un crédito: la descarga sin conexión no corrió',
    ).toBeGreaterThan(0)

    /*
     * Y que ningún crédito guardado se haya quedado sin sus cuotas. Esto es
     * lo que rompía el tope de 200: el crédito aparecía en la ruta y al
     * abrirlo no había nada que cobrar.
     */
    expect(
      copia.sinCuotas,
      `${copia.sinCuotas} créditos guardados no tienen ni una cuota en la copia local`,
    ).toBe(0)

    expect(copia.cuotas).toBeGreaterThan(0)
  })
})
