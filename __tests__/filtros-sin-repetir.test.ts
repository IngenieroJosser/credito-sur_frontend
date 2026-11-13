import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que no vuelva a haber dos botones de filtro que digan lo mismo.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * «En cuanto a los filtros hay filtros donde el botón Todos se repite 2
 * veces.»
 *
 * En `/admin/creditos-articulos` había dos grupos de chips uno al lado del
 * otro —estado del crédito y nivel de riesgo— y los dos empezaban por un botón
 * que decía exactamente «Todos». Lo único que los distinguía era un icono gris
 * de 14 px al principio de cada grupo: un embudo en uno, un triángulo de aviso
 * en el otro. Para quien mira la pantalla son dos botones idénticos, y pulsar
 * el que no era no da ningún error: la lista cambia, pero por otro motivo.
 *
 * En `/admin/notificaciones` pasaba lo mismo con dos «Todas»: el grupo de
 * categorías llevaba su nombre encima y las pestañas de lectura, no.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Que un grupo de chips de filtro se haga con `GrupoDeFiltros`, que pide el
 * nombre de lo que filtra y lo pinta. Con el nombre a la vista, dos «Todos»
 * seguidos dicen cada uno de qué: «ESTADO Todos…» y «RIESGO Todos…».
 *
 * El marcado a mano no vale, y no por gusto: estaba copiado en tres pantallas,
 * las tres sin `aria-pressed` —botones que guardan estado y no lo decían—, con
 * 27 px de alto en táctil y chips pegados, y con `transition-all`, que anima
 * también el fondo y el sombreado.
 *
 * ── El límite de la medición ────────────────────────────────────────────────
 *
 * Reconoce un grupo de chips por cómo está escrito: una lista literal de
 * `{ id, label }` o `{ value, label }` seguida de un `.map` que pinta
 * `<button>`. Un grupo construido en tiempo de ejecución no se distingue. La
 * última prueba le pone un piso.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components']

/**
 * Una lista literal de opciones seguida de un `.map` que pinta botones.
 *
 * Se busca en dos pasos y no con una sola expresión: `[^]]*` se cortaría en el
 * primer `]` de un `className` con corchetes —`text-[11px]`, que está en
 * justamente estas listas—, y la prueba daría cero sin ver nada.
 */
const OPCION = /\{\s*(?:id|value|key)\s*:\s*'[^']*'\s*(?:as const\s*)?,\s*(?:label|etiqueta)\s*:\s*'[^']*'\s*\}/g

function archivosTsx(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name === '.next') continue
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) salida.push(...archivosTsx(completo))
    else if (entrada.name.endsWith('.tsx')) salida.push(completo)
  }
  return salida
}

type Grupo = { rel: string; linea: number; opciones: number }

/**
 * Los grupos de chips escritos a mano: lista de opciones + `.map` + `<button`.
 *
 * Se mira en la ventana que sigue a la lista, no en todo el archivo: así un
 * `.map` cualquiera de otra parte no cuenta.
 */
function gruposAMano(): Grupo[] {
  const salida: Grupo[] = []

  for (const carpeta of CARPETAS) {
    for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))

      // `GrupoDeFiltros` también lleva su lista de opciones: su propio archivo
      // y los que lo usan declaran las opciones como argumento, no con un
      // `.map` a `<button>`, así que la ventana de abajo ya los descarta.
      let previa: RegExpExecArray | null
      OPCION.lastIndex = 0
      const vistas: number[] = []
      while ((previa = OPCION.exec(fuente)) !== null) {
        vistas.push(previa.index)
      }
      if (vistas.length < 2) continue

      // Se agrupan las opciones contiguas: dos que estén a menos de 200
      // caracteres pertenecen a la misma lista.
      const grupos: number[][] = []
      for (const i of vistas) {
        const ultimo = grupos[grupos.length - 1]
        if (ultimo && i - ultimo[ultimo.length - 1] < 200) ultimo.push(i)
        else grupos.push([i])
      }

      for (const grupo of grupos) {
        if (grupo.length < 2) continue
        const fin = grupo[grupo.length - 1]
        const ventana = fuente.slice(fin, fin + 600)
        if (!/\.map\(/.test(ventana)) continue
        if (!/<button/.test(ventana)) continue

        /*
         * Una barra de PESTAÑAS no es un grupo de filtros, y se parece mucho
         * escrita: también es una lista de `{ key, label }` con un `.map` a
         * `<button>`. La diferencia es que unas pestañas cambian el panel que
         * se ve y no tienen una opción «todas», porque no filtran nada.
         *
         * El primer intento de esta prueba señaló las dos pestañas de
         * `ClienteInfoModal` —«Expediente» y «Detalle Administrativo»—, que no
         * tienen nada que ver con el defecto que vino a cerrar.
         *
         * Así que se exige lo que SÍ define el caso: que el grupo tenga una
         * opción que signifique «todo». Es justo la que se repetía.
         */
        const lista = fuente.slice(grupo[0], fin + 120)
        const tieneTodos =
          /(?:id|value|key)\s*:\s*'(?:todos|todas|todo|all|TODOS|TODAS|TODO|ALL)'/.test(
            lista,
          ) || /label\s*:\s*'(?:Todos|Todas|Todo)\b/.test(lista)
        if (!tieneTodos) continue
        salida.push({
          rel,
          linea: fuente.slice(0, grupo[0]).split('\n').length,
          opciones: grupo.length,
        })
      }
    }
  }

  return salida
}

