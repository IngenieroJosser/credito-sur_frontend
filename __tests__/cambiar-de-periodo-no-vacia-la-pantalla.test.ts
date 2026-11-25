import fs from 'fs'
import path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Cambiar de periodo no vacía la pantalla ni miente con las cifras viejas.
 *
 * ── Los dos defectos, que eran opuestos ───────────────────────────────────
 *
 * Lo pidió el dueño: «evitar recargar pantallas al máximo, por ejemplo al
 * cambiar de mes a año en el dashboard de superadmin». Medido sobre el repo:
 * de las **ocho** vistas que usan el selector de periodo, solo **dos** tenían
 * problema, y cada una el contrario de la otra.
 *
 *  - **`/admin`** hacía `dashboardData: null` al cambiar de periodo, con el
 *    motivo escrito al lado: «borrar datos anteriores para no mostrar datos de
 *    otro período». El motivo es bueno, la solución no: la pantalla entera se
 *    iba al esqueleto. Y `/dashboard` tarda entre 2,7 y 3,8 s con 2.000
 *    clientes, así que cambiar un filtro costaba segundos de pantalla vacía.
 *
 *  - **`/coordinador`** no vaciaba nada… y tampoco volvía a encender el
 *    `isLoading`. Así que se quedaba mostrando las cifras del periodo
 *    anterior **en silencio**, con el selector ya en el nuevo.
 *
 * ── Lo que se hizo ────────────────────────────────────────────────────────
 *
 * Los datos se quedan en pantalla, atenuados y sin recibir clics, con un aviso
 * que dice a qué periodo se está cambiando y que las cifras de abajo son
 * todavía las del anterior (`components/ui/AvisoActualizando.tsx`). Así se
 * respeta el motivo original —no mostrar las cifras de un periodo como si
 * fueran de otro— sin vaciar nada.
 *
 * El esqueleto queda solo para la primera carga, que es cuando de verdad no
 * hay nada que mostrar.
 *
 * ── Por qué una prueba que lee los archivos ───────────────────────────────
 *
 * Son dos páginas de más de 400 líneas con `localStorage`, router, sockets y
 * cinco servicios: montarlas en jsdom para comprobar un flujo de estado
 * costaría más de lo que vigila. Lo que no puede volver es el `null` al
 * cambiar de periodo y el silencio del otro, y eso se lee. Cada aserción está
 * comprobada al revés.
 */
const RAIZ = process.cwd()

const leer = (...partes: string[]) =>
  sinComentarios(fs.readFileSync(path.join(RAIZ, ...partes), 'utf8'))

const ADMIN = leer('app', 'admin', 'page.tsx')
const COORDINADOR = leer('app', 'coordinador', 'page.tsx')
const AVISO = leer('components', 'ui', 'AvisoActualizando.tsx')

describe('los dos paneles conservan lo que hay al cambiar de periodo', () => {
  it.each([
    ['admin', ADMIN],
    ['coordinador', COORDINADOR],
  ])('%s marca que está actualizando en vez de vaciar', (_cual, fuente) => {
    // Piso: si el archivo no se leyera, todas las aserciones pasarían en vacío.
    expect(fuente.length).toBeGreaterThan(5_000)

    expect(fuente).toMatch(/actualizando: !!prev\.dashboardData/)
    expect(fuente).toMatch(/AvisoActualizando/)
  })

  it('el de admin ya no borra los datos al recargar por periodo', () => {
    /*
     * La aserción que importa. `dashboardData: null` sigue existiendo en el
     * estado inicial y en la rama de redirección —ahí es correcto—, así que se
     * mira el bloque que corre al cambiar de periodo: el `setState` que lleva
     * el `actualizando`.
     */
    const i = ADMIN.indexOf('actualizando: !!prev.dashboardData')
    expect(i).toBeGreaterThan(0)
    const bloque = ADMIN.slice(Math.max(0, i - 400), i + 200)
    expect(bloque.length).toBeGreaterThan(400)
    expect(bloque).not.toMatch(/dashboardData: null/)
  })

  it('el contenedor se atenúa y no recibe clics mientras actualiza', () => {
    /*
     * Sin esto, las cifras del periodo anterior se verían como definitivas y
     * se podría pulsar sobre ellas. Es la mitad honesta del cambio: los datos
     * se conservan, pero no se presentan como los nuevos.
     */
    for (const fuente of [ADMIN, COORDINADOR]) {
      expect(fuente).toMatch(/pointer-events-none opacity-60/)
      expect(fuente).toMatch(/aria-busy=\{state\.actualizando\}/)
    }
  })

  it('el esqueleto se reserva para la primera carga', () => {
    // `isLoading` solo si no hay datos: con datos, se actualiza en caliente.
    expect(ADMIN).toMatch(/isLoading: prev\.dashboardData \? false : true/)
  })

  it('un fallo al actualizar no borra lo que ya se estaba leyendo', () => {
    // El panel de error completo, solo cuando no hay NADA que mostrar.
    for (const fuente of [ADMIN, COORDINADOR]) {
      expect(fuente).toMatch(/state\.errorCarga && !state\.dashboardData/)
    }
  })
})

describe('el aviso dice la verdad sobre lo que se está viendo', () => {
  it('nombra el periodo al que se cambia', () => {
    expect(AVISO).toMatch(/nombreDePeriodo/)
  })

  it('dice que las cifras son todavía las del periodo anterior', () => {
    /*
     * Es la frase que evita la mentira: sin ella, ver «Año» en el selector y
     * las cifras del mes es indistinguible de un dato correcto.
     */
    expect(AVISO).toMatch(/del\s*\n?\s*periodo anterior|periodo anterior/)
  })

  it('y en la variante de fallo lo dice también', () => {
    const i = AVISO.indexOf('if (fallo)')
    expect(i).toBeGreaterThan(0)
    const bloque = AVISO.slice(i, i + 1200)
    expect(bloque).toMatch(/periodo anterior/)
  })
})

describe('las etiquetas de periodo viven en un solo sitio', () => {
  const FILTRO = leer('components', 'ui', 'TimeFilter.tsx')

  it('`TimeFilter` las exporta y las usa', () => {
    /*
     * Estaban dentro del componente, así que el aviso habría necesitado una
     * segunda copia. Seis implementaciones del formateo de pesos ya enseñaron
     * cómo acaba eso.
     */
    expect(FILTRO).toMatch(/export const PERIODOS/)
    expect(FILTRO).toMatch(/const periods = PERIODOS/)
  })

  it('y no hay una segunda lista escrita a mano en el aviso', () => {
    expect(AVISO).not.toMatch(/fullLabel/)
    expect(AVISO).not.toMatch(/'Semana'/)
  })
})
