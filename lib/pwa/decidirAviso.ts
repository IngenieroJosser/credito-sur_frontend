import { esIOS, estaInstalada, hayInstalacionNativa } from '@/lib/pwa/instalacion'
import { avisoDescartado } from '@/lib/pwa/avisos'
import { isPushSupported, obtenerRegistroServiceWorker } from '@/lib/push/pushNotifications'

export type AvisoApp = 'instalar-nativo' | 'instalar-ios' | 'notificaciones'

/**
 * Decide qué aviso mostrar. Uno solo a la vez, y en este orden:
 *
 *  1. Instalar la app, si no está instalada y no se descartó hace poco.
 *     - `instalar-nativo`: el navegador ofreció instalar (Chrome/Edge).
 *     - `instalar-ios`: iPhone/iPad, donde solo se puede con instrucciones.
 *  2. Activar notificaciones, si hay sesión, el permiso nunca se pidió y este
 *     dispositivo no está suscrito.
 *
 * En iPhone/iPad sin instalar nunca se ofrecen notificaciones: iOS solo las
 * entrega a la app abierta desde la pantalla de inicio. Pedir el permiso en
 * Safari no serviría de nada.
 *
 * Sin service worker registrado (en desarrollo se desregistra a propósito) no
 * se ofrecen notificaciones: no habría dónde suscribirse.
 */
export async function decidirAviso(): Promise<AvisoApp | null> {
  const instalada = estaInstalada()
  const ios = esIOS()

  if (!instalada && !avisoDescartado('instalar')) {
    if (hayInstalacionNativa()) return 'instalar-nativo'
    if (ios) return 'instalar-ios'
  }

  if (ios && !instalada) return null
  if (!localStorage.getItem('token')) return null
  if (!isPushSupported() || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return null
  if (Notification.permission !== 'default' || avisoDescartado('notificaciones')) return null

  const registro = await obtenerRegistroServiceWorker()
  if (!registro) return null

  const suscripcion = await registro.pushManager.getSubscription()
  return suscripcion ? null : 'notificaciones'
}
