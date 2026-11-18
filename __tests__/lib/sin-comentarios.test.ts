import * as fs from 'fs'
import * as path from 'path'

import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * El recortador de comentarios no tenía prueba, y eso costó caro: casi todas
 * las centinelas del proyecto lo usan para no acusar al comentario que explica
 * el defecto que se quitó. Si se pasa de largo, todas dan cero a la vez y
 * parece que el sistema está limpio.
 *
 * Lo que lo delató: una centinela nueva acusó como «modal que nadie abre» tres
 * modales del supervisor cuyos botones sí existen. No existían PARA ELLA,
 * porque un `accept="image/*"` ochocientas líneas antes abría un comentario de
 * bloque que no cerraba nunca.
 */
describe('sinComentarios', () => {
  it('borra el comentario de línea y el de bloque', () => {
    expect(sinComentarios('const a = 1 // esto no')).toBe('const a = 1 ')
    expect(sinComentarios('const a = /* esto no */ 1')).toBe('const a =  1')
  })

  it('borra un bloque que abarca varias líneas, dejando las líneas vacías', () => {
    const fuente = ['antes', '/*', ' * fuera', ' */', 'despues'].join('\n')
    expect(sinComentarios(fuente).split('\n')).toEqual(['antes', '', '', '', 'despues'])
  })

  it('mantiene el número de línea de lo que sí queda', () => {
    const fuente = ['// uno', 'const dos = 2', '/* tres */', 'const cuatro = 4'].join('\n')
    const limpio = sinComentarios(fuente).split('\n')
    expect(limpio.length).toBe(4)
    expect(limpio[1]).toBe('const dos = 2')
    expect(limpio[3]).toBe('const cuatro = 4')
  })

  it('el `//` de una URL no abre un comentario', () => {
    expect(sinComentarios("const u = 'https://api.ejemplo.co/v1'")).toBe(
      "const u = 'https://api.ejemplo.co/v1'",
    )
  })

  it('el `/*` de un tipo MIME no abre un comentario, y no se lleva el resto del archivo', () => {
    const fuente = [
      '<input accept="image/*,application/pdf" />',
      'const despues = 1',
      '<button onClick={() => abrir(true)} />',
    ].join('\n')

    const limpio = sinComentarios(fuente)

    expect(limpio).toContain('accept="image/*,application/pdf"')
    expect(limpio).toContain('const despues = 1')
    expect(limpio).toContain('abrir(true)')
  })

  it('tampoco con comilla simple ni con plantilla', () => {
    expect(sinComentarios("accept='image/*'\nconst x = 1")).toContain('const x = 1')
    expect(sinComentarios('accept={`image/*`}\nconst x = 1')).toContain('const x = 1')
  })

  it('el caso real: el FAB del supervisor sobrevive al `image/*` de 500 líneas antes', () => {
    // Esta es la prueba que importa, porque es la que falló de verdad: la
    // pantalla tiene cinco `accept="image/*"` y los botones que abren sus tres
    // modales están después del último.
    const ruta = path.join(process.cwd(), 'app/supervisor/clientes/[id]/page.tsx')
    expect(fs.existsSync(ruta)).toBe(true)

    const crudo = fs.readFileSync(ruta, 'utf8')
    expect(crudo).toContain('accept="image/*')          // piso: el defecto sigue ahí
    expect(crudo).toContain('setShowCreditoModal(true)') // piso: el boton sigue ahí

    const limpio = sinComentarios(crudo)
    expect(limpio).toContain('setShowCreditoModal(true)')
    expect(limpio).toContain('setShowPagoModal(true)')
    expect(limpio).toContain('setShowNewClientModal(true)')
  })

  it('ningún archivo del proyecto se queda ciego a partir de un `/*` en una cadena', () => {
    // `__tests__` fuera: esta prueba contiene el texto con el que restaura el
    // marcador, y sin esto se acusaba a si misma. Lo que vigila es el codigo
    // de produccion, que es el que leen las centinelas.
    const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', '__tests__', 'e2e'])
    const raiz = process.cwd()

    const recorrer = (dir: string, acc: string[] = []): string[] => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name.startsWith('.') || OMITIR.has(e.name)) continue
        const completo = path.join(dir, e.name)
        if (e.isDirectory()) recorrer(completo, acc)
        else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) acc.push(completo)
      }
      return acc
    }

    const archivos = recorrer(raiz)
    // Piso medido el 2026-11-17: 8 archivos tienen un `/*` dentro de una
    // cadena. Si este numero baja a cero, el barrido dejo de mirar.
    const conGlob = archivos.filter((f) => /\/\*(?=["'`,])/.test(fs.readFileSync(f, 'utf8')))
    expect(conGlob.length).toBeGreaterThanOrEqual(8)

    /*
     * Comprobación diferencial, sin referencia: el `/*` de una cadena no debe
     * cambiar NADA. Se recorta el archivo tal cual y se recorta otra vez con
     * ese `/*` sustituido por un texto inocuo; las dos salidas tienen que ser
     * la misma.
     *
     * Se llegó aquí después de dos intentos peores, y vale la pena dejarlos
     * escritos porque los dos «pasaban» sin mirar lo que debían:
     *
     *   «conservar más de la mitad de las líneas vivas» acusó a
     *   `sin-comentarios.ts`, que son 91 líneas de las que 64 son su propia
     *   documentación.
     *
     *   «la línea vaciada tiene que empezar por `*`, `//` o `/*`» acusó a la
     *   prosa interior de un comentario y al bloque de `ArmazonAdmin:709`, que
     *   es código comentado a propósito y que por tanto DEBE desaparecer.
     *
     *   Y el escáner de TypeScript, que parecía la referencia buena, se
     *   desincroniza en `.tsx` cuando se le llama sin el analizador: daba por
     *   código decenas de `//` de `FileUploader` y `MediaUpload`.
     */
    const INOCUO = '/_GLOB_'
    const ciegos: string[] = []

    for (const f of conGlob) {
      const crudo = fs.readFileSync(f, 'utf8')
      const neutral = crudo.replace(/\/\*(?=["'`,])/g, INOCUO)

      const conGlobRecortado = sinComentarios(crudo)
      const sinGlobRecortado = sinComentarios(neutral).split(INOCUO).join('/*')

      if (conGlobRecortado !== sinGlobRecortado) {
        const a = conGlobRecortado.split('\n')
        const b = sinGlobRecortado.split('\n')
        const linea = a.findIndex((l, i) => l !== b[i])
        ciegos.push(
          `${path.relative(raiz, f).replace(/\\/g, '/')}:${linea + 1}  ` +
            `esperado ${JSON.stringify(b[linea]?.trim().slice(0, 50))}, ` +
            `obtenido ${JSON.stringify(a[linea]?.trim().slice(0, 50))}`,
        )
      }
    }

    expect(ciegos).toEqual([])
  })
})
