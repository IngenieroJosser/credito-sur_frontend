import fs from 'fs'
import path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Que cada modal declare SU capa, y que salga de la escala.
 *
 * ── Lo que pasaba ───────────────────────────────────────────────────────────
 *
 * Medido sobre el sistema entero: 86 modales a pantalla completa en 56
 * archivos. Solo 25 usaban la escala de `components/ui/Portal.tsx`; los otros
 * 61 llevaban un número elegido a mano —60, 70, 80, 90, 100, 9999,
 * 2147483600, 2147483601, 2147483620, 2147483647— o ninguno en absoluto.
 *
 * Con eso, que un modal se abra delante o detrás del que lo abrió depende de
 * qué cifra escribió cada autor. Y la constante `MODAL_Z_INDEX` estaba
 * definida TRES veces con el mismo valor: en `Portal.tsx`, otra vez en
 * `CobradorElements.tsx` y una tercera dentro de `ClientePortalModal.tsx`.
 * Coincidían, así que no se veía; lo que provocaba es que nadie supiera cuál
 * era la escala de verdad.
 *
 * El caso que lo delató, contado por quien lo usa: en el modal de un préstamo
 * se pulsa el nombre del cliente, «se abre otro modal pero abre debajo» y «al
 * cerrar uno se cierra el otro». Las dos cosas son lo mismo: el modal del
 * préstamo se había quedado en `z-[2147483620]` —la capa de los TOOLTIPS—, por
 * encima del modal del cliente; el del cliente salía por detrás, el clic para
 * cerrarlo caía sobre el fondo del de delante, y ese fondo cierra el préstamo,
 * que es quien monta al del cliente. Se iban los dos.
 *
 * ── Qué se exige ────────────────────────────────────────────────────────────
 *
 * Que todo elemento a pantalla completa con fondo translúcido —eso es un
 * modal— lleve una de las utilidades `capa-*` de `globals.css`, o la capa que
 * devuelve `useModalDialog` en `style`. Un número suelto no vale: es justo lo
 * que produjo el desorden.
 *
 * ── El límite de la medición ────────────────────────────────────────────────
 *
 * Lee el código, así que reconoce un modal por cómo está escrito: `fixed
 * inset-0` con un fondo translúcido. Uno montado con clases calculadas en
 * tiempo de ejecución no se distingue de nada. La última prueba le pone un
 * piso para que no pueda pasar por haber dejado de mirar.
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components']
const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', 'public'])

const ES_PANTALLA_COMPLETA = /fixed[^"'`]*inset-0|inset-0[^"'`]*fixed/
const FONDO = /bg-(?:slate|black|gray|zinc|neutral|white)[^\s"'`]*\/\d|backdrop-blur/
const UTILIDAD = /capa-(?:modal-encima|modal|accion|tooltip|aviso|alerta)/
const POR_STYLE =
  /zIndex:\s*(?:capa|MODAL_Z_INDEX|MODAL_ENCIMA_Z_INDEX|ACCION_Z_INDEX|TOOLTIP_Z_INDEX|TOAST_Z_INDEX|ALERT_Z_INDEX)\b/

/** Con su motivo, como el resto de las excepciones del proyecto. */
const EXCEPCIONES = new Map<string, string>([
  [
    // Era `app/admin/layout.tsx` hasta que el armazón salió de la carpeta de
    // rutas para que no se desmontara al cruzar de árbol. La excepción se
    // mueve con el archivo: anclarla al nombre tampoco es eterno.
    'components/layout/ArmazonAdmin.tsx',
    'Es el menú lateral y su panel de notificaciones. Su escala es la que ' +
      'vigila `capas-z-index.test.ts` —nada de la página por encima del ' +
      'menú—, no la de los modales.',
  ],
])

function archivosTsx(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (OMITIR.has(entrada.name)) continue
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) salida.push(...archivosTsx(completo))
    else if (entrada.name.endsWith('.tsx')) salida.push(completo)
  }
  return salida
}

type Modal = { rel: string; linea: number; texto: string; declarada: boolean }

