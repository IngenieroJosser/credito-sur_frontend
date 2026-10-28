import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { PANTALLAS_DINAMICAS, PANTALLAS_ESTATICAS } from './pantallas.generado'
import { entrarComo, type Rol } from './sesion'

/**
 * Catálogo visual del sistema: cada vista, cada ruta con detalle y cada modal, EN LOS DOS
 * TAMAÑOS, móvil y escritorio. La salida son las imágenes de `capturas/`, que está en
 * .gitignore: son para llevarlas a Figma, no para el repositorio.
 *
 * No afirma nada: documenta. No falla por lo que encuentre en la pantalla; solo falla si
 * no puede entrar al sistema, porque entonces no habría catálogo.
 *
 * Cuatro decisiones, con su motivo:
 *
 *  1. Cada pantalla se captura con UN rol, el primero que la pueda ver, pero en los dos
 *     tamaños. Capturar las 112 pantallas con los siete roles y dos tamaños da 1.568
 *     imágenes, y la gran mayoría serían la misma pantalla o la redirección a /login.
 *
 *  2. Las dos sesiones de un rol comparten el login. Se entra una vez por formulario y el
 *     segundo contexto se abre con el `storageState` del primero: catorce inicios de
 *     sesión seguidos saturan el backend, y el de móvil no aporta nada distinto.
 *
 *  3. Las rutas con `[id]` no se inventan: se sacan de los enlaces que aparecen en los
 *     listados mientras se recorre. Un id inventado da una pantalla de "no encontrado",
 *     que no es la vista que hay que rediseñar.
 *
 *  4. Los modales se abren pulsando los botones de la pantalla, pero NUNCA se confirma
 *     nada dentro. La lista PELIGROSO de abajo es lo que no se pulsa: estas pruebas
 *     hablan con la base de datos de verdad.
 */

/** Los dos tamaños del catálogo. `movil` cambia también el user agent, no solo el ancho. */
const TAMAÑOS = [
  { nombre: 'movil', viewport: { width: 390, height: 844 }, movil: true },
  { nombre: 'pc', viewport: { width: 1440, height: 900 }, movil: false },
] as const

type Tamaño = (typeof TAMAÑOS)[number]['nombre']

/** Carpeta de salida. Está en .gitignore: las imágenes no van al repositorio. */
const SALIDA = 'capturas'

/**
 * Orden en que se prueban los roles para cada pantalla. De más alcance a menos: así la
 * primera que carga suele ser la del rol que de verdad usa esa pantalla a diario.
 */
const ORDEN: Rol[] = [
  'SUPER_ADMINISTRADOR',
  'ADMIN',
  'COORDINADOR',
  'CONTADOR',
  'SUPERVISOR',
  'COBRADOR',
  'PUNTO_DE_VENTA',
]

/** Qué prefijo de URL es territorio de qué rol, para probar primero el que corresponde. */
const DUEÑO: Array<[string, Rol]> = [
  ['/cobranzas', 'COBRADOR'],
  ['/supervisor', 'SUPERVISOR'],
  ['/coordinador', 'COORDINADOR'],
  ['/contador', 'CONTADOR'],
  ['/contable', 'CONTADOR'],
  ['/punto-de-venta', 'PUNTO_DE_VENTA'],
  ['/admin', 'ADMIN'],
]

const EXCLUIDAS = new Set(['/.', '/test', '/logout', '/login'])

/**
 * Acabar aquí sí es falta de permiso: la app echó al visitante fuera. Cualquier otra
 * redirección es un alias —otra URL para la misma pantalla—, no una puerta cerrada.
 */
const RECHAZO = new Set(['/login', '/', '/unauthorized', '/403', '/sin-permisos'])

/**
 * Pantallas a las que NADIE enlaza: no aparecen citadas ni una vez en `app/`, `components/`,
 * `lib/` ni `hooks/` fuera de su propio archivo. Se capturan igual —existen y responden—,
 * pero en `sin-enlazar/`, para no mezclarlas con las que el sistema usa de verdad.
 *
 * Límite de la medición: busca la ruta escrita entera. Una ruta armada por pedazos
 * (`/admin/${seccion}/nuevo`) saldría aquí sin estar muerta. Antes de borrar ninguna,
 * compruébala a mano.
 *
 * Se midió recorriendo el código y buscando cada una de las 112 rutas del inventario.
 */
