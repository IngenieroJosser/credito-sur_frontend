/**
 * Servicio para gestionar suscripciones push con el backend
 */

import { apiRequest } from '@/lib/api/api';
import { PushSubscriptionData } from './pushNotifications';

export interface PushSubscriptionResponse {
  id: string;
  userId: string;
  endpoint: string;
  createdAt: string;
}

function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(base64 + padding));
    return payload.sub || payload.id || null;
  } catch {
    return null;
  }
}

/**
 * Envía la suscripción push al backend
 */
export async function savePushSubscription(
  subscription: PushSubscriptionData
): Promise<PushSubscriptionResponse> {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('No se pudo obtener el usuario actual para registrar la suscripción push');
  }
  return apiRequest<PushSubscriptionResponse>('POST', '/push/subscribe', {
    userId,
    subscription,
  });
}

/**
 * Elimina la suscripción push del backend
 */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  const encoded = encodeURIComponent(endpoint);
  return apiRequest<void>('DELETE', `/push/unsubscribe/${encoded}`);
}

/**
 * Obtiene las suscripciones activas del usuario
 */
export async function getUserSubscriptions(): Promise<PushSubscriptionResponse[]> {
  return apiRequest<PushSubscriptionResponse[]>('GET', '/push/subscriptions');
}

/**
 * Envía una notificación de prueba
 */
export async function sendTestNotification(): Promise<void> {
  const userId = getCurrentUserId();
  return apiRequest<void>('POST', '/push/send', {
    userId: userId || undefined,
    title: 'Notificación de prueba',
    body: 'Tus notificaciones push están funcionando correctamente',
    data: {
      tipo: 'TEST',
    },
  });
}
