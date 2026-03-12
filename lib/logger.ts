/**
 * Logger centralizado para CrediSur.
 *
 * En producción (NODE_ENV === 'production') todos los métodos son no-ops,
 * por lo que no se filtra ninguna información sensible ni se contaminan
 * las herramientas de monitoreo con ruido de desarrollo.
 *
 * Uso:
 *   import { logger } from '@/lib/logger'
 *   logger.log('mensaje')
 *   logger.warn('advertencia')
 *   logger.error('error crítico', error)   ← error() siempre se emite
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  /** Solo visible en desarrollo */
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },

  /** Solo visible en desarrollo */
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },

  /** Solo visible en desarrollo */
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },

  /**
   * Siempre visible (desarrollo Y producción).
   * Úsalo para errores reales que deben monitorearse.
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Grupo colapsable (solo desarrollo).
   * Útil para agrupar logs de una operación compleja.
   */
  group: (label: string) => {
    if (isDev) console.group(label);
  },

  groupEnd: () => {
    if (isDev) console.groupEnd();
  },
} as const;