const SIN_ENLAZAR = new Set([
  '/admin/articulos/nuevo',
  '/admin/clientes/nuevo',
  '/admin/contable',
  '/admin/contable/cierre-caja',
  '/admin/contable/movimientos/nuevo',
  '/admin/creditos-articulos',
  '/admin/creditos-articulos/nuevo',
  '/admin/creditos/nuevo',
  '/admin/notificaciones',
  '/admin/pagos/registro',
  '/admin/prestamos/nuevo',
  '/admin/rutas/asignacion',
  '/admin/users/nuevo',
  '/cobranzas/auditoria',
  '/cobranzas/backups',
  '/cobranzas/clientes/nuevo',
  '/cobranzas/notificaciones',
  '/cobranzas/prestamos/nuevo',
  '/contador/backups',
  '/contador/notificaciones',
  '/coordinador/aprobaciones',
  '/coordinador/backups',
  '/coordinador/creditos/nuevo',
  '/coordinador/notificaciones',
  '/coordinador/rutas/asignacion',
  '/coordinador/sistema/sincronizacion',
  '/punto-de-venta/backups',
  '/punto-de-venta/creditos-articulos/nuevo',
  '/punto-de-venta/notificaciones',
  '/supervisor/auditoria',
  '/supervisor/backups',
  '/supervisor/clientes/nuevo',
  '/supervisor/creditos-articulos/nuevo',
  '/supervisor/creditos/nuevo',
  '/supervisor/notificaciones',
  '/supervisor/prestamos/nuevo',
  '/supervisor/reportes/operativos',
])

/**
 * Lo que NO se pulsa. Abrir un modal es inofensivo; confirmar dentro de él escribe en la
 * base de datos. Se filtra por el texto del botón porque es lo único que hay en común
 * entre pantallas hechas en momentos distintos.
 */
const PELIGROSO =
  /elimin|borr|aprob|rechaz|confirm|guard|registr|anul|revert|cerrar jornada|desactiv|activar|enviar|pagar|abonar|crear|actualiz|import|sincroniz|descarg|exportar|salir|cerrar sesi/i

/**
 * Botones que no son del sistema: el indicador de desarrollo de Next.js, que se monta en
 * todas las pantallas y cuyo texto es "N Issues". Pulsarlo abre el panel de errores de
 * Next, y la captura que sale es ese panel, no una pantalla de CrediSur.
 */
const NO_ES_DEL_SISTEMA = /^\d*\s*issues?$/i

/**
 * Etiquetas que se probaron en tres pantallas distintas y nunca abrieron un modal: son de
 * la navegación compartida —el menú, el tema, la campanita, el perfil—, y están en las 110
 * pantallas. Probarlas una y otra vez es el grueso del tiempo del recorrido.
 *
 * Vive fuera de la función a propósito: lo aprendido en una pantalla sirve en la siguiente.
 */
const NUNCA_ABREN = new Set<string>()
const fallosPorEtiqueta = new Map<string, number>()

/**
 * CSS que esconde el indicador de desarrollo de Next.js.
 *
 * Va en todas las capturas porque es un elemento fijo: en una captura de página completa
 * sale en la esquina de CADA imagen, y estas imágenes son para llevarlas a diseño.
 */
const OCULTAR_HERRAMIENTAS = `
  nextjs-portal,
  [data-nextjs-toast],
  #__next-build-watcher,
  [data-next-badge-root] { display: none !important; }
`

type Ficha = {
  archivo: string
  pantalla: string
  rol: Rol
  tamaño: Tamaño
  tipo: string
  /** La pantalla salió casi sin texto: la captura no sirve y hay que repetirla a mano. */
  vacia?: boolean
}

