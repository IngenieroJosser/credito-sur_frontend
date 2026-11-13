import { expect, test } from '@playwright/test'

/**
 * Que una cifra de dinero no se salga de su tarjeta.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * «Hay que arreglar algunas tarjetas donde se muestran precios porque el
 * precio pues llega a salirse de esas tarjetas.»
 *
 * Medido en Chromium con la tipografía Sora y el marcado real, a 390 px de
 * teléfono y 1440 px de escritorio, con una tarjeta a todo el ancho, dos por
 * fila, tres y cuatro. Las tres formas en que el proyecto pintaba una cifra
 * grande, y en cuántas de las 24 combinaciones de ancho e importe se salía:
 *
 *   `text-3xl font-bold`                       6 de 24
 *   `text-2xl font-bold`                       3 de 24
 *   `whitespace-nowrap` + `clamp(…2.6vw…)`     4 de 24
 *   `Cifra` (lo que hay ahora)                 1 de 24
 *
 * Y no en casos raros: con `text-3xl`, en un móvil con dos tarjetas por fila
 * —123 px de hueco— un préstamo de **$ 900.000** pide 143 px. Con el `clamp`
 * de los reportes financieros se sale **$ 1.170.000**, que es el saldo del
 * préstamo desde el que se reportó.
 *
 * ── Por qué esta prueba no abre la aplicación ───────────────────────────────
 *
 * Porque no hace falta y porque así corre siempre. Lo que está en duda es el
 * CSS: si una cifra de N caracteres cabe en un hueco de M píxeles con la
 * tipografía del proyecto. Eso se mide con el marcado y la fuente, sin
 * servidor, sin base de datos y sin sesión. La prueba que recorre las
 * pantallas de verdad es `pantallas-por-rol`.
 *
 * El límite, dicho: mide las clases que se le dan aquí. Si alguien pinta una
 * cifra con otras, esta prueba no lo ve; eso lo vigila
 * `__tests__/cifras-en-tarjetas.test.ts`, que lee el código.
 */

/** Importes reales del sistema, del más pequeño al tope del campo. */
const IMPORTES: Array<[string, number]> = [
  ['cuota típica', 35_000],
  ['préstamo típico', 900_000],
  ['saldo con interés', 1_170_000],
  ['cartera de una ruta', 48_500_000],
  ['cartera de la empresa', 1_250_000_000],
]

/** Los anchos de hueco que de verdad hay en el sistema. */
const DISPOSICIONES: Array<[string, number, number]> = [
  ['móvil, una tarjeta por fila', 390, 1],
  ['móvil, dos por fila', 390, 2],
  ['escritorio, tres por fila', 1440, 3],
  ['escritorio, cuatro por fila', 1440, 4],
]

/** Los tres tamaños de `Cifra`, con sus clases tal como las genera. */
const TAMANOS: Array<[string, string]> = [
  ['normal', 'text-[clamp(0.875rem,5.5cqw,1.125rem)]'],
  ['grande', 'text-[clamp(1rem,7cqw,1.5rem)]'],
  ['enorme', 'text-[clamp(1rem,8cqw,1.875rem)]'],
]

