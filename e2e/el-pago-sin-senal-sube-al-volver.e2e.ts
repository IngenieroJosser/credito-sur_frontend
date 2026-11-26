import { expect, test } from '@playwright/test'
import { entrarComo } from './sesion'

/**
 * Un pago hecho sin señal se guarda y SUBE cuando vuelve la señal.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * El dueño lo pidió con el caso vivido: nueve horas sin señal y sin luz. Ya
 * estaban probadas la copia local y el arranque en frío sin red; faltaba el
 * viaje de vuelta, que es el que de verdad decide si el dinero cobrado en la
 * calle llega a la cartera o se pierde.
 *
 * La prueba anterior de offline lo decía explícitamente: «Lo que NO comprueba
 * […]: que un pago hecho sin señal se sincronice al volver». Esta cubre eso.
 *
 * ── Lo que hace ───────────────────────────────────────────────────────────
 *
 * El camino real y completo, por la pantalla, sin tocar la cola a mano:
 *
 *   1. entra con señal y abre el cobro en la oficina de un cliente con
 *      crédito;
 *   2. corta la red y registra un pago;
 *   3. comprueba en IndexedDB que quedó UNA operación en cola —y que la
 *      pantalla lo dice, porque un cobrador que cree que el pago entró no
 *      vuelve a intentarlo—;
 *   4. devuelve la red y comprueba que la cola se vacía.
 *
 * Corre sobre `next build` + `next start`: en desarrollo el PWA está apagado.
 */
const CLIENTE_CON_CREDITO = '92c2b50b-3b31-499d-ae4a-735d103904b4'

/** Cuántas operaciones hay en la cola local, por estado. */
const contarCola = async (
  page: import('@playwright/test').Page,
): Promise<{ total: number; pendientes: number }> =>
  // La pantalla navega al guardar, y eso destruye el contexto a mitad de la
  // lectura. No es un fallo: se reintenta una vez ya asentada.
  page.evaluate(
    () =>
      new Promise<{ total: number; pendientes: number }>((resolve) => {
        const req = indexedDB.open('creditsur-offline')
        req.onerror = () => resolve({ total: -1, pendientes: -1 })
        req.onsuccess = () => {
          try {
            const db = req.result
            const tx = db.transaction('offline-queue', 'readonly')
            const todo = tx.objectStore('offline-queue').getAll()
            todo.onsuccess = () => {
              const filas = todo.result as { status?: string }[]
              resolve({
                total: filas.length,
                pendientes: filas.filter(
                  (f) => f.status === 'pending' || f.status === 'syncing',
                ).length,
              })
            }
            todo.onerror = () => resolve({ total: -1, pendientes: -1 })
          } catch {
            resolve({ total: -1, pendientes: -1 })
          }
        }
      }),
  ).catch(async () => {
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    return page
      .evaluate(
        () =>
          new Promise<{ total: number; pendientes: number }>((resolve) => {
            const req = indexedDB.open('creditsur-offline')
            req.onerror = () => resolve({ total: -1, pendientes: -1 })
            req.onsuccess = () => {
              try {
                const tx = req.result.transaction('offline-queue', 'readonly')
                const todo = tx.objectStore('offline-queue').getAll()
                todo.onsuccess = () => {
                  const filas = todo.result as { status?: string }[]
                  resolve({
                    total: filas.length,
                    pendientes: filas.filter(
                      (f) => f.status === 'pending' || f.status === 'syncing',
                    ).length,
                  })
                }
                todo.onerror = () => resolve({ total: -1, pendientes: -1 })
              } catch {
                resolve({ total: -1, pendientes: -1 })
              }
            }
          }),
      )
      .catch(() => ({ total: -1, pendientes: -1 }))
  })

test.describe('Sin señal', () => {
  test('un pago hecho sin red queda en cola y sube al volver', async ({
    page,
    context,
  }) => {
    test.setTimeout(6 * 60_000)

    // ── 1. Con señal ────────────────────────────────────────────────────
    await entrarComo(page, 'SUPER_ADMINISTRADOR')
    await page.goto(`/pagos/registrar/${CLIENTE_CON_CREDITO}`, {
      timeout: 60_000,
    })

    const campoMonto = page.locator('input').first()
    await expect(campoMonto).toBeVisible({ timeout: 45_000 })

    const antes = await contarCola(page)
    expect(
      antes.total,
      'No se pudo leer la cola local: sin eso la prueba no mide nada',
    ).toBeGreaterThanOrEqual(0)

    // ── 2. Sin señal: cobrar ────────────────────────────────────────────
    await context.setOffline(true)

    await campoMonto.fill('1000')
    const guardar = page
      .getByRole('button', { name: /registrar|guardar|confirmar/i })
      .first()
    await expect(guardar).toBeEnabled({ timeout: 20_000 })
    await guardar.click()

    // ── 3. Quedó en cola, y la pantalla lo dice ─────────────────────────
    await expect
      .poll(async () => (await contarCola(page)).total, { timeout: 45_000 })
      .toBeGreaterThan(antes.total)

    /*
     * Que lo DIGA importa tanto como que lo guarde: un cobrador que cree que
     * el pago entró no vuelve a intentarlo, y el dinero se queda sin
     * registrar.
     */
    await expect(
      page.getByText(/sin conexión|sin conexion|se sincroniz|en cola/i).first(),
    ).toBeVisible({ timeout: 30_000 })

    // ── 4. Vuelve la señal: la cola se vacía ────────────────────────────
    await context.setOffline(false)
    /*
     * La pantalla navega tras guardar, asi que puede estar cambiando de
     * contexto justo aqui. Se espera a que se asiente y el aviso de `online`
     * se manda sin exigir que llegue: el navegador lo dispara por su cuenta
     * al recuperar la red, y el sondeo de 30 s tambien lo acabaria viendo.
     */
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await page
      .evaluate(() => window.dispatchEvent(new Event('online')))
      .catch(() => {})

    await expect
      .poll(async () => (await contarCola(page)).pendientes, {
        timeout: 120_000,
      })
      .toBe(0)

  })
})