const nombrar = (texto: string) =>
  texto.replace(/^\//, '').replace(/[/[\]]/g, '-').replace(/-+/g, '-') || 'inicio'

/**
 * Mínimo que se espera siempre, aunque la pantalla parezca lista. Una pantalla puede estar
 * "quieta" y seguir pintando: los números entran por una segunda petición y una animación
 * de entrada tarda su tiempo. Esto es el suelo, no el techo.
 */
const ESPERA_MINIMA = 2500
const ESPERA_MINIMA_MODAL = 3500

/** Cuánto texto hay pintado. Sirve para saber si la pantalla ya tiene contenido. */
const medirTexto = (page: Page, dentroDe?: string) =>
  page
    .evaluate((sel) => {
      const raiz = sel ? document.querySelector(sel) : document.body
      return ((raiz as HTMLElement | null)?.innerText || '').trim().length
    }, dentroDe ?? null)
    .catch(() => 0)

/**
 * Espera a que lo que se va a capturar DEJE DE CAMBIAR.
 *
 * Un tiempo fijo no vale: con 800 ms se capturaban modales a medio pintar, y subirlo a un
 * número grande para todos convierte un recorrido de 112 pantallas en horas muertas. Lo
 * que se hace es medir el texto pintado cada 700 ms y dar la pantalla por lista cuando dos
 * medidas seguidas dan lo mismo —ya no entra nada nuevo—, con un mínimo y un máximo.
 *
 * `dentroDe` limita la medida al modal: el texto de la pantalla de atrás no cambia, así
 * que mirando el documento entero un modal vacío parecería estable desde el primer
 * instante. Es justo el fallo que producía las capturas de modales en blanco.
 */
async function esperarQuieta(
  page: Page,
  { dentroDe, minimo = ESPERA_MINIMA, maximo = 25000 }: {
    dentroDe?: string
    minimo?: number
    maximo?: number
  } = {},
): Promise<number> {
  // `networkidle` NO se usa como barrera. Medido con una sonda: tarda 13,7 s en /admin y
  // 6,8 s en /admin/auditoria —la app mantiene un socket y peticiones de fondo—, y eso se
  // pagaba en cada navegación Y en cada modal. Lo que de verdad dice si la pantalla está
  // lista es que deje de entrar texto, y eso es lo que mide el bucle de abajo.
  await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {})
  await page
    .getByText(/Cargando sesi/i)
    .waitFor({ state: 'detached', timeout: 15000 })
    .catch(() => {})

  const arranque = Date.now()
  let anterior = -1
  let estables = 0
  let texto = 0

  while (Date.now() - arranque < maximo) {
    texto = await medirTexto(page, dentroDe)
    estables = texto === anterior && texto > 0 ? estables + 1 : 0
    anterior = texto
    // Dos medidas iguales seguidas y el mínimo cumplido: ya no va a cambiar más.
    if (estables >= 2 && Date.now() - arranque >= minimo) break
    await page.waitForTimeout(700)
  }

  // El mínimo se respeta aunque la pantalla se estabilizara enseguida: las animaciones de
  // entrada no mueven el texto y salen a medio camino en la captura.
  const falta = minimo - (Date.now() - arranque)
  if (falta > 0) await page.waitForTimeout(falta)

  // Las fuentes a medio cargar dejan el texto desplazado en la imagen.
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  // El indicador de Next se monta después de la hidratación, así que el CSS que lo
  // esconde se vuelve a poner aquí: al recargar, el de la navegación anterior se fue.
  await page.addStyleTag({ content: OCULTAR_HERRAMIENTAS }).catch(() => {})
  return texto
}

/** Espera a que la pantalla pida sus datos y pinte. Un esqueleto de carga no sirve. */
const asentar = (page: Page) => esperarQuieta(page)

/**
 * Captura, y si lo que se va a fotografiar salió prácticamente vacío insiste una vez más.
 *
 * Por qué: en la primera corrida salieron cuatro PNG de exactamente 19.307 bytes —el mismo
 * tamaño en pantallas distintas, o sea la misma imagen en blanco—. La causa de ESA tanda
 * fue que había dos recorridos a la vez contra el mismo servidor. Pero una pantalla lenta
 * da el mismo síntoma, así que la captura comprueba que haya algo pintado antes de darla
 * por buena, y lo anota en el índice si aun así quedó vacía.
 */
async function capturaFiable(
  page: Page,
  archivo: string,
  dentroDe?: string,
): Promise<number> {
  let texto = await medirTexto(page, dentroDe)
  if (texto < 200) {
    // Aquí sí se espera a que la red se calme: es el caso raro —la pantalla salió vacía—
    // y vale la pena pagar los segundos antes de dar la captura por mala.
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
    texto = await esperarQuieta(page, { dentroDe, minimo: 4000, maximo: 20000 })
  }
  await page.screenshot({ path: archivo, fullPage: true }).catch(() => {})
  return texto
}

/**
 * Abre los modales de la pantalla y captura cada uno.
 *
 * Se vuelve a leer la lista de botones en cada vuelta porque abrir un modal cambia el
 * árbol: un índice guardado de antes apunta a otro botón, o a ninguno.
 */
