import * as fs from 'fs'
import * as path from 'path'

/**
 * Que ningún botón prometa algo y no haga nada.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Un botón con su color, su `hover:` y su texto, y sin `onClick`. Se ve igual
 * que uno que funciona. La persona lo pulsa, no pasa nada, y vuelve a pulsar.
 *
 * Encontrados en la auditoría, todos sobre datos reales:
 *
 *   - «Castigar Cartera» y «Acuerdo de Pago Final» en el expediente de una
 *     cuenta vencida, DOS veces: en la copia de admin y en la de coordinador.
 *   - «Imprimir» y «Descargar PDF» en el detalle de un movimiento contable y
 *     en el de un comprobante, otras cuatro.
 *   - «Reasignar» en la asignación de rutas y «Filtrar» en el detalle de
 *     cliente: la palabra no aparecía en ninguna otra parte del proyecto, o
 *     sea que no eran funciones a medio conectar sino adorno.
 *   - El método de pago «Efectivo», que era un botón no pulsable con un punto
 *     de radio al lado, sugiriendo opciones que no existen.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Que todo `<button>` tenga `onClick`, o sea `type="submit"`, o esté
 * `disabled`. Un botón deshabilitado NO miente: se ve apagado y no invita a
 * pulsar; además el proyecto ya los acompaña del motivo («Función no
 * disponible todavía»).
 *
 * ── El límite de la medición, dicho explícitamente ──────────────────────────
 *
 * Esto lee el código, así que solo ve lo escrito como literal. Un botón que
 * recibe su `onClick` por props derramadas (`{...props}`) no se distingue de
 * uno muerto, y por eso se excluye.
 */

const RAIZ = path.join(__dirname, '..', '..')

/**
 * El botón que SÍ puede quedarse sin `onClick`, con su motivo.
 *
 * `AyudaContextual` es el icono «?» que dispara un `Tooltip`: el botón existe
 * para ser el objetivo del foco y del toque largo, y quien abre el globo es el
 * `Tooltip` que lo envuelve. No hay nada que ejecutar al pulsarlo.
 *
 * Ojo con ampliar esta lista por «está dentro de un Tooltip»: los cuatro
 * botones de imprimir y descargar también lo estaban, y estaban muertos.
 */
const EXCEPCIONES = new Set(['components/ui/AyudaContextual.tsx'])

/** El `>` que cierra la etiqueta, contando llaves para no parar en un `=>`. */
function cierreDeEtiqueta(fuente: string, desde: number): number {
  let profundidad = 0
  for (let i = desde; i < fuente.length; i += 1) {
    const c = fuente[i]
    if (c === '{') profundidad += 1
    else if (c === '}') profundidad -= 1
    else if (c === '>' && profundidad === 0) return i
  }
  return -1
}

function pantallas(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entrada.name === 'node_modules' || entrada.name === '.next') continue
      const completo = path.join(dir, entrada.name)
      if (entrada.isDirectory()) {
        recorrer(completo)
        continue
      }
      if (entrada.name.endsWith('.tsx')) salida.push(completo)
    }
  }
  for (const base of ['app', 'components']) {
    const dir = path.join(RAIZ, base)
    if (fs.existsSync(dir)) recorrer(dir)
  }
  return salida
}

type Boton = { relativo: string; linea: number; apertura: string }

function botonesSinAccion(): Boton[] {
  const salida: Boton[] = []

  for (const archivo of pantallas()) {
    const fuente = fs.readFileSync(archivo, 'utf8')
    if (!fuente.includes('<button')) continue
    const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')
    if (EXCEPCIONES.has(relativo)) continue

    for (const hallado of fuente.matchAll(/<button[^A-Za-z]/g)) {
      const inicio = hallado.index ?? 0
      const fin = cierreDeEtiqueta(fuente, inicio + hallado[0].length)
      if (fin < 0) continue

      const apertura = fuente.slice(inicio, fin + 1)
      if (apertura.includes('onClick')) continue
      if (/type=["']submit["']/.test(apertura)) continue
      if (apertura.includes('disabled')) continue
      // Props derramadas: el `onClick` puede venir de fuera y no se ve aquí.
      if (apertura.includes('{...')) continue

      const linea = fuente.slice(0, inicio).split('\n').length
      salida.push({ relativo, linea, apertura })
    }
  }

  return salida
}

describe('ningún botón promete algo que no hace', () => {
  it('todo botón tiene onClick, es submit, o está deshabilitado', () => {
    const muertos = botonesSinAccion()

    const informe = muertos.length
      ? [
          'Estos botones se ven activos y no hacen nada. Quien los pulsa no',
          'recibe ninguna señal, así que vuelve a pulsar:',
          '',
          ...muertos.map((m) => `  - ${m.relativo}:${m.linea}`),
          '',
          'Ponle su `onClick`, o `disabled` con el motivo escrito al lado, o',
          'quítalo si lo que promete no existe.',
        ].join('\n')
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })

  it('la excepción sigue correspondiendo a un botón real', () => {
    // Sin esto, la excepción se quedaría tapando un archivo que ya no existe
    // y mañana taparía un botón muerto nuevo dentro de él.
    const sobrantes = [...EXCEPCIONES].filter(
      (relativo) => !fs.existsSync(path.join(RAIZ, relativo)),
    )

    expect(sobrantes).toEqual([])
  })
})
