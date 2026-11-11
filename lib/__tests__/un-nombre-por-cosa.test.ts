import * as fs from 'fs'
import * as path from 'path'

/**
 * Que una misma cosa no se llame de dos formas según la pantalla.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Las decisiones sobre una cuenta vencida tenían cinco nombres repartidos por
 * el frontend, y seis contando el backend. Lo que leía una persona que pedía
 * la gestión y luego entraba a aprobarla:
 *
 *   PRORROGAR     Prorrogar Plan / Prórroga de Plazo / Prorroga / 📅 Prórroga
 *   CASTIGAR      Reportar Pérdida / Baja por Pérdida / Baja por perdida /
 *                 🔴 Baja por pérdida
 *   DEJAR_QUIETO  Dejar Quieto / Sin Mora por Ahora / Sin mora por ahora
 *
 * Dos de esos mapas estaban en el MISMO archivo, uno con emoji y otro sin.
 * Y `PENDIENTE_APROBACION` —un estado de crédito— era «Pendiente de revisión»
 * en un modal y «Pendiente de aprobación» en el sitio compartido.
 *
 * No es cosmético: quien pide una gestión y quien la aprueba no tenían forma
 * de saber que hablaban de lo mismo.
 *
 * ── Cómo se mide ────────────────────────────────────────────────────────────
 *
 * Se buscan los pares `ENUM: 'Texto'` en todo el frontend y se agrupan por
 * enum. Si un enum aparece con dos textos distintos, eso es la inconsistencia.
 *
 * No mide si un nombre es BUENO —eso no se puede automatizar— sino si hay más
 * de uno para lo mismo, que sí.
 *
 * El límite, dicho explícitamente: solo ve los mapas escritos como literales.
 * Un nombre construido en tiempo de ejecución, o traído del backend, no
 * aparece aquí.
 */

const RAIZ = path.join(__dirname, '..', '..')

/** `ENUM: 'Texto legible'` dentro de un objeto. */
const PAR = /\b([A-Z][A-Z0-9_]{3,}):\s*'([^'\n]{2,60})'/g

/** Prefijos de clases de Tailwind, que no son nombres de nada. */
const CLASES = [
  'bg-',
  'text-',
  'border-',
  'from-',
  'to-',
  'ring-',
  'hover:',
]

/**
 * Si un texto es un nombre que una persona leería.
 *
 * El filtro existe porque la expresión pesca de todo: clases de Tailwind,
 * rutas, y trozos de código partidos por un salto de línea. Sin él, el primer
 * intento de esta auditoría dio quince «divergencias» de las que once eran
 * basura, y una prueba con falsos positivos se acaba desactivando.
 */
function esNombreVisible(texto: string): boolean {
  if (texto.includes('/') || texto.includes('\\')) return false
  if (CLASES.some((p) => texto.startsWith(p))) return false
  if (/[(){}[\]<>=;$`]/.test(texto)) return false
  // Una sola palabra en minúsculas suele ser una clave, no una etiqueta.
  if (!texto.includes(' ') && texto === texto.toLowerCase()) return false
  return true
}

function fuentes(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entrada.name === 'node_modules' || entrada.name === '.next') continue
      const completo = path.join(dir, entrada.name)
      if (entrada.isDirectory()) {
        recorrer(completo)
        continue
      }
      if (!/\.tsx?$/.test(entrada.name)) continue
      if (entrada.name.includes('.test.') || entrada.name.includes('.spec.')) {
        continue
      }
      salida.push(completo)
    }
  }
  for (const base of ['app', 'components', 'lib']) {
    const dir = path.join(RAIZ, base)
    if (fs.existsSync(dir)) recorrer(dir)
  }
  return salida
}

describe('una cosa se llama igual en todas las pantallas', () => {
  it('ningún enum se muestra con dos nombres distintos', () => {
    // enum -> texto -> archivos donde aparece
    const porEnum = new Map<string, Map<string, Set<string>>>()

    for (const archivo of fuentes()) {
      const fuente = fs.readFileSync(archivo, 'utf8')
      const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')

      for (const hallado of fuente.matchAll(PAR)) {
        const [, enumero, texto] = hallado
        if (!esNombreVisible(texto)) continue
        // Un enum escrito igual que su clave no es una traducción.
        if (texto.toUpperCase().replace(/ /g, '_') === enumero) continue

        if (!porEnum.has(enumero)) porEnum.set(enumero, new Map())
        const textos = porEnum.get(enumero)!
        if (!textos.has(texto)) textos.set(texto, new Set())
        textos.get(texto)!.add(relativo)
      }
    }

    // Si no se encontró nada, la expresión dejó de encajar con el código y
    // esta prueba estaría pasando sin mirar nada.
    expect(porEnum.size).toBeGreaterThan(20)

    const divergentes: string[] = []
    for (const [enumero, textos] of porEnum) {
      if (textos.size < 2) continue
      const detalle = [...textos.entries()]
        .map(([t, archivos]) => `«${t}» (${[...archivos][0]})`)
        .join(' vs ')
      divergentes.push(`${enumero}: ${detalle}`)
    }

    const informe = divergentes.length
      ? [
          'Estos valores se muestran con más de un nombre según la pantalla.',
          'Quien hace algo en una y lo revisa en otra no puede saber que es lo',
          'mismo:',
          '',
          ...divergentes.map((d) => `  - ${d}`),
          '',
          'El sitio para los nombres compartidos es lib/display-labels.ts.',
        ].join('\n')
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })
})