async function capturarModales(
  page: Page,
  pantalla: string,
  destino: string,
  rol: Rol,
  tamaño: Tamaño,
  fichas: Ficha[],
  carpeta: string,
): Promise<void> {
  // Las etiquetas se leen TODAS de una vez, en una sola evaluación. Preguntarle a
  // Playwright botón por botón si es visible y qué dice costaba un segundo por botón
  // antes siquiera de pulsar ninguno.
  const etiquetas: string[] = await page
    .evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .filter((b) => {
          const r = b.getBoundingClientRect()
          return r.width > 0 && r.height > 0
        })
        .map((b) => (b.textContent || '').trim()),
    )
    .catch(() => [])

  const candidatos = etiquetas.filter(
    (e, i) =>
      e &&
      e.length <= 40 &&
      !NO_ES_DEL_SISTEMA.test(e) &&
      !PELIGROSO.test(e) &&
      !NUNCA_ABREN.has(e) &&
      etiquetas.indexOf(e) === i,
  )

  for (const etiqueta of candidatos.slice(0, 25)) {
    const boton = page.getByRole('button', { name: etiqueta, exact: true }).first()

    try {
      await boton.click({ timeout: 2000 })
    } catch {
      continue
    }

    const dialogo = page.getByRole('dialog').first()
    // 1,2 s basta: un modal se monta al instante, lo que tarda son sus datos, y eso se
    // espera DESPUÉS. Con 2,5 s aquí, cada botón que no abría nada —la mayoría— se
    // llevaba ese tiempo entero.
    const aparecio = await dialogo
      .waitFor({ state: 'visible', timeout: 1200 })
      .then(() => true)
      .catch(() => false)

    // Un botón que no abrió modal en varias pantallas distintas es de la navegación
    // compartida —el menú, el tema, la campanita— y se repite en las 110. Tras tres
    // intentos fallidos se deja de probar: es la diferencia entre horas y minutos.
    if (!aparecio) {
      const fallos = (fallosPorEtiqueta.get(etiqueta) ?? 0) + 1
      fallosPorEtiqueta.set(etiqueta, fallos)
      if (fallos >= 3) NUNCA_ABREN.add(etiqueta)
    }

    if (aparecio) {
      // El modal pide sus propios datos al abrirse, asi que se espera a que DEL MODAL deje
      // de entrar texto, no de la pantalla entera: la de atras ya esta quieta y daria el
      // modal por listo en el primer instante, que es justo lo que salia medio pintado.
      await esperarQuieta(page, {
        dentroDe: '[role="dialog"]',
        minimo: ESPERA_MINIMA_MODAL,
      })
      const archivo = `${SALIDA}/${carpeta}modal--${nombrar(pantalla)}--${nombrar(etiqueta)}__${tamaño}.png`
      const texto = await capturaFiable(page, archivo, '[role="dialog"]')
      fichas.push({
        archivo,
        pantalla,
        rol,
        tamaño,
        tipo: `modal: ${etiqueta}`,
        ...(texto < 60 ? { vacia: true } : {}),
      })
    }

    // Se cierra siempre, haya salido modal o no: si el clic abrió un panel lateral o un
    // menú, dejarlo abierto contamina la captura del botón siguiente. Pero solo se ESPERA
    // a que se cierre cuando hubo algo que cerrar; esperar tres segundos a que se oculte
    // un diálogo que nunca apareció era el mayor gasto del recorrido.
    await page.keyboard.press('Escape').catch(() => {})
    if (aparecio) {
      await dialogo.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(500)
    } else {
      await page.waitForTimeout(150)
    }

    // Si el clic navegó a otro lado, se vuelve: el recorrido es de ESTA pantalla.
    if (new URL(page.url()).pathname !== destino) {
      await page.goto(destino, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await asentar(page)
    }
  }
}

/** Los enlaces de la pantalla que encajan en alguna ruta con `[id]`. */
async function cosecharEnlaces(page: Page, cosecha: Map<string, string>) {
  const hrefs = await page
    .locator('a[href^="/"]')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href') || ''))
    .catch(() => [] as string[])

  for (const patron of PANTALLAS_DINAMICAS) {
    if (cosecha.has(patron)) continue
    const regex = new RegExp(`^${patron.replace(/\[\w+\]/g, '[^/]+')}$`)
    const encontrado = hrefs.find((h) => regex.test(h.split('?')[0]))
    if (encontrado) cosecha.set(patron, encontrado.split('?')[0])
  }
}