function modales(): Modal[] {
  const salida: Modal[] = []
  for (const carpeta of CARPETAS) {
    for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
      const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
      const lineas = fs.readFileSync(archivo, 'utf8').split(/\r?\n/)
      lineas.forEach((linea, i) => {
        if (!ES_PANTALLA_COMPLETA.test(linea)) return
        // Un fondo decorativo (la rejilla de las pantallas de detalle) no es
        // un modal: no recibe clics.
        if (linea.includes('pointer-events-none')) return
        if (!FONDO.test(linea)) return
        /*
         * La capa puede no estar en esta línea por dos motivos legítimos:
         *
         *   - va en `style`, que se escribe en la línea de al lado;
         *   - esta línea es el FONDO del modal, un hijo del elemento que sí
         *     declara la capa. Un hijo hereda el apilamiento de su padre, así
         *     que no necesita la suya —y ponérsela sería peor: lo sacaría del
         *     contexto de su padre—.
         *
         * Catorce líneas hacia arriba cubre a los tres que hay así hoy: el
         * fondo de `DetallePrestamoModal` (5 líneas), el de `MediaUpload`
         * (5) y el de `Modal.tsx` (11).
         */
        const alrededor = lineas.slice(Math.max(0, i - 14), i + 4).join('\n')
        salida.push({
          rel,
          linea: i + 1,
          texto: linea.trim(),
          declarada: UTILIDAD.test(alrededor) || POR_STYLE.test(alrededor),
        })
      })
    }
  }
  return salida
}

const TODOS = modales()

describe('cada modal dice en qué capa va', () => {
  it('ninguno se queda sin capa ni la escribe con un número', () => {
    const sinCapa = TODOS.filter(
      (m) => !m.declarada && !EXCEPCIONES.has(m.rel),
    ).map((m) => `${m.rel}:${m.linea}\n      ${m.texto.slice(0, 110)}`)

    const informe = sinCapa.length
      ? [
          'Estos modales no dicen en qué capa van, o la dicen con un número:',
          '',
          ...sinCapa.map((s) => `  - ${s}`),
          '',
          'Pon `capa-modal` —o `capa-modal-encima` si se abre DENTRO de otro',
          'modal— en el elemento a pantalla completa, o',
          '`style={{ zIndex: capa }}` con la `capa` que devuelve',
          '`useModalDialog`: sale de la pila de modales abiertos y deja cada',
          'uno delante del que lo abrió sin que nadie elija un número.',
        ].join('\n')
      : 'ninguno'

    expect(informe).toBe('ninguno')
  })

  it('cada excepción sigue correspondiendo a un modal sin capa', () => {
    // Si no, la lista se queda tapando algo que ya no existe y mañana tapa
    // algo nuevo del mismo archivo.
    const sobrantes = [...EXCEPCIONES.keys()].filter(
      (rel) => !TODOS.some((m) => m.rel === rel && !m.declarada),
    )
    expect(sobrantes).toEqual([])
  })
})

