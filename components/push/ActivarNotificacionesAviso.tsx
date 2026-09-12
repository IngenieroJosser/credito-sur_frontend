'use client'

import { useState, type ReactNode } from 'react'
import { BellRing, CheckCircle2, Loader2, Send, ShieldAlert, TriangleAlert } from 'lucide-react'
import AvisoFlotante, { BOTON_AVISO_PRINCIPAL, BOTON_AVISO_SECUNDARIO } from '@/components/pwa/AvisoFlotante'
import { descartarAviso } from '@/lib/pwa/avisos'
import { showLocalNotification, subscribeToPush } from '@/lib/push/pushNotifications'
import { mensajeResultadoPrueba, savePushSubscription, sendTestNotification } from '@/lib/push/pushService'

/** Días sin volver a preguntar si la persona no activa las notificaciones. */
const DIAS_DESCARTE = 3

type Estado = 'pregunta' | 'activando' | 'activada' | 'bloqueada' | 'error'

function IconoAviso({ children, tono }: { children: ReactNode; tono: string }) {
  return <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tono}`}>{children}</span>
}

interface ActivarNotificacionesAvisoProps {
  abierto: boolean
  onCerrar: () => void
}

/**
 * Aviso pequeño que pregunta si se quieren recibir notificaciones antes de
 * pedir el permiso del sistema. El diálogo del navegador solo aparece al tocar
 * "Activar": si se pide al cargar la página y se rechaza, el navegador lo
 * bloquea y la app ya no puede volver a preguntar.
 *
 * Al activar se verifica en dos pasos: una notificación local inmediata
 * (prueba que el dispositivo las muestra) y "Enviar prueba", que pasa por el
 * servidor y el servicio push y dice si llegó.
 */
export default function ActivarNotificacionesAviso({ abierto, onCerrar }: ActivarNotificacionesAvisoProps) {
  const [estado, setEstado] = useState<Estado>('pregunta')
  const [probando, setProbando] = useState(false)
  const [resultadoPrueba, setResultadoPrueba] = useState<ReturnType<typeof mensajeResultadoPrueba> | null>(null)

  if (!abierto) return null

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

  if (estado === 'activada') {
    return (
      <AvisoFlotante
        icono={
          <IconoAviso tono="bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </IconoAviso>
        }
        titulo="Notificaciones activadas"
        onCerrar={cerrar}
        acciones={
          <>
            <button type="button" onClick={probar} disabled={probando} className={BOTON_AVISO_PRINCIPAL}>
              {probando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {probando ? 'Enviando…' : 'Enviar prueba'}
            </button>
            <button type="button" onClick={cerrar} className={BOTON_AVISO_SECUNDARIO}>
              Listo
            </button>
          </>
        }
      >
        {resultadoPrueba ? (
          <span role="status" className={resultadoPrueba.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}>
            {resultadoPrueba.text}
          </span>
        ) : (
          'Te enviamos una de confirmación.'
        )}
      </AvisoFlotante>
    )
  }

  if (estado === 'bloqueada') {
    return (
      <AvisoFlotante
        icono={
          <IconoAviso tono="bg-rose-50 text-rose-600">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </IconoAviso>
        }
        titulo="Notificaciones bloqueadas"
        onCerrar={cerrar}
      >
        Permítelas en los ajustes del sitio (el candado junto a la dirección) o de la app.
      </AvisoFlotante>
    )
  }

  if (estado === 'error') {
    return (
      <AvisoFlotante
        icono={
          <IconoAviso tono="bg-amber-50 text-amber-600">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          </IconoAviso>
        }
        titulo="No se pudieron activar"
        onCerrar={cerrar}
        acciones={
          <button type="button" onClick={activar} className={BOTON_AVISO_PRINCIPAL}>
            Reintentar
          </button>
        }
      >
        Revisa la conexión e inténtalo de nuevo.
      </AvisoFlotante>
    )
  }

  const activando = estado === 'activando'
  return (
    <AvisoFlotante
      icono={
        <IconoAviso tono="bg-primary/10 text-primary">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </IconoAviso>
      }
      titulo="¿Activar notificaciones?"
      onCerrar={cerrar}
      acciones={
        <>
          <button type="button" onClick={activar} disabled={activando} className={BOTON_AVISO_PRINCIPAL}>
            {activando && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {activando ? 'Activando…' : 'Activar'}
          </button>
          <button type="button" onClick={cerrar} disabled={activando} className={BOTON_AVISO_SECUNDARIO}>
            Ahora no
          </button>
        </>
      }
    >
      Avisos de pagos, mora y aprobaciones en este dispositivo.
    </AvisoFlotante>
  )
}
