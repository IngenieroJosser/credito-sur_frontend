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

/** Resultado de un envío push, tal como lo devuelve el backend. */
export interface ResultadoEnvioPush {
  /** Si el servidor tiene llaves VAPID configuradas. */
  configurado: boolean;
  /** Dispositivos registrados a los que se intentó enviar. */
  suscripciones: number;
  enviadas: number;
  /** Registros vencidos que el servicio push rechazó (404/410) y se desactivaron. */
  desactivadas: number;
  fallidas: number;
}

/**
 * Envía una notificación de prueba a los dispositivos del usuario con sesión.
 *
 * Usa `/push/test` y no `/push/send`: esa ruta está limitada a roles de oficina
 * y la prueba fallaba siempre para cobradores y supervisores.
 */
export async function sendTestNotification(): Promise<ResultadoEnvioPush> {
  return apiRequest<ResultadoEnvioPush>('POST', '/push/test');
}

/**
 * Traduce el resultado de la prueba a un mensaje que diga qué pasó y qué hacer.
 * `null` = la petición misma falló (sin red, sesión vencida).
 */
export function mensajeResultadoPrueba(
  resultado: ResultadoEnvioPush | null,
): { type: 'success' | 'error'; text: string } {
  if (!resultado) {
    return { type: 'error', text: 'No se pudo enviar la prueba. Revisa la conexión e inténtalo de nuevo.' };
  }
  if (!resultado.configurado) {
    return { type: 'error', text: 'El servidor no tiene configuradas las notificaciones push.' };
  }
  if (resultado.suscripciones === 0) {
    return { type: 'error', text: 'Este usuario no tiene dispositivos registrados. Desactiva y vuelve a activar las notificaciones.' };
  }
  if (resultado.enviadas === 0) {
    return resultado.desactivadas > 0
      ? { type: 'error', text: 'El registro de este dispositivo había vencido. Vuelve a activar las notificaciones.' }
      : { type: 'error', text: 'El servicio de notificaciones rechazó el envío. Inténtalo de nuevo en unos minutos.' };
  }
  const dispositivos = `${resultado.enviadas} dispositivo${resultado.enviadas === 1 ? '' : 's'}`;
  return {
    type: 'success',
    text: `Prueba enviada a ${dispositivos}. Si no aparece en unos segundos, revisa que el teléfono no tenga silenciadas las notificaciones de Credisur.`,
  };
}
