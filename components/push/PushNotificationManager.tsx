'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Loader2, Sparkles, Zap, Shield } from 'lucide-react';
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
      console.error('Error al suscribirse:', error);
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
      <div className="relative overflow-hidden p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200/50 rounded-2xl shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl"></div>
        <div className="relative flex items-start gap-4">
          <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200/50 shadow-sm">
            <BellOff className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-amber-900 mb-1">Notificaciones no disponibles</p>
            <p className="text-sm text-amber-700/90 leading-relaxed">
              Tu navegador no soporta notificaciones push o estás en modo privado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tarjeta Principal con Glassmorphism */}
      <div className="relative overflow-hidden group">
        {/* Fondo animado */}
        <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-700 ${
          isSubscribed 
            ? 'from-emerald-500/10 via-teal-500/10 to-cyan-500/10' 
            : 'from-slate-500/5 via-slate-400/5 to-slate-500/5'
        }`}></div>
        
        {/* Efectos de brillo */}
        {isSubscribed && (
          <>
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </>
        )}

        <div className="relative backdrop-blur-xl bg-white/80 border-2 border-white/20 shadow-xl shadow-slate-900/5 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Icono con animación */}
              <div className={`relative p-4 rounded-2xl transition-all duration-500 ${
                isSubscribed 
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30' 
                  : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-lg shadow-slate-500/20'
              } ${showAnimation ? 'scale-110 rotate-12' : 'scale-100 rotate-0'}`}>
                {isSubscribed ? (
                  <Bell className="h-7 w-7 text-white drop-shadow-lg" />
                ) : (
                  <BellOff className="h-7 w-7 text-white drop-shadow-lg" />
                )}
                {isSubscribed && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-lg font-bold text-slate-900">
                    {isSubscribed ? 'Notificaciones Activadas' : 'Notificaciones Desactivadas'}
                  </h4>
                  {isSubscribed && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 rounded-full">
                      <Shield className="h-3 w-3 text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Activo</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {isSubscribed
                    ? '✨ Recibirás alertas instantáneas de pagos, mora, clientes y más'
                    : '🔔 Activa para recibir alertas importantes en tiempo real'}
                </p>
              </div>
            </div>

            {/* Botón de acción premium */}
            <button
              onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
              disabled={loading}
              className={`relative group/btn px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg ${
                isSubscribed
                  ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-700 hover:to-slate-800 shadow-slate-500/30'
                  : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 shadow-blue-500/40'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </span>
              ) : isSubscribed ? (
                <span className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Desactivar
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Activar Ahora
                </span>
              )}
              
              {/* Efecto de brillo en hover */}
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Botón de prueba mejorado */}
      {isSubscribed && (
        <button
          onClick={handleTestNotification}
          disabled={loading}
          className="group relative w-full overflow-hidden px-5 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Zap className="h-4 w-4" />
            Enviar Notificación de Prueba
          </span>
          {/* Efecto de onda */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        </button>
      )}

      {/* Mensajes con animación */}
      {message && (
        <div
          className={`relative overflow-hidden p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 fade-in duration-300 ${
            message.type === 'success'
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200/50 shadow-lg shadow-emerald-500/10'
              : 'bg-gradient-to-r from-rose-50 to-red-50 border-2 border-rose-200/50 shadow-lg shadow-rose-500/10'
          }`}
        >
          {/* Icono con fondo */}
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
          
          {/* Efecto de brillo */}
          <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-30 ${
            message.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
          }`}></div>
        </div>
      )}

      {/* Mensaje de permisos bloqueados */}
      {permission === 'denied' && (
        <div className="relative overflow-hidden p-5 bg-gradient-to-br from-rose-50 via-red-50 to-orange-50 border-2 border-rose-200/50 rounded-2xl shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/20 rounded-full blur-3xl"></div>
          <div className="relative flex items-start gap-3">
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
