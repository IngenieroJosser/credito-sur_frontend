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

/**
 * Envía la suscripción push al backend
 */
export async function savePushSubscription(
  subscription: PushSubscriptionData
): Promise<PushSubscriptionResponse> {
  return apiRequest<PushSubscriptionResponse>('POST', '/push/subscribe', subscription);
}

/**
 * Elimina la suscripción push del backend
 */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  return apiRequest<void>('DELETE', '/push/unsubscribe', { endpoint });
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
  return apiRequest<void>('POST', '/push/test');
}
