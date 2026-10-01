import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { PANTALLAS_ESTATICAS } from './pantallas.generado'
import {
  entrarComo,
  hayPantallaDeError,
  textoSospechoso,
  USUARIOS,
  vigilar,
  type Hallazgo,
  type Rol,
} from './sesion'

/**
 * Las 112 pantallas del sistema, visitadas con cada uno de los siete roles.
 *
 * Qué comprueba cada visita, y por qué cada cosa:
 *
 *  - Que el servidor NO devuelva 5xx. Una pantalla que no compila da 500, y el síntoma en
 *    el navegador —un título vacío— no se parece en nada a la causa. Pasó de verdad: un
 *    byte no UTF-8 en `lib/rutas-core.ts` tumbaba la app entera.
 *  - Que no salga la pantalla de error de Next.
 *  - Que no haya excepciones sin capturar ni errores de consola. En esta app un
 *    "undefined is not a function" es el síntoma de leer un campo con el nombre que el
 *    endpoint no manda.
 *  - Que no se pinte `NaN`, `undefined` ni `[object Object]`. Es el error más repetido del
 *    sistema: la pantalla lee el campo del OTRO endpoint y un `|| 0` lo absorbe… o no.
 *
 * Lo que NO comprueba, y se dice para no prometer de más: que cada pantalla muestre la
 * cifra correcta. Eso pide saber qué espera cada una, y va en pruebas de su propio flujo.
 * Esto es la red que atrapa que algo se rompió al entrar.
 *
 * Una pantalla a la que el rol no tiene acceso se considera CORRECTA si redirige o avisa:
 * lo que se exige es que no reviente. El informe dice cuál hizo cada cosa.
 */

const ROLES = Object.keys(USUARIOS) as Rol[]

/** Pantallas que se saltan, con el motivo escrito. */
const EXCLUIDAS = new Map<string, string>([
  ['/test', 'pantalla de pruebas del propio desarrollo, no es del sistema'],
  ['/logout', 'cierra la sesión y deja al resto del recorrido sin ella'],
])

for (const rol of ROLES) {
  test.describe(`Pantallas con rol ${rol}`, () => {
    test(`las ${PANTALLAS_ESTATICAS.length} pantallas cargan sin romperse`, async ({
      page,
    }) => {
      test.setTimeout(20 * 60_000)

      await entrarComo(page, rol)

      const hallazgos: Hallazgo[] = []
      const recorrido = vigilar(page, 'global')
      let limitados = 0
      page.on('response', (r) => {
        if (r.status() === 429) limitados += 1
      })
      const resumen: Array<{ pantalla: string; estado: string }> = []

      for (const pantalla of PANTALLAS_ESTATICAS) {
        if (EXCLUIDAS.has(pantalla)) continue

        const antes = recorrido.length
        let codigo = 0
        try {
          const respuesta = await page.goto(pantalla, {
            waitUntil: 'domcontentloaded',
          })
          codigo = respuesta?.status() ?? 0
        } catch (error) {
          hallazgos.push({
            pantalla,
            tipo: 'navegacion',
            detalle: String((error as Error).message).slice(0, 200),
          })
          continue
        }

        // Da tiempo a que el primer render pida sus datos y pinte.
        await page.waitForTimeout(600)

        if (codigo >= 500) {
          hallazgos.push({ pantalla, tipo: `http ${codigo}`, detalle: 'el servidor falló' })
        }

        if (await hayPantallaDeError(page)) {
          hallazgos.push({
            pantalla,
            tipo: 'pantalla de error',
            detalle: 'Next mostró su error en vez de la aplicación',
          })
        }

        for (const problema of await textoSospechoso(page)) {
          hallazgos.push({ pantalla, tipo: 'texto', detalle: problema })
        }

        // Los errores que la vigilancia global capturó durante ESTA pantalla.
        for (const h of recorrido.slice(antes)) {
          hallazgos.push({ ...h, pantalla })
        }

        const url = new URL(page.url())
        resumen.push({
          pantalla,
          estado:
            url.pathname === pantalla
              ? 'cargó'
              : `redirigió a ${url.pathname}`,
        })
      }

      // El informe sale siempre, pase o falle: es lo que deja ver qué pantallas
      // redirigen por permisos y cuáles se atendieron de verdad.
      const cargaron = resumen.filter((r) => r.estado === 'cargó').length
      console.log(
        `[${rol}] ${cargaron} pantallas cargaron, ${resumen.length - cargaron} redirigieron, ${limitados} respuestas 429`,
      )
      for (const r of resumen.filter((x) => x.estado !== 'cargó')) {
        console.log(`  · ${r.pantalla} → ${r.estado}`)
      }

      // El detalle completo va a un archivo: en consola solo cabe el resumen, y el
      // informe entero es lo que sirve para arreglar.
      mkdirSync('test-results', { recursive: true })
      writeFileSync(
        `test-results/hallazgos-${rol}.json`,
        JSON.stringify({ rol, resumen, hallazgos }, null, 1),
      )

      const texto = hallazgos
        .map((h) => `  ${h.pantalla} [${h.tipo}] ${h.detalle}`)
        .join('\n')
      expect(hallazgos, `Problemas con rol ${rol}:\n${texto}`).toEqual([])
    })
  })
}
