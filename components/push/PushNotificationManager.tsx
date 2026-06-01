'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Loader2, Zap, Shield } from 'lucide-react';
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
  const [showAnimation, setShowAnimation] = useState(false);

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
    setShowAnimation(true);

    try {
      const subscription = await subscribeToPush();
      
      if (!subscription) {
        setMessage({ type: 'error', text: 'No se pudo obtener la suscripción' });
        setLoading(false);
        setShowAnimation(false);
        return;
      }

      // Enviar suscripción al backend
      await savePushSubscription(subscription);
      
      setIsSubscribed(true);
      setPermission('granted');
      setMessage({ type: 'success', text: '¡Notificaciones activadas correctamente!' });
      
      // Mantener animación por 2 segundos
      setTimeout(() => setShowAnimation(false), 2000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al activar notificaciones' });
      setShowAnimation(false);
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
      setMessage({ type: 'error', text: 'Error al enviar notificación de prueba' });
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 backdrop-blur-sm p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 shadow-sm">
            <BellOff className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-amber-900 mb-1">Notificaciones no disponibles</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              Tu navegador no soporta notificaciones push o estás en modo privado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tarjeta Principal */}
      <div className={`rounded-2xl border ${
        isSubscribed 
          ? 'border-emerald-200 bg-emerald-50/80' 
          : 'border-slate-200 bg-white/80'
      } backdrop-blur-sm p-6 shadow-sm transition-all duration-300`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:items-center sm:flex-1">
            {/* Icono */}
            <div className={`shrink-0 p-4 rounded-xl transition-all duration-300 ${
              isSubscribed 
                ? 'bg-emerald-600 shadow-lg' 
                : 'bg-slate-400 shadow-lg'
            } ${showAnimation ? 'scale-110' : 'scale-100'}`}>
              {isSubscribed ? (
                <Bell className="h-6 w-6 text-white" />
              ) : (
                <BellOff className="h-6 w-6 text-white" />
              )}
            </div>

            {/* Contenido */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h4 className="text-base sm:text-lg font-bold text-slate-900">
                  {isSubscribed ? 'Notificaciones Activadas' : 'Notificaciones Desactivadas'}
                </h4>
                {isSubscribed && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 rounded-full border border-emerald-200">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Activo</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {isSubscribed
                  ? 'Recibirás alertas instantáneas de pagos, mora, clientes y más'
                  : 'Activa para recibir alertas importantes en tiempo real'}
              </p>
            </div>
          </div>

          {/* Botón de acción */}
          <button
            onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={loading}
            className={`w-full sm:w-auto shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
              isSubscribed
                ? 'bg-slate-600 text-white hover:bg-slate-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2 whitespace-nowrap">
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </span>
            ) : isSubscribed ? (
              <span className="flex items-center justify-center gap-2 whitespace-nowrap">
                <X className="h-4 w-4" />
                Desactivar
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 whitespace-nowrap">
                <Bell className="h-4 w-4" />
                Activar
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Botón de prueba */}
      {isSubscribed && (
        <button
          onClick={handleTestNotification}
          disabled={loading}
          className="w-full px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <span className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4" />
            Enviar Notificación de Prueba
          </span>
        </button>
      )}

      {/* Mensajes */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-300 ${
            message.type === 'success'
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-rose-50/80 border-rose-200'
          }`}
        >
          <div className={`p-2 rounded-lg ${
            message.type === 'success' 
              ? 'bg-emerald-100 text-emerald-600' 
              : 'bg-rose-100 text-rose-600'
          }`}>
            {message.type === 'success' ? (
              <Check className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
          </div>
          
          <p
            className={`text-sm font-semibold flex-1 ${
              message.type === 'success' ? 'text-emerald-900' : 'text-rose-900'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Mensaje de permisos bloqueados */}
      {permission === 'denied' && (
        <div className="p-5 bg-rose-50/80 backdrop-blur-sm border border-rose-200 rounded-2xl shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 rounded-lg">
              <Shield className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-900 mb-1">Permisos Bloqueados</p>
              <p className="text-xs text-rose-700 leading-relaxed">
                Has bloqueado las notificaciones. Para activarlas, ve a la configuración de tu navegador
                y permite las notificaciones para este sitio.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
