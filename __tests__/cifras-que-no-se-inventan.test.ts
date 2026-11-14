import * as fs from 'fs'
import * as path from 'path'

import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Ninguna pantalla pinta una cifra de dinero escrita a mano.
 *
 * ── Lo que había ────────────────────────────────────────────────────────────
 *
 * Buscando `formatCurrency(` seguido de un número literal aparecieron cuatro
 * sitios, y los cuatro mentían:
 *
 *   `CreacionCreditoArticulo`       una columna «Saldo Disp.» con
 *                                   `formatCurrency(10000000)` —diez millones,
 *                                   iguales para todos los clientes— en la
 *                                   pantalla donde se decide cuánto prestar.
 *                                   No existe cupo por cliente en el sistema.
 *
 *   `supervisor/reportes/operativos` «Préstamos Nuevos: 3» y «Total colocado:
 *                                   $450.000», fijos, al lado de dos tarjetas
 *                                   que sí traían datos del servidor. El
 *                                   endpoint ya devolvía los valores buenos
 *                                   (`totalPrestamosNuevos`,
 *                                   `totalMontoPrestamosNuevos`) y la copia de
 *                                   esa misma pantalla para el admin los leía.
 *
 *   `admin/auditoria/data.ts`       dos importes dentro de unos `MOCK_LOGS` de
 *                                   auditoría que no importaba nadie. Borrado.
 *
 * ── Por qué una centinela y no «tener cuidado» ──────────────────────────────
 *
 * Una cifra inventada no falla, no rompe nada y se lee igual que una de
 * verdad. La única diferencia está en el código, y por eso se mira ahí.
 *
 * Lo que NO se prohíbe: `formatCurrency(variable)`, ni los literales de las
 * pruebas, ni un cero explícito —hay sitios donde cero es el dato—. Solo la
 * cifra grande escrita a mano, que es la que se escribe «para que se vea algo».
 */

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['app', 'components', 'lib', 'services']
const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', '__tests__'])

/**
 * Cuatro dígitos o más: mil pesos ya es dinero y nadie escribe eso de adorno.
 * Por debajo entran cantidades, porcentajes y márgenes que no son importes.
 */
const CIFRA_A_MANO = /formatCurrency\(\s*[0-9]{4,}/g

function archivosFuente(dir: string, acc: string[] = []): string[] {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (OMITIR.has(entrada.name)) continue
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) archivosFuente(completo, acc)
    else if (/\.(tsx|ts)$/.test(entrada.name) && !/\.(test|spec)\./.test(entrada.name)) {
      acc.push(completo)
    }
  }
  return acc
}

describe('el dinero que se enseña sale de los datos', () => {
  const archivos = CARPETAS.flatMap((c) => {
    const dir = path.join(RAIZ, c)
    return fs.existsSync(dir) ? archivosFuente(dir) : []
  })

  it('encuentra archivos que revisar', () => {
    // Si la búsqueda se rompe, el resto pasaría en vacío sin comprobar nada.
    expect(archivos.length).toBeGreaterThan(100)
  })

  it('ninguna pantalla escribe un importe a mano', () => {
    const infractores: string[] = []

    for (const archivo of archivos) {
      const relativo = path.relative(RAIZ, archivo).replace(/\\/g, '/')
      const texto = sinComentarios(fs.readFileSync(archivo, 'utf8'))
      let m: RegExpExecArray | null
      const re = new RegExp(CIFRA_A_MANO.source, 'g')

      while ((m = re.exec(texto))) {
        const linea = texto.slice(0, m.index).split('\n').length
        infractores.push(`${relativo}:${linea} -> ${m[0]}…)`)
      }
    }

    const informe = infractores.length
      ? [
          'Estas cifras de dinero están escritas a mano:',
          '',
          ...infractores.map((i) => `  - ${i}`),
          '',
          'Una cifra inventada se lee igual que una de verdad y no falla nunca.',
          'Sácala de los datos; si el dato no existe, no pintes la cifra.',
        ].join('\n')
      : ''

    expect(informe).toBe('')
  })

  it('y ese lector ve el defecto cuando se le pone delante', () => {
    /*
     * Comprobada al revés, con las tres formas que importan: la que está mal,
     * la que no, y la que solo vive en un comentario —que es como esta misma
     * prueba se habría acusado a sí misma—.
     */
    const re = () => new RegExp(CIFRA_A_MANO.source, 'g')

    expect(re().test(sinComentarios('{formatCurrency(10000000)}'))).toBe(true)
    expect(re().test(sinComentarios('{formatCurrency(total)}'))).toBe(false)
    expect(re().test(sinComentarios('// antes: formatCurrency(10000000)'))).toBe(
      false,
    )
    // Un cero explícito no es una cifra inventada: hay sitios donde es el dato.
    expect(re().test(sinComentarios('{formatCurrency(0)}'))).toBe(false)
  })
})
