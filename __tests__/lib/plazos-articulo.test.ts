import * as fs from 'fs'
import * as path from 'path'
import {
  PLAZOS_ARTICULO_MESES,
  opcionesDeMesesParaPlazo,
  plazosRepetidos,
  problemasDeOpcionesDeCredito,
} from '@/lib/plazos-articulo'

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

/**
 * Editar una opcion ya agregada sin borrarla.
 *
 * Las filas de opciones eran texto con un boton de borrar: cambiar una cifra
 * obligaba a borrar la opcion y escribirla de nuevo, y en el modal de editar eso
 * significaba borrar un precio ya guardado para reponerlo a mano. Al hacerlas
 * editables aparecen dos estados que antes no se podian alcanzar: una opcion sin
 * precio y dos opciones con el mismo plazo.
 */
describe('Los plazos que ofrece una opcion ya agregada', () => {
  it('son los de la empresa cuando su plazo es uno de ellos', () => {
    expect(opcionesDeMesesParaPlazo(5)).toEqual([3, 5, 8])
  })

  it('incluyen el plazo que ya tenia el articulo, aunque no sea de la empresa', () => {
    // La plantilla de Excel deja escribir cualquier numero de meses, asi que hay
    // articulos guardados a 6 o 12. Un <select> cuyo valor no esta entre sus
    // opciones se pinta en la primera: abrir ese articulo para cambiarle el
    // nombre le habria cambiado el plazo a 3 meses sin que nadie lo tocara.
    expect(opcionesDeMesesParaPlazo(6)).toEqual([3, 5, 6, 8])
    expect(opcionesDeMesesParaPlazo(12)).toEqual([3, 5, 8, 12])
  })

  it('no repite el plazo ni lo saca de orden', () => {
    for (const meses of [1, 3, 4, 5, 8, 9, 24]) {
      const opciones = opcionesDeMesesParaPlazo(meses)
      expect(opciones).toContain(meses)
      expect(new Set(opciones).size).toBe(opciones.length)
      expect(opciones).toEqual([...opciones].sort((a, b) => a - b))
    }
  })
})

describe('Lo que impide guardar las opciones de credito', () => {
  it('una lista correcta no da ningun problema', () => {
    expect(
      problemasDeOpcionesDeCredito([
        { meses: 3, precio: 1047631 },
        { meses: 5, precio: 1184629 },
        { meses: 8, precio: 1289392 },
      ]),
    ).toEqual([])
  })

  it('una lista vacia tampoco: el articulo puede venderse solo de contado', () => {
    expect(problemasDeOpcionesDeCredito([])).toEqual([])
  })

  it('avisa del precio en cero, que el backend si acepta', () => {
    // El DTO admite @Min(0), asi que un cero entraba y quedaba guardado un plazo
    // que financia gratis. Aqui es donde se para.
    const problemas = problemasDeOpcionesDeCredito([
      { meses: 3, precio: 1047631 },
      { meses: 5, precio: 0 },
    ])
    expect(problemas).toHaveLength(1)
    expect(problemas[0]).toContain('sin precio')
  })

  it('nombra el plazo repetido, que antes llegaba como error de Prisma', () => {
    const problemas = problemasDeOpcionesDeCredito([
      { meses: 5, precio: 1184629 },
      { meses: 5, precio: 1200000 },
    ])
    expect(problemas).toHaveLength(1)
    expect(problemas[0]).toContain('5 meses')
  })

  it('nombra los dos plazos cuando hay dos repetidos, y una sola vez cada uno', () => {
    const problemas = problemasDeOpcionesDeCredito([
      { meses: 8, precio: 1289392 },
      { meses: 3, precio: 1047631 },
      { meses: 8, precio: 1300000 },
      { meses: 3, precio: 1050000 },
      { meses: 8, precio: 1310000 },
    ])
    expect(problemas).toHaveLength(1)
    expect(problemas[0]).toContain('3 y 8 meses')
  })

  it('junta los dos avisos cuando pasan las dos cosas', () => {
    expect(
      problemasDeOpcionesDeCredito([
        { meses: 3, precio: 0 },
        { meses: 3, precio: 1047631 },
      ]),
    ).toHaveLength(2)
  })

  it('el precio negativo cuenta como falta de precio', () => {
    expect(problemasDeOpcionesDeCredito([{ meses: 3, precio: -1 }])).toHaveLength(1)
  })
})

describe('plazosRepetidos senala exactamente los repetidos', () => {
  it('no senala nada cuando cada plazo va una vez', () => {
    expect([
      ...plazosRepetidos([
        { meses: 3, precio: 1 },
        { meses: 5, precio: 2 },
      ]),
    ]).toEqual([])
  })

  it('senala solo el plazo que se repite, no el que esta bien', () => {
    const repetidos = plazosRepetidos([
      { meses: 3, precio: 1 },
      { meses: 5, precio: 2 },
      { meses: 5, precio: 3 },
    ])
    expect(repetidos.has(5)).toBe(true)
    expect(repetidos.has(3)).toBe(false)
  })
})