/** Abre las dos sesiones de un rol —móvil y escritorio— con un solo inicio de sesión. */
async function abrirSesiones(browser: Browser, rol: Rol) {
  const comunes = { locale: 'es-CO', timezoneId: 'America/Bogota', deviceScaleFactor: 2 }
  const pc = TAMAÑOS[1]
  const contextoPc = await browser.newContext({ ...comunes, viewport: pc.viewport })
  const paginaPc = await contextoPc.newPage()
  await entrarComo(paginaPc, rol)

  // El segundo contexto hereda la sesión en vez de volver a entrar por el formulario.
  const estado = await contextoPc.storageState()
  const mv = TAMAÑOS[0]
  const contextoMovil = await browser.newContext({
    ...comunes,
    viewport: mv.viewport,
    isMobile: true,
    hasTouch: true,
    storageState: estado,
  })
  const paginaMovil = await contextoMovil.newPage()

  return { pc: paginaPc, movil: paginaMovil }
}

test('catálogo visual: cada vista y cada modal, en móvil y en pc', async ({ browser }) => {
  test.setTimeout(180 * 60_000)
  // Todo plano en `capturas/`: el tamaño va en el nombre del archivo, así las dos versiones
  // de una misma pantalla quedan juntas al ordenar. La única subcarpeta es la de las
  // pantallas que nadie enlaza, que es lo que de verdad conviene tener aparte.
  mkdirSync(`${SALIDA}/sin-enlazar`, { recursive: true })

  const fichas: Ficha[] = []
  const sinAcceso: string[] = []
  const cosecha = new Map<string, string>()

  /** URL final ya capturada → la ruta del inventario con la que se capturó. */
  const capturadasPorUrl = new Map<string, string>()
  /** Rutas distintas que terminan en la misma pantalla. */
  const alias: Array<{ ruta: string; esLoMismoQue: string; urlReal: string }> = []

  /**
   * El recorrido entero no cabe en una sola sesion: 110 pantallas por dos tamanos, con sus
   * modales, son horas. Cada pantalla terminada se anota aqui, y al arrancar se saltan las
   * que ya estan, asi se puede continuar donde se quedo en vez de empezar de cero.
   *
   * Para rehacerlo todo, basta con borrar la carpeta `capturas/`.
   */
  const AVANCE = `${SALIDA}/hechas.txt`
  const hechas = new Set(
    existsSync(AVANCE)
      ? readFileSync(AVANCE, 'utf8')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
      : [],
  )
  if (hechas.size > 0) console.log(`continuando: ${hechas.size} pantallas ya capturadas`)

  /** Deja constancia de que esta pantalla ya está, para que la próxima corrida la salte. */
  const anotarAvance = (ruta: string) => appendFileSync(AVANCE, `${ruta}\n`)

  // Las sesiones se abren todas de una vez: volver a entrar en cada pantalla costaba más
  // que el recorrido entero, y satura el backend.
  const sesiones = new Map<Rol, { pc: Page; movil: Page }>()
  for (const rol of ORDEN) sesiones.set(rol, await abrirSesiones(browser, rol))
  expect(sesiones.size, 'no se pudo entrar con todos los roles').toBe(ORDEN.length)

  /** Captura una ruta con el primer rol que la pueda ver, en los dos tamaños. */
  async function capturar(ruta: string, destino: string) {
    if (hechas.has(ruta)) return
    const prefijo = DUEÑO.find(([p]) => ruta.startsWith(p))
    const candidatos = prefijo
      ? [prefijo[1], ...ORDEN.filter((r) => r !== prefijo[1])]
      : ORDEN

    for (const rol of candidatos) {
      const sesion = sesiones.get(rol)
      if (!sesion) continue

      // Quién tiene acceso se decide una vez, en escritorio; el permiso no depende del
      // tamaño de la pantalla, y probarlo dos veces duplicaría el recorrido entero.
      try {
        await sesion.pc.goto(destino, { waitUntil: 'domcontentloaded', timeout: 30000 })
      } catch {
        continue
      }
      await asentar(sesion.pc)

      // Una redirección NO significa que falte el permiso. Medido con una sonda: la app
      // manda `/admin/clientes` a `/clientes` con HTTP 200 —son alias del mismo listado—,
      // y la comprobación anterior, que exigía que la URL no cambiara, daba por "sin
      // acceso" media sección de administración. Lo que sí indica falta de permiso es
      // acabar en el login o en la raíz.
      const final = new URL(sesion.pc.url()).pathname
      if (RECHAZO.has(final)) continue

      // Si esa URL final ya se capturó desde otra ruta, esta es un alias: se anota y no se
      // fotografía otra vez la misma pantalla.
      const yaEsta = capturadasPorUrl.get(final)
      if (yaEsta && yaEsta !== ruta) {
        alias.push({ ruta, esLoMismoQue: yaEsta, urlReal: final })
        hechas.add(ruta)
        anotarAvance(ruta)
        console.log(`= ${ruta} → ${final} (ya capturada como ${yaEsta})`)
        return
      }
      capturadasPorUrl.set(final, ruta)

      await cosecharEnlaces(sesion.pc, cosecha)

      // Las que nadie enlaza van aparte: existen, pero no son el sistema que se usa.
      const carpeta = SIN_ENLAZAR.has(ruta) ? 'sin-enlazar/' : ''
      let vacias = 0

      // Los dos tamaños van a la vez. Son dos contextos independientes, así que no se
      // estorban, y el recorrido pasa de ~2,5 min por pantalla a cerca de la mitad: casi
      // todo ese tiempo es esperar a que la pantalla pinte, y esperar dos veces seguidas
      // lo mismo no aporta nada.
      const recorrerTamaño = async (t: (typeof TAMAÑOS)[number]) => {
        const page = t.nombre === 'pc' ? sesion.pc : sesion.movil
        if (t.nombre !== 'pc') {
          await page
            .goto(destino, { waitUntil: 'domcontentloaded', timeout: 30000 })
            .catch(() => {})
          await asentar(page)
        }
        const archivo = `${SALIDA}/${carpeta}${nombrar(ruta)}__${rol}__${t.nombre}.png`
        const texto = await capturaFiable(page, archivo)
        if (texto < 200) vacias += 1
        fichas.push({
          archivo,
          pantalla: ruta,
          rol,
          tamaño: t.nombre,
          tipo: 'vista',
          ...(texto < 200 ? { vacia: true } : {}),
        })
        await capturarModales(page, ruta, destino, rol, t.nombre, fichas, carpeta)
      }
      await Promise.all(TAMAÑOS.map(recorrerTamaño))

      hechas.add(ruta)
      anotarAvance(ruta)

      // Respiro entre pantallas. Medido: el límite del backend son 300 peticiones por
      // minuto y por usuario (RATE_LIMIT_DEFAULT_MAX), y un tablero pide unas 25 al
      // cargar. Dos sesiones del mismo usuario recargando sin pausa pasan de ahí, y el
      // 429 sale pintado en la captura. A un usuario normal no le ocurre: tendría que
      // recargar doce pantallas completas en un minuto.
      // Ahora los dos tamanos piden a la vez, asi que el respiro sube para compensar.
      await sesion.pc.waitForTimeout(2500)

      console.log(
        `✓ ${ruta} (${rol})${carpeta ? ' [sin enlazar]' : ''}${vacias ? ` ⚠ ${vacias} vacía(s)` : ''}`,
      )
      return
    }
    sinAcceso.push(ruta)
    hechas.add(ruta)
    anotarAvance(ruta)
    console.log(`· ${ruta} — ningún rol la pudo abrir`)
  }

  for (const pantalla of PANTALLAS_ESTATICAS) {
    if (EXCLUIDAS.has(pantalla)) continue
    await capturar(pantalla, pantalla)
  }

  // Ahora las rutas con detalle, con los ids que aparecieron de verdad en los listados.
  for (const [patron, real] of cosecha) {
    await capturar(patron, real)
  }
  const sinEjemplo = PANTALLAS_DINAMICAS.filter((p) => !cosecha.has(p))

  const cuenta = (tipo: 'vista' | 'modal', tamaño: Tamaño) =>
    fichas.filter((f) => f.tamaño === tamaño && f.tipo.startsWith(tipo)).length

  const indice = {
    completo: true,
    generado: new Date().toISOString(),
    vistas: { movil: cuenta('vista', 'movil'), pc: cuenta('vista', 'pc') },
    modales: { movil: cuenta('modal', 'movil'), pc: cuenta('modal', 'pc') },
    vacias: fichas.filter((f) => f.vacia).map((f) => f.archivo),
    alias,
    sinEnlazar: [...SIN_ENLAZAR],
    sinAcceso,
    sinEjemplo,
    fichas,
  }
  writeFileSync(`${SALIDA}/indice.json`, JSON.stringify(indice, null, 1))
  console.log(
    `\nvistas: ${indice.vistas.pc} en pc, ${indice.vistas.movil} en móvil. ` +
      `modales: ${indice.modales.pc} en pc, ${indice.modales.movil} en móvil. ` +
      `${sinAcceso.length} sin acceso, ${sinEjemplo.length} rutas con [id] sin ejemplo.`,
  )
})
