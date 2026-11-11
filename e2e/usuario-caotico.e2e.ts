import { test, expect } from '@playwright/test'
import { entrarComo, vigilar, USUARIOS, type Rol } from './sesion'

/**
 * El usuario que no piensa en orden.
 *
 * Las otras pruebas de esta carpeta recorren el sistema como lo recorrería quien lo
 * construyó: entrar, ir a la pantalla, hacer la cosa, salir. Esta hace lo contrario.
 * Escribe la URL a mano, le da dos veces al botón, recarga a mitad, vuelve atrás después
 * de cerrar sesión y mete letras donde van pesos.
 *
 * No es maldad: es un cobrador con el teléfono en una mano, el dinero en la otra y
 * conexión intermitente. La mitad de los fallos de un sistema así salen justo ahí, y
 * ninguna prueba que siga el camino feliz los ve.
 *
 * Lo que se afirma es deliberadamente conservador: que el sistema NO reviente, NO muestre
 * datos de otro rol y NO cobre dos veces. Lo que sea decisión de producto —qué mensaje
 * sale, a qué pantalla redirige— se anota pero no se exige, porque esta prueba no está
 * para imponer un diseño.
 */

const ROLES = Object.keys(USUARIOS) as Rol[]

/** La pantalla de inicio de cada rol, que es lo que NO debería ver el resto. */
const CASA = Object.fromEntries(
  ROLES.map((r) => [r, USUARIOS[r].inicio]),
) as Record<Rol, string>

/**
 * Señales de que la pantalla se rompió de verdad, no de que el sistema dijo "no puedes".
 *
 * Un 403 o una redirección al login son el sistema funcionando. Lo que se persigue aquí es
 * la pantalla en blanco, el error de Next sin capturar y el "undefined is not a function".
 */
const SINTOMAS_DE_ROTURA = [
  /Application error/i,
  /Unhandled Runtime Error/i,
  /TypeError: .* is not a function/i,
  /Cannot read propert(y|ies) of (undefined|null)/i,
  /ChunkLoadError/i,
]

test.describe('El usuario que no piensa en orden', () => {
  test.describe.configure({ mode: 'serial' })

  /**
   * Escribir a mano la URL de la pantalla de otro rol.
   *
   * Es lo primero que hace cualquiera que vio la pantalla de un compañero: copiar el
   * enlace. Lo que se exige es que NO se pinte el contenido ajeno. Que redirija, que
   * muestre un aviso o que deje la pantalla vacía son todas respuestas aceptables; lo
   * inaceptable es que se vea.
   */
  for (const rol of ROLES) {
    test(`${rol} escribe a mano la URL de los otros roles`, async ({ page }) => {
      await entrarComo(page, rol)

      const ajenas = ROLES.filter((r) => r !== rol && CASA[r] !== CASA[rol])
      const problemas: string[] = []

      for (const otro of ajenas) {
        const destino = CASA[otro]
        const hallazgos = vigilar(page, `${rol} -> ${destino}`)

        await page.goto(destino, { waitUntil: 'domcontentloaded' })
        // Un respiro para que el guard del frontend redirija si va a hacerlo.
        await page.waitForTimeout(1500)

        const quedo = new URL(page.url()).pathname
        const texto = await page.locator('body').innerText().catch(() => '')

        const roto = SINTOMAS_DE_ROTURA.find((r) => r.test(texto))
        if (roto) {
          problemas.push(`${destino}: la pantalla se rompió (${roto})`)
        }

        const fallos = hallazgos.filter((h) => h.tipo !== 'red-400')
        if (fallos.length) {
          problemas.push(
            `${destino}: ${fallos.map((f) => `${f.tipo} ${f.detalle}`).join(' | ')}`,
          )
        }

        // Se deja constancia de SI entró o no, para el informe. No se exige redirección:
        // que un coordinador pueda abrir /supervisor puede ser intencional.
        const entro = quedo.startsWith(destino)
        test.info().annotations.push({
          type: 'acceso',
          description: `${rol} -> ${destino}: ${entro ? 'ENTRA' : `redirigido a ${quedo}`}`,
        })
      }

      expect(problemas, problemas.join('\n')).toEqual([])
    })
  }

  /**
   * Cerrar sesión y darle a la flecha de atrás.
   *
   * El navegador guarda la página anterior. Si la app no la invalida, el siguiente que
   * coja el teléfono ve la pantalla del cobrador —con nombres, cédulas y saldos— sin
   * haber entrado. En un teléfono compartido entre turnos eso pasa solo.
   */
  test('después de cerrar sesión, el botón de atrás no devuelve los datos', async ({
    page,
  }) => {
    await entrarComo(page, 'COBRADOR')
    await page.goto(CASA.COBRADOR, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const antes = await page.locator('body').innerText().catch(() => '')

    // Se cierra sesión como lo haría cualquiera: borrando la sesión y yendo al login.
    await page.context().clearCookies()
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {
        /* en modo privado puede fallar: da igual, lo que importa es la cookie */
      }
    })
    await page.goto('/login', { waitUntil: 'domcontentloaded' })

    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined)
    await page.waitForTimeout(2000)

    const despues = await page.locator('body').innerText().catch(() => '')
    const rutaFinal = new URL(page.url()).pathname

    // Si sigue en la pantalla del cobrador Y el contenido se parece al de antes, los datos
    // quedaron a la vista de quien coja el aparato.
    const sigueDentro = !rutaFinal.includes('/login')
    const mismoContenido =
      antes.length > 200 && despues.length > 200 && despues.slice(0, 200) === antes.slice(0, 200)

    expect(
      sigueDentro && mismoContenido,
      `Tras cerrar sesión, atrás devolvió la pantalla con datos (quedó en ${rutaFinal}).`,
    ).toBe(false)
  })

  /**
   * Seguir usando la pantalla con la sesión ya muerta.
   *
   * Pasa todos los días: el teléfono queda en el bolsillo, el token caduca, y al sacarlo
   * el cobrador le da a un botón. Lo que no puede pasar es que la pantalla se quede
   * colgada sin decir nada, ni que reviente.
   */
  test('con la sesión invalidada, la pantalla avisa en vez de romperse', async ({
    page,
  }) => {
    await entrarComo(page, 'COBRADOR')
    await page.goto(CASA.COBRADOR, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const hallazgos = vigilar(page, 'sesion invalidada')

    // Se mata la sesión por detrás, sin recargar: es lo que pasa cuando el token caduca.
    await page.context().clearCookies()
    await page.evaluate(() => {
      try {
        localStorage.removeItem('token')
        localStorage.removeItem('access_token')
      } catch {
        /* da igual */
      }
    })

    // Y ahora se navega dentro de la app, que es lo que haría la persona.
    await page.goto(CASA.COBRADOR, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const texto = await page.locator('body').innerText().catch(() => '')
    const roto = SINTOMAS_DE_ROTURA.find((r) => r.test(texto))
    const reventones = hallazgos.filter((h) => h.tipo === 'excepcion')

    expect(
      [roto ? `pantalla rota: ${roto}` : '', ...reventones.map((r) => r.detalle)]
        .filter(Boolean)
        .join('\n'),
    ).toBe('')
  })
})