describe('la escala vive en un solo sitio', () => {
  const css = fs.readFileSync(path.join(RAIZ, 'app', 'globals.css'), 'utf8')
  const portal = fs.readFileSync(
    path.join(RAIZ, 'components', 'ui', 'Portal.tsx'),
    'utf8',
  )

  const PAREJAS: Array<[string, string]> = [
    ['capa-modal', 'MODAL_Z_INDEX'],
    ['capa-modal-encima', 'MODAL_ENCIMA_Z_INDEX'],
    ['capa-accion', 'ACCION_Z_INDEX'],
    ['capa-tooltip', 'TOOLTIP_Z_INDEX'],
    ['capa-aviso', 'TOAST_Z_INDEX'],
    ['capa-alerta', 'ALERT_Z_INDEX'],
  ]

  const valorEnCss = (utilidad: string) =>
    new RegExp(`@utility\\s+${utilidad}\\s*\\{[^}]*z-index:\\s*(\\d+)`).exec(
      css,
    )?.[1]

  const valorEnPortal = (constante: string) =>
    new RegExp(`export const ${constante} = (\\d+)`).exec(portal)?.[1]

  it('las utilidades del CSS dicen lo mismo que las constantes de Portal', () => {
    // Son dos archivos repitiendo los mismos seis números. Si se separan, un
    // modal con la utilidad y otro con la constante dejan de ordenarse entre
    // sí, que es el defecto que todo esto viene a cerrar.
    const comparacion = PAREJAS.map(([utilidad, constante]) => ({
      capa: utilidad,
      css: valorEnCss(utilidad) ?? 'NO DEFINIDA',
      portal: valorEnPortal(constante) ?? 'NO DEFINIDA',
    }))

    expect(comparacion).toEqual(
      PAREJAS.map(([utilidad, constante]) => ({
        capa: utilidad,
        css: valorEnPortal(constante) ?? 'NO DEFINIDA',
        portal: valorEnPortal(constante) ?? 'NO DEFINIDA',
      })),
    )
  })

  it('y están en orden, de abajo arriba', () => {
    const valores = PAREJAS.map(([, c]) => Number(valorEnPortal(c)))
    expect(valores).toEqual([...valores].sort((a, b) => a - b))
    expect(new Set(valores).size).toBe(valores.length)
  })

  it('queda sitio para los modales anidados antes de la capa siguiente', () => {
    // `capaDeModal` suma uno por cada modal abierto debajo. Si la banda no
    // cupiera, un modal anidado se colaría por encima de los avisos.
    const apilables = Number(
      /export const MODALES_APILABLES = (\d+)/.exec(portal)?.[1],
    )
    const modal = Number(valorEnPortal('MODAL_Z_INDEX'))
    const siguiente = Number(valorEnPortal('MODAL_ENCIMA_Z_INDEX'))
    expect({
      apilables: apilables >= 3,
      cabe: modal + apilables - 1 < siguiente,
    }).toEqual({ apilables: true, cabe: true })
  })

  it('`MODAL_Z_INDEX` se define una sola vez', () => {
    // Estaba en tres sitios, y por eso nadie sabía cuál era la escala.
    const definiciones: string[] = []
    for (const carpeta of CARPETAS) {
      for (const archivo of archivosTsx(path.join(RAIZ, carpeta))) {
        const rel = path.relative(RAIZ, archivo).split(path.sep).join('/')
        const fuente = sinComentarios(fs.readFileSync(archivo, 'utf8'))
        if (/(?:export\s+)?const MODAL_Z_INDEX\s*=\s*\d/.test(fuente)) {
          definiciones.push(rel)
        }
      }
    }
    expect(definiciones).toEqual(['components/ui/Portal.tsx'])
  })
})

describe('el lector de esta prueba mira de verdad', () => {
  it('encuentra los modales del sistema, no un puñado', () => {
    // Medido el día que se escribió: 86 modales en 56 archivos. El piso va a
    // la mitad para que no falle al borrar pantallas, pero delata a un lector
    // que se quedó a cero.
    const archivos = new Set(TODOS.map((m) => m.rel))
    expect({
      modales: TODOS.length > 40,
      archivos: archivos.size > 25,
    }).toEqual({ modales: true, archivos: true })
  })

  it('ve el defecto cuando se le pone delante', () => {
    // Comprobada al revés. Si esto no distinguiera, las pruebas de arriba
    // estarían dando verde por no mirar.
    const conCapa =
      '<div className="fixed inset-0 capa-modal bg-slate-900/50 backdrop-blur-sm" />'
    const conNumero =
      '<div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm" />'
    const decorativo =
      '<div className="fixed inset-0 pointer-events-none bg-slate-900/10" />'

    const declara = (linea: string) =>
      ES_PANTALLA_COMPLETA.test(linea) &&
      !linea.includes('pointer-events-none') &&
      FONDO.test(linea) &&
      (UTILIDAD.test(linea) || POR_STYLE.test(linea))

    const esModal = (linea: string) =>
      ES_PANTALLA_COMPLETA.test(linea) &&
      !linea.includes('pointer-events-none') &&
      FONDO.test(linea)

    expect({
      capaVale: declara(conCapa),
      numeroNoVale: esModal(conNumero) && !declara(conNumero),
      decorativoNoCuenta: !esModal(decorativo),
    }).toEqual({ capaVale: true, numeroNoVale: true, decorativoNoCuenta: true })
  })
})
