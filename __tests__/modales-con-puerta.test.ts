import * as fs from 'fs'
import * as path from 'path'

import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Todo modal tiene que tener una puerta.
 *
 * ── Lo que había ────────────────────────────────────────────────────────────
 *
 * Diez modales montados, con su formulario y su `onConfirm`, y nada en toda la
 * pantalla que los abriera: el `useState` existía, el JSX existía, y las
 * únicas llamadas al setter eran las de cerrar. Puertas tapiadas por dentro.
 *
 * Los diez no eran el mismo caso, y por eso importa distinguirlos:
 *
 *   - Dos eran una PUERTA QUE FALTABA. El `CrearCreditoModal` y el
 *     `NuevoClienteModal` del panel del admin tenían su POST, su aviso y su
 *     `router.refresh()`; lo que no había era el botón. Igual el
 *     `ReprogramarModal` del coordinador, que llama de verdad a
 *     `solicitarReprogramacionCuota` y que el backend le autoriza.
 *
 *   - Los otros eran código que NO DEBÍA despertar. Dos formularios de gasto
 *     cuyo `onSubmit` solo hacía `logger.log`; un modal que pedía elegir la
 *     caja destino y llamaba a `consolidarCaja(id, undefined, key)` —donde el
 *     segundo parámetro es el monto, no el destino— y luego avisaba «Dinero
 *     enviado a» la caja elegida; y el borrado de cliente del cobrador, que
 *     `DELETE /clients/:id` no autoriza a su rol.
 *
 * La diferencia entre los dos grupos no la ve ninguna prueba: la decidió quien
 * leyó cada caso. Lo que esta centinela vigila es lo único mecánico que tenían
 * en común —que nadie los abría—, para que el siguiente se vea el mismo día en
 * que se escribe y no dentro de un año.
 *
 * ── Cómo ────────────────────────────────────────────────────────────────────
 *
 * Un estado de modal está tapiado si su setter:
 *
 *   1. nunca se llama con un valor de apertura (solo `false`, `null`,
 *      `undefined` o nada), y
 *   2. nunca se menciona SIN paréntesis, que es como se entrega a otro: por
 *      contexto, por props o en un `useMemo`.
 *
 * La segunda condición es la que salva a `NotificacionesProvider`, cuyo
 * `setShowDropdown` viaja en el valor del contexto y lo abre `ArmazonAdmin`.
 * Sin ella la centinela acusaría a un modal que funciona.
 */

const RAIZ = process.cwd()
const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', '__tests__', 'e2e'])

const archivosTsx = (dir: string, acc: string[] = []): string[] => {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name.startsWith('.') || OMITIR.has(entrada.name)) continue
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) archivosTsx(completo, acc)
    else if (entrada.name.endsWith('.tsx')) acc.push(completo)
  }
  return acc
}

/** `const [showAlgo, setShowAlgo] = useState` y sus variantes de nombre. */
const DECLARACION =
  /const \[(\w*(?:[Mm]odal|[Ss]how\w*|visita\w*|Detalle\w*)\w*),\s*(set\w+)\]\s*=\s*useState/g

const CIERRES = new Set(['', 'null', 'false', 'undefined'])

type Hallazgo = { archivo: string; linea: number; estado: string }

const barrer = () => {
  const hallazgos: Hallazgo[] = []
  let revisados = 0
  let estadosVistos = 0

  for (const completo of archivosTsx(RAIZ)) {
    const codigo = sinComentarios(fs.readFileSync(completo, 'utf8'))
    revisados += 1

    /*
     * Sin esto la centinela no mira nada, y lo descubrió la comprobación al
     * revés: en `const [showX, setShowX] = useState(...)` el setter va seguido
     * de `]`, no de `(`, así que la prueba de «se entrega a otro» casaba con la
     * propia declaración de TODOS los estados y los saltaba uno por uno. Pasaba
     * en verde con el defecto puesto a mano.
     */
    const sinDeclaraciones = codigo.replace(new RegExp(DECLARACION.source, 'g'), '')

    for (const m of codigo.matchAll(DECLARACION)) {
      const [, estado, setter] = m
      estadosVistos += 1

      // ¿Se entrega a otro sin llamarlo? Entonces quien lo abre está fuera.
      const entregado = new RegExp(`\\b${setter}\\b(?!\\s*\\()`).test(sinDeclaraciones)
      if (entregado) continue

      const llamadas = [...codigo.matchAll(new RegExp(`\\b${setter}\\(([^)]*)`, 'g'))].map((c) =>
        c[1].trim(),
      )

      // `setX(prev => ...)` es una apertura calculada; cuenta como puerta.
      const abre = llamadas.filter((c) => !CIERRES.has(c) || c.includes('=>'))
      if (abre.length > 0) continue

      hallazgos.push({
        archivo: path.relative(RAIZ, completo).replace(/\\/g, '/'),
        linea: codigo.slice(0, m.index).split('\n').length,
        estado,
      })
    }
  }

  return { hallazgos, revisados, estadosVistos }
}

describe('todo modal tiene una puerta que lo abre', () => {
  const { hallazgos, revisados, estadosVistos } = barrer()

  it('la centinela está mirando de verdad', () => {
    // Pisos MEDIDOS el 2026-11-17: 308 archivos .tsx y 165 estados de modal
    // (163 los ve esta prueba, porque `sinComentarios` deja fuera los dos que
    // ahora viven dentro de un comentario que explica por qué se quitaron).
    // Si el barrido se rompe —una ruta mal armada, un `readdirSync` que no
    // entra—, los dos números caen a cero y la prueba pasaría sin haber
    // leído nada.
    expect(revisados).toBeGreaterThan(280)
    expect(estadosVistos).toBeGreaterThan(150)
  })

  it('ningún estado de modal se queda sin nada que lo abra', () => {
    const descritos = hallazgos.map((h) => `${h.archivo}:${h.linea}  ${h.estado}`)
    expect(descritos).toEqual([])
  })

  it('reconoce como puerta el setter que se entrega por contexto', () => {
    // El caso real que motivó la segunda condición: si se quitara, este
    // archivo volvería a salir acusado aunque su menú funciona.
    const codigo = sinComentarios(
      fs.readFileSync(path.join(RAIZ, 'components/providers/NotificacionesProvider.tsx'), 'utf8'),
    )
    const sinDeclaraciones = codigo.replace(new RegExp(DECLARACION.source, 'g'), '')
    expect(/\bsetShowDropdown\b(?!\s*\()/.test(sinDeclaraciones)).toBe(true)
    expect(hallazgos.some((h) => h.archivo.includes('NotificacionesProvider'))).toBe(false)
  })
})
