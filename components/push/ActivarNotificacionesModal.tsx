'use client'

import { useState } from 'react'
import { BellRing, CheckCircle2, Loader2, Send, ShieldAlert, TriangleAlert } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { descartarAviso } from '@/lib/pwa/avisos'
import { showLocalNotification, subscribeToPush } from '@/lib/push/pushNotifications'
import { mensajeResultadoPrueba, savePushSubscription, sendTestNotification } from '@/lib/push/pushService'

/** Días sin volver a preguntar si la persona no activa las notificaciones. */
const DIAS_DESCARTE = 3

type Estado = 'pregunta' | 'activando' | 'activada' | 'bloqueada' | 'error'

const TITULOS: Record<Estado, string> = {
  pregunta: 'Activa las notificaciones',
  activando: 'Activa las notificaciones',
  activada: 'Notificaciones activadas',
  bloqueada: 'Notificaciones bloqueadas',
  error: 'No se pudieron activar',
}

const BOTON_SECUNDARIO =
  'rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60'
const BOTON_PRINCIPAL =
  'inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-60'

interface ActivarNotificacionesModalProps {
  abierto: boolean
  onCerrar: () => void
}

/**
 * Pregunta si se quieren recibir notificaciones antes de pedir el permiso del
 * sistema. El diálogo del navegador solo aparece cuando la persona toca
 * "Activar": si se pide al cargar la página y lo rechaza, el navegador lo
 * bloquea y ya no se puede volver a preguntar desde la app.
 *
 * Al activar se verifica en dos pasos: una notificación local inmediata
 * (prueba que el dispositivo las muestra) y "Enviar prueba", que pasa por el
 * servidor y el servicio push, y dice si llegó.
 */
export default function ActivarNotificacionesModal({ abierto, onCerrar }: ActivarNotificacionesModalProps) {
  const [estado, setEstado] = useState<Estado>('pregunta')
  const [probando, setProbando] = useState(false)
  const [resultadoPrueba, setResultadoPrueba] = useState<ReturnType<typeof mensajeResultadoPrueba> | null>(null)

  const cerrar = () => {
    if (estado !== 'activada') descartarAviso('notificaciones', DIAS_DESCARTE)
    setEstado('pregunta')
    setResultadoPrueba(null)
    onCerrar()
  }

  const activar = async () => {
    setEstado('activando')
    try {
      const suscripcion = await subscribeToPush()
      if (!suscripcion) {
        const permiso = Notification.permission
        if (permiso === 'denied') setEstado('bloqueada')
        // Cerró el diálogo del sistema sin elegir: se toma como "ahora no".
        else if (permiso === 'default') cerrar()
        else setEstado('error')
        return
      }
      await savePushSubscription(suscripcion)
      await showLocalNotification('Notificaciones activadas', {
        body: 'Así te llegarán los avisos de Credisur.',
        tag: 'credisur-notificaciones-activadas',
      })
      setEstado('activada')
    } catch {
      setEstado('error')
    }
  }

  const probar = async () => {
    setProbando(true)
    setResultadoPrueba(null)
    try {
      setResultadoPrueba(mensajeResultadoPrueba(await sendTestNotification()))
    } catch {
      setResultadoPrueba(mensajeResultadoPrueba(null))
    } finally {
      setProbando(false)
    }
  }

  const footer = (() => {
    switch (estado) {
      case 'pregunta':
      case 'activando':
        return (
          <>
            <button type="button" onClick={cerrar} disabled={estado === 'activando'} className={BOTON_SECUNDARIO}>
              Ahora no
            </button>
            <button type="button" onClick={activar} disabled={estado === 'activando'} className={BOTON_PRINCIPAL}>
              {estado === 'activando' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <BellRing className="h-4 w-4" aria-hidden="true" />
              )}
              {estado === 'activando' ? 'Activando…' : 'Activar'}
            </button>
          </>
        )
      case 'activada':
        return (
          <>
            <button type="button" onClick={probar} disabled={probando} className={BOTON_SECUNDARIO}>
              <span className="inline-flex items-center gap-2">
                {probando ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                {probando ? 'Enviando…' : 'Enviar prueba'}
              </span>
            </button>
            <button type="button" onClick={cerrar} className={BOTON_PRINCIPAL}>
              Listo
            </button>
          </>
        )
      case 'error':
        return (
          <>
            <button type="button" onClick={cerrar} className={BOTON_SECUNDARIO}>
              Cerrar
            </button>
            <button type="button" onClick={activar} className={BOTON_PRINCIPAL}>
              Reintentar
            </button>
          </>
        )
      default:
        return (
          <button type="button" onClick={cerrar} className={BOTON_PRINCIPAL}>
            Entendido
          </button>
        )
    }
  })()

  return (
    <Modal isOpen={abierto} onClose={cerrar} title={TITULOS[estado]} size="sm" footer={footer}>
      {(estado === 'pregunta' || estado === 'activando') && (
        <div className="flex items-start gap-4">
          <span className="shrink-0 rounded-2xl bg-primary/10 p-3 text-primary">
            <BellRing className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-2 text-sm leading-relaxed text-slate-600">
            <p>¿Quieres recibir avisos en este dispositivo aunque no tengas la app abierta?</p>
            <p>Te avisamos de pagos registrados, clientes que entran en mora y solicitudes por aprobar.</p>
          </div>
        </div>
      )}

      {estado === 'activada' && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <span className="shrink-0 rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-slate-600">
              Este dispositivo quedó registrado y te enviamos una notificación de confirmación. Si quieres, comprueba
              que también llegan las del servidor.
            </p>
          </div>
          {resultadoPrueba && (
            <p
              role="status"
              className={`rounded-xl border px-4 py-3 text-sm ${
                resultadoPrueba.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              {resultadoPrueba.text}
            </p>
          )}
        </div>
      )}

      {estado === 'bloqueada' && (
        <div className="flex items-start gap-4">
          <span className="shrink-0 rounded-2xl bg-rose-50 p-3 text-rose-600">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed text-slate-600">
            Las notificaciones de Credisur están bloqueadas en este dispositivo. Para activarlas, abre los ajustes del
            sitio (el candado junto a la dirección) o los ajustes de la app en el teléfono y permite las notificaciones.
          </p>
        </div>
      )}

      {estado === 'error' && (
        <div className="flex items-start gap-4">
          <span className="shrink-0 rounded-2xl bg-amber-50 p-3 text-amber-600">
            <TriangleAlert className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed text-slate-600">
            No pudimos registrar este dispositivo. Revisa la conexión e inténtalo de nuevo.
          </p>
        </div>
      )}
    </Modal>
  )
}
