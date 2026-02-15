'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Loader2 } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from '@/lib/push/pushNotifications';
import {
  savePushSubscription,
  deletePushSubscription,
  sendTestNotification,
} from '@/lib/push/pushService';

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      setIsSupported(isPushSupported());
      setPermission(getNotificationPermission());
      
      if (isPushSupported()) {
        const subscribed = await isPushSubscribed();
        setIsSubscribed(subscribed);
      }
    };

    checkStatus();
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const subscription = await subscribeToPush();
      
      if (!subscription) {
        setMessage({ type: 'error', text: 'No se pudo obtener la suscripción' });
        setLoading(false);
        return;
      }

      // Enviar suscripción al backend
      await savePushSubscription(subscription);
      
      setIsSubscribed(true);
      setPermission('granted');
      setMessage({ type: 'success', text: '¡Notificaciones activadas correctamente!' });
    } catch (error) {
      console.error('Error al suscribirse:', error);
      setMessage({ type: 'error', text: 'Error al activar notificaciones' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const endpoint = subscription.endpoint;
        await deletePushSubscription(endpoint);
      }

      await unsubscribeFromPush();
      
      setIsSubscribed(false);
      setMessage({ type: 'success', text: 'Notificaciones desactivadas' });
    } catch (error) {
      console.error('Error al desuscribirse:', error);
      setMessage({ type: 'error', text: 'Error al desactivar notificaciones' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    setMessage(null);

    try {
      await sendTestNotification();
      setMessage({ type: 'success', text: 'Notificación de prueba enviada' });
    } catch (error) {
      console.error('Error al enviar notificación de prueba:', error);
      setMessage({ type: 'error', text: 'Error al enviar notificación de prueba' });
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Notificaciones no disponibles</p>
            <p className="text-xs text-amber-700 mt-1">
              Tu navegador no soporta notificaciones push o estás en modo privado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Bell className="h-5 w-5 text-emerald-600" />
            </div>
          ) : (
            <div className="p-2 bg-slate-100 rounded-lg">
              <BellOff className="h-5 w-5 text-slate-600" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-slate-900">
              {isSubscribed ? 'Notificaciones Activadas' : 'Notificaciones Desactivadas'}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {isSubscribed
                ? 'Recibirás notificaciones de pagos, mora y más'
                : 'Activa para recibir alertas importantes'}
            </p>
          </div>
        </div>

        <button
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            isSubscribed
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : isSubscribed ? (
            'Desactivar'
          ) : (
            'Activar'
          )}
        </button>
      </div>

      {isSubscribed && (
        <button
          onClick={handleTestNotification}
          disabled={loading}
          className="w-full px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Enviar Notificación de Prueba
        </button>
      )}

      {message && (
        <div
          className={`p-3 rounded-lg flex items-start gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-rose-50 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-4 w-4 text-emerald-600 mt-0.5" />
          ) : (
            <X className="h-4 w-4 text-rose-600 mt-0.5" />
          )}
          <p
            className={`text-xs font-medium ${
              message.type === 'success' ? 'text-emerald-800' : 'text-rose-800'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {permission === 'denied' && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <p className="text-xs font-medium text-rose-800">
            Has bloqueado las notificaciones. Para activarlas, ve a la configuración de tu navegador
            y permite las notificaciones para este sitio.
          </p>
        </div>
      )}
    </div>
  );
}
