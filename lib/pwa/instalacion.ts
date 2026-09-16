/**
 * Instalación de la app (PWA) con un modal propio en lugar del aviso del
 * navegador.
 *
 * ── Cómo funciona en cada plataforma ─────────────────────────────────────────
 *  - Chrome/Edge (Android y escritorio) disparan `beforeinstallprompt` cuando la
 *    app es instalable. Se cancela el evento, lo que suprime la mini barra
 *    "Instalar app" del navegador, y se guarda para lanzarlo desde el botón
 *    del modal propio.
 *  - Safari en iPhone/iPad NO tiene ese evento: la única forma de instalar es
 *    Compartir -> Agregar a inicio. Ahí el modal muestra esas instrucciones.
 *
 * El listener se registra al cargar este módulo y no en un efecto de React:
 * el navegador dispara el evento una sola vez, y puede hacerlo antes de que el
 * componente termine de montarse.
 */

type EleccionInstalacion = { outcome: 'accepted' | 'dismissed'; platform?: string }

export interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<EleccionInstalacion>
}

let eventoGuardado: EventoInstalacion | null = null
const oyentes = new Set<() => void>()
const avisarCambio = () => oyentes.forEach((oyente) => oyente())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault()
    eventoGuardado = evento as EventoInstalacion
    avisarCambio()
  })
  window.addEventListener('appinstalled', () => {
    eventoGuardado = null
    avisarCambio()
  })
}

/** Si el navegador ofreció instalar y todavía se puede lanzar el diálogo. */
export const hayInstalacionNativa = (): boolean => eventoGuardado !== null

/** Avisa cuando llega el evento de instalación o cuando la app se instala. */
export function suscribirCambiosInstalacion(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

/**
 * Abre el diálogo de instalación del sistema. El evento solo se puede usar una
 * vez, así que se descarta aunque la persona diga que no.
 */
export async function lanzarInstalacion(): Promise<EleccionInstalacion['outcome'] | 'no-disponible'> {
  const evento = eventoGuardado
  if (!evento) return 'no-disponible'
  eventoGuardado = null
  await evento.prompt()
  const { outcome } = await evento.userChoice
  avisarCambio()
  return outcome
}

/** Si la app ya corre instalada (abierta desde el ícono, sin barra del navegador). */
export function estaInstalada(): boolean {
  if (typeof window === 'undefined') return false
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  // Safari en iOS no implementa display-mode para esto: usa navigator.standalone.
  const standaloneIOS = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return standalone || standaloneIOS
}

/** iPhone, iPod o iPad. iPadOS se presenta como Mac: se distingue por la pantalla táctil. */
export function esIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}
