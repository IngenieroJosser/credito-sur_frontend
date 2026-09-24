import * as fs from 'fs'
import * as path from 'path'
import { PLAZOS_ARTICULO_MESES } from '@/lib/plazos-articulo'

/**
 * Los plazos que se pueden elegir en un crédito de artículo.
 *
 * La empresa financia a 3, 5 y 8 meses, y eso estaba escrito cuatro veces sin
 * que ninguna dijera eso: tres pantallas ofrecían hasta 24 meses y el servicio
 * de artículos inventaba su propia lista. El resultado era que los plazos que la
 * empresa cobra de verdad —5 y 8— no se podían elegir en ninguna pantalla, solo
 * importando el Excel, mientras se ofrecían plazos de 24 meses que el negocio no
 * financia.
 *
 * Estas pruebas fijan la lista y, sobre todo, que no vuelva a haber copias.
 */

const RAIZ = path.join(__dirname, '..', '..')

const archivosDeCodigo = (): string[] => {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) continue
      const completo = path.join(dir, entrada.name)
      if (entrada.isDirectory()) recorrer(completo)
      else if (/\.tsx?$/.test(entrada.name)) salida.push(completo)
    }
  }
  for (const base of ['app', 'components', 'services', 'lib', 'hooks']) {
    const dir = path.join(RAIZ, base)
    if (fs.existsSync(dir)) recorrer(dir)
  }
  return salida
}

describe('Los plazos de un crédito de artículo', () => {
  it('son 3, 5 y 8 meses', () => {
    expect([...PLAZOS_ARTICULO_MESES]).toEqual([3, 5, 8])
  })

  it('están en orden y ninguno es de un mes', () => {
    // El singular «1 mes» ya no se da, y de eso dependen las etiquetas de las
    // pantallas, que dicen «{m} mes{m > 1 ? 'es' : ''}».
    const meses = [...PLAZOS_ARTICULO_MESES]
    expect(meses).toEqual([...meses].sort((a, b) => a - b))
    expect(meses.every((m) => m > 1)).toBe(true)
  })

  it('no quedó ninguna lista de plazos escrita a mano en otra parte', () => {
    // Esta es la prueba que de verdad importa: había cuatro copias y se
    // desincronizaron. Si alguien vuelve a escribir la lista en una pantalla,
    // esto lo delata.
    const sospechosas = [
      /\[\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*5\s*,\s*6\s*,\s*9\s*,\s*12\s*,\s*18\s*,\s*24\s*\]/,
      /\[\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*6\s*,\s*12\s*\]/,
      /mesesEstandar\s*=\s*\[/,
    ]

    const hallazgos: string[] = []
    for (const archivo of archivosDeCodigo()) {
      // El propio módulo cita las listas viejas en su comentario, a propósito.
      if (archivo.endsWith(path.join('lib', 'plazos-articulo.ts'))) continue
      const fuente = fs.readFileSync(archivo, 'utf8')
      for (const patron of sospechosas) {
        if (patron.test(fuente)) {
          hallazgos.push(`${path.relative(RAIZ, archivo)}: ${patron.source}`)
        }
      }
    }

    expect(hallazgos.join('\n')).toBe('')
  })

  it('los formularios arrancan en un plazo que existe en la lista', () => {
    // Con el estado inicial en 1 mes, el desplegable mostraba «3 meses» pero el
    // estado seguía en 1: pulsar Agregar sin tocarlo guardaba un plazo de un mes
    // que nadie eligió. Ahora arrancan en el primero de la lista.
    const formularios = [
      path.join(RAIZ, 'app', 'admin', 'articulos', 'nuevo', 'page.tsx'),
      path.join(RAIZ, 'app', 'admin', 'articulos', '[id]', 'editar', 'page.tsx'),
      path.join(RAIZ, 'components', 'articulos', 'ArticulosContent.tsx'),
    ]

    for (const archivo of formularios) {
      const fuente = fs.readFileSync(archivo, 'utf8')
      expect({
        archivo: path.relative(RAIZ, archivo),
        arrancaEnUnMes: /\{\s*meses:\s*1\s*,/.test(fuente),
      }).toEqual({ archivo: path.relative(RAIZ, archivo), arrancaEnUnMes: false })

      expect(fuente).toContain('PLAZOS_ARTICULO_MESES[0]')
    }
  })
})