const A_MANO = gruposAMano()

describe('los grupos de filtros van por un solo sitio', () => {
  it('ninguna pantalla pinta sus chips de filtro a mano', () => {
    const informe = A_MANO.length
      ? [
          'Estos grupos de chips de filtro están escritos a mano:',
          '',
          ...A_MANO.map((g) => `  - ${g.rel}:${g.linea} (${g.opciones} opciones)`),
          '',
          'Va `GrupoDeFiltros` de `components/filtros/GrupoDeFiltros`. Pide el',
          'nombre de lo que filtra y lo pinta, que es lo que faltaba el día de',
          'los dos botones «Todos» idénticos; y trae `aria-pressed`, 44 px de',
          'área táctil y el movimiento del resto del sistema.',
        ].join('\n')
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })

  it('`GrupoDeFiltros` exige el nombre de lo que filtra', () => {
    // Es la pieza que arregla el defecto. Si el nombre pasara a ser opcional,
    // volveríamos a tener dos «Todos» sin forma de distinguirlos, y el tipo es
    // lo único que lo impide.
    const fuente = fs.readFileSync(
      path.join(RAIZ, 'components', 'filtros', 'GrupoDeFiltros.tsx'),
      'utf8',
    )
    expect(fuente).toMatch(/\n\s*nombre:\s*string\n/)
    expect(fuente).not.toMatch(/nombre\?:/)
  })

  it('y lo pinta, no solo lo pasa a `aria-label`', () => {
    // Un `aria-label` arregla el lector de pantalla y no lo que se ve. El
    // problema que se reportó es visual.
    const fuente = fs.readFileSync(
      path.join(RAIZ, 'components', 'filtros', 'GrupoDeFiltros.tsx'),
      'utf8',
    )
    expect(fuente).toMatch(/\{nombre\}/)
  })
})

describe('el lector de esta prueba mira de verdad', () => {
  it('encuentra las listas de opciones que hay', () => {
    // El piso: si la expresión se rompe, da cero y pasa. Medido el día que se
    // escribió, hay decenas de listas `{ id, label }` en el sistema.
    let listas = 0
    for (const carpeta of CARPETAS) {
      for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
        const fuente = fs.readFileSync(archivo, 'utf8')
        listas += (fuente.match(OPCION) ?? []).length
      }
    }
    expect(listas).toBeGreaterThan(20)
  })

  it('ve el grupo a mano cuando se le pone delante', () => {
    // Comprobada al revés, con el marcado exacto que había en
    // `/admin/creditos-articulos`, incluido el `text-[11px]` cuyo corchete
    // rompía el primer intento de esta prueba.
    const comoEstaba = `
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'ACTIVO', label: 'Activos' },
          { id: 'EN_MORA', label: 'En Mora' }
        ].map((filtro) => (
          <button
            key={filtro.id}
            onClick={() => setEstadoFiltro(filtro.id)}
            className="px-3 py-1.5 text-[11px] font-bold rounded-xl"
          >
            {filtro.label}
          </button>
        ))}
      </div>
    `
    OPCION.lastIndex = 0
    const opciones = comoEstaba.match(OPCION) ?? []
    const desdeLaPrimera = comoEstaba.slice(comoEstaba.indexOf(opciones[0] ?? ''))
    expect({
      opciones: opciones.length,
      tieneMap: /\.map\(/.test(desdeLaPrimera),
      tieneBoton: /<button/.test(desdeLaPrimera),
    }).toEqual({ opciones: 3, tieneMap: true, tieneBoton: true })
  })

  it('y no confunde con un grupo ya migrado', () => {
    // `GrupoDeFiltros` recibe las opciones como argumento y no pinta ningún
    // `<button>` en la pantalla que lo usa: ahí está la diferencia.
    const migrado = `
      <GrupoDeFiltros
        nombre="Estado"
        valor={estadoFiltro}
        onChange={setEstadoFiltro}
        opciones={[
          { id: 'todos', label: 'Todos' },
          { id: 'ACTIVO', label: 'Activos' },
        ]}
      />
    `
    OPCION.lastIndex = 0
    const opciones = migrado.match(OPCION) ?? []
    const desdeLaPrimera = migrado.slice(migrado.indexOf(opciones[0] ?? ''))
    expect({
      opciones: opciones.length,
      tieneBoton: /<button/.test(desdeLaPrimera),
    }).toEqual({ opciones: 2, tieneBoton: false })
  })
})
