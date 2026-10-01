import { mkdirSync, writeFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { entrarComo, USUARIOS, type Rol } from './sesion'

/**
 * Cuántas peticiones a la API cuesta abrir cada pantalla de inicio.
 *
 * No afirma nada: mide. Hace falta para poder decir con una cifra si el límite de
 * peticiones del backend —300 por minuto y POR IP (`rate-limit.guard.ts:228`)— alcanza para
 * los usuarios que trabajan a la vez desde la misma oficina, o si se agotan el cupo entre
 * ellos.
 */
test('mide el costo en peticiones de cada pantalla de inicio', async ({ browser }) => {
  test.setTimeout(10 * 60_000)

  const medidas: Array<{
    rol: Rol
    pantalla: string
    peticiones: number
    endpointsDistintos: number
    masRepetidos: Array<[string, number]>
  }> = []

  for (const rol of Object.keys(USUARIOS) as Rol[]) {
    const contexto = await browser.newContext()
    const page = await contexto.newPage()
    await entrarComo(page, rol)

    let peticiones = 0
    const porEndpoint = new Map<string, number>()
    page.on('request', (req) => {
      const url = req.url()
      if (!url.includes('/api-credisur/')) return
      peticiones += 1
      // Agrupado sin ids ni parametros: asi se ve si son endpoints distintos o el MISMO
      // pedido muchas veces, que es la diferencia entre "la pantalla necesita mucho" y
      // "la pantalla pide lo mismo en bucle".
      const limpio = new URL(url).pathname
        .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id')
        .replace(/\/\d+/g, '/:n')
      porEndpoint.set(limpio, (porEndpoint.get(limpio) || 0) + 1)
    })

    const inicio = USUARIOS[rol].inicio
    await page.goto(inicio, { waitUntil: 'domcontentloaded' })
    // Dos segundos quietos: lo que tarda un tablero en pedir todo lo que pinta.
    await page.waitForTimeout(2500)

    const repetidos = [...porEndpoint.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
    medidas.push({
      rol,
      pantalla: inicio,
      peticiones,
      endpointsDistintos: porEndpoint.size,
      masRepetidos: repetidos,
    })
    await contexto.close()
  }

  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/costo-de-pantalla.json', JSON.stringify(medidas, null, 1))
  for (const m of medidas) {
    console.log(
      `[${m.rol}] ${m.pantalla} → ${m.peticiones} peticiones / ${m.endpointsDistintos} endpoints distintos | top: ${m.masRepetidos
        .map(([e, n]) => `${n}x ${e.replace('/api-credisur', '')}`)
        .join(', ')}`,
    )
  }
})
