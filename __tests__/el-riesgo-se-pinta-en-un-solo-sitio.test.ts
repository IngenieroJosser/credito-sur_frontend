import fs from 'fs'
import path from 'path'

/**
 * El color de un nivel de riesgo se decide en un solo sitio.
 *
 * ── Lo que se veía ────────────────────────────────────────────────────────────
 *
 * Lo dijo el dueño: «revisar el tema de los riesgos de mora o vencidas, porque
 * hay algunas vistas con estilos diferentes». Lo había, y no era solo estilo.
 * Medido antes de tocar nada, había **once** sitios pintando estos enums a
 * mano, y entre ellos:
 *
 *   - `CobradorElements` mezclaba las TRES escalas en un `switch` de quince
 *     casos y devolvía el MISMO rojo para `ROJO` y para `LISTA_NEGRA`: un
 *     cliente al que se decidió no prestarle se veía igual que uno con atraso
 *     grave. Lo mismo en su borde de ficha y en el título del punto, que decía
 *     «Crítico / Lista negra» para los dos.
 *   - `RutasPageView` usaba la misma escala de ruta un tono más claro
 *     (`emerald-50/700` contra `emerald-100/800`), así que la MISMA ruta se
 *     veía de un color en una pantalla y de otro en la siguiente.
 *   - `app/coordinador/rutas/[id]` le ponía a la escala de días de mora los
 *     NOMBRES de la escala operativa de la ruta («Peligro Mínimo», «Alto
 *     Riesgo»), y se saltaba `precaucion`, que caía en «Riesgo Desconocido»
 *     estando perfectamente sabido.
 *   - `CreacionPrestamo`, `ClientesFeature` y `creditos-articulos` tenían tres
 *     ramas para cuatro valores, así que `LISTA_NEGRA` caía al gris de «sin
 *     evaluar» o al azul de la marca. En la pantalla de decidir a quién se le
 *     presta.
 *
 * ── Cómo mide esto ───────────────────────────────────────────────────────────
 *
 * Por ventana de líneas, no con una regex que abarque el bloque: una regex de
 * `[^}]*` se corta en la primera llave y deja la prueba pasando sin mirar
 * nada, que es una lección ya pagada aquí. Se busca la línea que nombra un
 * valor del enum y se mira si en ESA línea o en las tres siguientes hay una
 * clase de color de Tailwind.
 *
 * Comprobada al revés: devolviendo a `CobradorElements` su
 * `case 'LISTA_NEGRA': return 'text-red-700 bg-red-50 border-red-100'`, la
 * prueba falla nombrando el archivo. Y el piso de `lineasConEnum` está para
 * que un fallo del barrido no la deje pasar en vacío.
 */
const RAIZ = process.cwd()
const CARPETAS = ['app', 'components', 'lib', 'hooks', 'services']

/** El origen único. Es el que tiene permiso para pintar. */
const ORIGEN = 'lib/display-labels.ts'

/**
 * Lo que se queda fuera a propósito, con el motivo.
 *
 * No son distintivos: son adornos de una pantalla concreta —una barra de
 * avance, el icono de una tarjeta, el tinte del borde de una ficha— con una
 * forma que el distintivo no tiene. Lo que sí se comprobó es que el TONO de
 * cada nivel coincide con el del distintivo, que es lo que el dueño veía
 * distinto.
 */
const PERMITIDOS: Record<string, string> = {
  'components/cuentas/CuentasMoraFeature.tsx':
    'la barra y el icono de cada tarjeta; el distintivo ya sale de nivelMoraBadgeClasses',
  'components/cobranza/DetalleMoraModal.tsx':
    'el fondo y el borde de la tarjeta grande; el distintivo ya sale de riesgoClienteBadgeClasses',
  'components/rutas/RutasPageView.tsx':
    'el tinte y la sombra de color de la tarjeta de la rejilla; el distintivo ya sale de riesgoBadgeClasses',
}

const ENUM =
  /'(VERDE|AMARILLO|ROJO|LISTA_NEGRA|PELIGRO_MINIMO|LEVE_RETRASO|PRECAUCION|RIESGO_MODERADO|ALTO_RIESGO|minimo|leve|precaucion|moderado|critico|lista_negra)'/

const COLOR = /-(emerald|green|blue|yellow|amber|orange|red|rose)-[0-9]{2,3}/

function archivos(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.next') continue
        recorrer(completo)
        continue
      }
      if (!/[.]tsx?$/.test(e.name)) continue
      if (/[.](spec|test)[.]tsx?$/.test(e.name)) continue
      salida.push(path.relative(RAIZ, completo).split(path.sep).join('/'))
    }
  }
  for (const c of CARPETAS) recorrer(path.join(RAIZ, c))
  return salida
}

const barrido = (() => {
  let lineasConEnum = 0
  const sospechosas: { archivo: string; linea: number; texto: string }[] = []

  for (const rel of archivos()) {
    const lineas = fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n')
    for (let i = 0; i < lineas.length; i += 1) {
      if (!ENUM.test(lineas[i])) continue
      lineasConEnum += 1
      if (rel === ORIGEN) continue
      // La ventana: esta línea y las tres siguientes.
      if (!COLOR.test(lineas.slice(i, i + 4).join('\n'))) continue
      sospechosas.push({ archivo: rel, linea: i + 1, texto: lineas[i].trim() })
    }
  }
  return { lineasConEnum, sospechosas }
})()

describe('el color del riesgo sale de un solo sitio', () => {
  it('el barrido ve el frontend entero', () => {
    /*
     * Piso medido: 166 líneas nombran uno de estos valores. Sin esto, un
     * fallo del recorrido dejaría la lista vacía y la prueba de abajo pasaría
     * sin haber mirado un solo archivo.
     */
    expect(barrido.lineasConEnum).toBeGreaterThanOrEqual(120)
  })

  it('ningún archivo nuevo pinta estos enums a mano', () => {
    const fuera = barrido.sospechosas
      .filter((s) => !PERMITIDOS[s.archivo])
      .map((s) => `${s.archivo}:${s.linea}  ${s.texto}`)

    /*
     * Si esto falla con un archivo tuyo: usa `riesgoClienteBadgeClasses`,
     * `nivelMoraBadgeClasses`, `riesgoBadgeClasses` o, cuando no sepas de
     * antemano qué escala llega, `badgeDeRiesgoSegunValor`. Si de verdad es un
     * adorno y no un distintivo, añádelo a `PERMITIDOS` con el motivo.
     */
    expect(fuera).toEqual([])
  })

  it('y los permitidos siguen ahí, para que la lista no se quede vieja', () => {
    /*
     * Un permiso que ya no hace falta es un permiso que tapará el día que
     * alguien vuelva a escribir color a mano en ese archivo.
     */
    const conHallazgos = new Set(barrido.sospechosas.map((s) => s.archivo))
    const sobran = Object.keys(PERMITIDOS).filter((a) => !conHallazgos.has(a))

    expect(sobran).toEqual([])
  })
})