const PAGINA = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@400;700&display=swap">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; }
  body { font-family: Sora, system-ui, sans-serif; background: #f8fafc; }
  #rejilla { display: grid; gap: 16px; padding: 16px; }
  .tarjeta {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
    padding: 24px; overflow: hidden;
  }
  /* Lo que hace \`Cifra\`: su propio contenedor de consulta. */
  .caja { container-type: inline-size; min-width: 0; }
  .cifra { font-variant-numeric: tabular-nums; line-height: 1.25; font-weight: 700; color: #0f172a; }
</style></head>
<body><div id="rejilla"></div></body></html>`

const enPesos = (n: number) =>
  `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)}`

test.describe('una cifra de dinero cabe en su tarjeta', () => {
  for (const [nombreDisposicion, ancho, columnas] of DISPOSICIONES) {
    test(`${nombreDisposicion}`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 })
      await page.setContent(PAGINA)
      // Que Sora esté cargada antes de medir: con la de respaldo los anchos
      // son otros y la medición no valdría.
      await page.evaluate(() => document.fonts.ready)

      await page.evaluate(
        ({ columnas, tamanos, importes }) => {
          const rejilla = document.getElementById('rejilla')!
          rejilla.style.gridTemplateColumns = `repeat(${columnas}, minmax(0, 1fr))`
          for (const [nombreTamano, clase] of tamanos) {
            for (const [etiqueta, texto] of importes) {
              const tarjeta = document.createElement('div')
              tarjeta.className = 'tarjeta'

              const rotulo = document.createElement('p')
              rotulo.style.cssText =
                'font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase'
              rotulo.textContent = etiqueta

              const caja = document.createElement('div')
              caja.className = 'caja'
              const cifra = document.createElement('p')
              cifra.className = 'cifra'
              // `text-[clamp(...)]` es la clase de Tailwind; lo que importa
              // aquí es el `clamp(...)` de dentro.
              cifra.style.fontSize = clase
                .replace(/^text-\[/, '')
                .replace(/\]$/, '')
              cifra.textContent = texto
              cifra.dataset.tamano = nombreTamano
              cifra.dataset.etiqueta = etiqueta
              caja.append(cifra)
              tarjeta.append(rotulo, caja)
              rejilla.append(tarjeta)
            }
          }
        },
        {
          columnas,
          tamanos: TAMANOS,
          importes: IMPORTES.map(([n, v]) => [n, enPesos(v)] as [string, string]),
        },
      )

      const desbordes = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.cifra')]
          .map((cifra) => {
            const tarjeta = cifra.closest<HTMLElement>('.tarjeta')!
            const estilo = getComputedStyle(tarjeta)
            const hueco =
              tarjeta.getBoundingClientRect().width -
              parseFloat(estilo.paddingLeft) -
              parseFloat(estilo.paddingRight)
            return {
              tamano: cifra.dataset.tamano,
              etiqueta: cifra.dataset.etiqueta,
              texto: cifra.textContent,
              pide: Math.round(cifra.scrollWidth),
              hay: Math.round(hueco),
              fuente: Math.round(parseFloat(getComputedStyle(cifra).fontSize)),
            }
          })
          // Un píxel de margen por el redondeo del navegador.
          .filter((m) => m.pide > m.hay + 1),
      )

      expect(
        desbordes
          .map(
            (d) =>
              `  ${d.tamano}: ${d.texto} (${d.etiqueta}) pide ${d.pide}px y hay ${d.hay}px, con fuente ${d.fuente}px`,
          )
          .join('\n'),
      ).toBe('')
    })
  }

  test('la fuente nunca baja de donde se puede leer', async ({ page }) => {
    // El otro lado del arreglo: encoger sin tope haría que cupiera todo y no
    // se leyera nada. El mínimo de los tres tamaños es 0.875rem (14 px).
    await page.setViewportSize({ width: 390, height: 900 })
    await page.setContent(PAGINA)
    await page.evaluate(() => document.fonts.ready)

    const minimos = await page.evaluate((tamanos) => {
      const rejilla = document.getElementById('rejilla')!
      // El hueco más estrecho que hay: cuatro columnas en un móvil, que no se
      // da en el sistema pero es el peor caso imaginable.
      rejilla.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))'
      return tamanos.map(([nombre, clase]) => {
        const tarjeta = document.createElement('div')
        tarjeta.className = 'tarjeta'
        const caja = document.createElement('div')
        caja.className = 'caja'
        const cifra = document.createElement('p')
        cifra.className = 'cifra'
        cifra.style.fontSize = clase.replace(/^text-\[/, '').replace(/\]$/, '')
        cifra.textContent = '$ 1.250.000.000'
        caja.append(cifra)
        tarjeta.append(caja)
        rejilla.append(tarjeta)
        return {
          nombre,
          px: parseFloat(getComputedStyle(cifra).fontSize),
        }
      })
    }, TAMANOS)

    for (const m of minimos) {
      expect(m.px, `${m.nombre} se encogió por debajo de lo legible`).toBeGreaterThanOrEqual(14)
    }
  })
})
