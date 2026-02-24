'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, BellRing, ShieldCheck } from 'lucide-react';
import { isPushSupported, isPushSubscribed, subscribeToPush } from '@/lib/push/pushNotifications';
import { savePushSubscription } from '@/lib/push/pushService';
import { cn } from '@/lib/utils';

export default function PushNotificationPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Solo mostrar si estamos en el cliente y hay sesión
    const checkStatus = async () => {
      if (typeof window === 'undefined') return;
      
      const token = localStorage.getItem('token');
      if (!token) return;

      const supported = isPushSupported();
      setIsSupported(supported);

      if (supported) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.warn('PushNotificationPrompt: NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada');
          return;
        }

        const subscribed = await isPushSubscribed();
        const dismissed = localStorage.getItem('push_prompt_dismissed');
        const permission = Notification.permission;

        // Mostrar solo si:
        // 1. Soporta push
        // 2. No está suscrito
        // 3. No ha rechazado permanentemente (permission !== 'denied')
        // 4. No ha cerrado el aviso recientemente hoy
        if (!subscribed && permission === 'default' && !dismissed) {
          // Pequeño retardo para no abrumar al cargar la página
          const timer = setTimeout(() => setIsVisible(true), 3000);
          return () => clearTimeout(timer);
        }
      }
    };

    checkStatus();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Guardar que lo cerró para no molestarlo de nuevo en esta sesión
    localStorage.setItem('push_prompt_dismissed', 'true');
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const subscription = await subscribeToPush();
      
      // Si el usuario ya dio permiso (granted) o lo denegó (denied),
      // ya no necesitamos mostrar el prompt, independientemente de si la 
      // suscripción al backend falló o no en este intento.
      if (Notification.permission !== 'default') {
        if (subscription) {
          await savePushSubscription(subscription);
        }
        
        // Pequeño retardo para que el usuario vea que algo pasó
        setTimeout(() => {
          setIsVisible(false);
        }, 500);
      }
    } catch (error) {
      console.error('Error suscribiendo desde prompt:', error);
      // Cerramos de todos modos para no estorbar
      setIsVisible(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible || !isSupported) return null;

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 animate-in slide-in-from-bottom-10 fade-in duration-700">
      <div className="max-w-sm bg-white rounded-3xl shadow-2xl border border-blue-50 overflow-hidden group">
        <div className="p-5 flex items-start gap-4">
          <div className="relative">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform duration-500">
              <BellRing className="h-6 w-6" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 border-2 border-white rounded-full animate-ping"></div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-black text-slate-900 leading-tight">
                Notificaciones en Tiempo Real
              </h4>
              <button 
                onClick={handleDismiss}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              Recibe avisos de pagos, mora y clientes nuevos directo en tu dispositivo.
            </p>
            
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Activando...' : 'Activar Ahora'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-bold transition-all"
              >
                Después
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-5 py-2 bg-slate-50 flex items-center gap-2">
          <ShieldCheck className="h-3 w-3 text-slate-400" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Privacidad Garantizada
          </span>
        </div>
      </div>
    </div>
  );
}
