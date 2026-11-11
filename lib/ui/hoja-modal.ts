/**
 * Cómo se ve un diálogo: hoja desde abajo en el móvil, tarjeta centrada en el
 * escritorio.
 *
 * ── El problema ─────────────────────────────────────────────────────────────
 *
 * Medido: 102 componentes pintan su propio contenedor `fixed inset-0`, y solo
 * 27 anclan el panel abajo en pantallas pequeñas. Los otros 75 salen centrados
 * también en el móvil, que es donde trabaja el cobrador. Un diálogo centrado en
 * un teléfono es incómodo por tres razones concretas:
 *
 *  - Queda lejos del pulgar. Los botones de confirmar acaban en la mitad de la
 *    pantalla, donde la mano no llega sin recolocar el teléfono.
 *  - Deja franjas de fondo arriba y abajo, y tocar ahí por error cierra el
 *    diálogo a mitad de registrar un pago.
 *  - Cuando sale el teclado, el panel centrado se parte: la mitad de arriba se
 *    va fuera de la pantalla y el campo que se está llenando se esconde.
 *
 * Una hoja anclada abajo resuelve los tres, y además es lo que la gente ya
 * conoce de cualquier aplicación del teléfono: aparece desde el borde, los
 * botones quedan donde está el pulgar y el teclado la empuja sin romperla.
 *
 * ── Por qué son cadenas de clases y no un componente ────────────────────────
 *
 * Porque hay 102 diálogos escritos a mano. Un componente nuevo obligaría a
 * reescribir cada uno —mover su cabecera, su cuerpo y sus botones adentro—, y
 * eso es un cambio grande en 102 archivos que manejan dinero. Con las clases,
 * adoptar el comportamiento es cambiar una línea por diálogo, que sí se puede
 * hacer y revisar.
 *
 * `components/ui/Modal.tsx` SÍ es un componente y usa esto por dentro: lo que
 * se escriba nuevo debería usar ese y no pintar otra caja.
 *
 * ── Los detalles que importan ───────────────────────────────────────────────
 *
 * `100dvh` y no `100vh`: en el móvil, `vh` cuenta la barra de direcciones del
 * navegador como si no estuviera, así que el panel queda más alto que la
 * pantalla y el último botón se va por debajo del borde. `dvh` mide lo que de
 * verdad se ve.
 *
 * `pb-[env(safe-area-inset-bottom)]`: en los teléfonos con barra de inicio en
 * pantalla, los últimos píxeles están tapados. Sin esto, el botón de confirmar
 * queda debajo de la barra del sistema.
 *
 * `motion-reduce:animate-none`: quien pidió menos movimiento en su teléfono no
 * ve la hoja deslizarse. No es un adorno; para algunas personas el movimiento
 * marea.
 */

/**
 * El fondo oscuro que cubre la pantalla y coloca el panel.
 *
 * Abajo y a todo el ancho en el móvil (`items-end`, `p-0`); centrado con
 * margen desde `sm` en adelante.
 */
export const FONDO_HOJA_MODAL =
  'fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none sm:items-center sm:p-4'

/**
 * El panel del diálogo.
 *
 * Esquinas redondeadas solo arriba en el móvil —está pegado al borde inferior,
 * redondearlo abajo deja dos muescas de fondo— y redondeado entero en
 * escritorio. Entra deslizándose desde abajo en el móvil y con un zoom corto en
 * escritorio.
 *
 * El ancho máximo NO va aquí: lo decide cada diálogo (`max-w-md`, `max-w-2xl`…)
 * según lo que tenga que mostrar.
 */
export const PANEL_HOJA_MODAL =
  'relative flex w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl max-h-[100dvh] pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-300 ease-out motion-reduce:animate-none focus:outline-none sm:max-h-[90dvh] sm:rounded-2xl sm:pb-0 sm:slide-in-from-bottom-2 sm:zoom-in-95 sm:duration-200'

/**
 * La barra de arrastre de la parte de arriba, solo visible en el móvil.
 *
 * No arrastra nada: es la señal de que eso es una hoja que se cierra hacia
 * abajo. Está en todas las aplicaciones del teléfono y la gente la reconoce sin
 * que nadie le explique. Se oculta desde `sm` porque en escritorio no
 * significa nada.
 *
 * Va con `aria-hidden`: es decoración, y un lector de pantalla no debe
 * anunciarla.
 */
export const BARRA_DE_ARRASTRE =
  'mx-auto mt-2 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden'

/**
 * El cuerpo que puede crecer, con desplazamiento propio.
 *
 * `min-h-0` es lo que hace que funcione dentro de un `flex-col`: sin él, un
 * hijo con mucho contenido empuja el panel más allá de su alto máximo y la
 * cabecera y los botones se van fuera de la pantalla en vez de quedarse fijos.
 */
export const CUERPO_HOJA_MODAL = 'min-h-0 flex-1 overflow-y-auto'

/**
 * El pie con los botones, pegado abajo.
 *
 * Se queda quieto mientras el cuerpo se desplaza: en una lista larga, el botón
 * de confirmar tiene que seguir alcanzable sin tener que bajar hasta el final.
 */
export const PIE_HOJA_MODAL =
  'shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6'
