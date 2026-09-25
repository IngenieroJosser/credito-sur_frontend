'use client'

import React, { createContext, useContext, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'
import { NotificationType } from '@/components/ui/Toast'

interface NotificationContextType {
  showNotification: (
    type: NotificationType,
    message: string,
    title?: string,
    duration?: number,
  ) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

/**
 * Avisos del sistema.
 *
 * Antes este proveedor tenía su propia pila de avisos, en su propio portal, en
 * `fixed top-4 right-4` y con ALERT_Z_INDEX. Como el Toaster de sonner está en
 * la misma esquina pero con TOAST_Z_INDEX (más abajo), cuando una acción
 * disparaba las dos vías —cosa que pasaba— los avisos se tapaban entre sí y
 * encima se veían distintos: los de sonner con colores y botón de cerrar, los de
 * aquí sin botón y con 4 segundos fijos.
 *
 * Ahora `showNotification` delega en sonner. La firma no cambia, así que los 136
 * llamados repartidos en 17 archivos siguen igual, pero hay una sola pila de
 * avisos, con un solo aspecto y un solo botón de cerrar.
 */
export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const showNotification = useCallback(
    (type: NotificationType, message: string, title?: string, duration = 4000) => {
      // La firma vieja pone el texto largo en `message` y el encabezado opcional
      // en `title`. Sonner espera al revés: primer argumento el encabezado y el
      // detalle en `description`. Cuando no hay título, el mensaje va solo.
      const encabezado = title ?? message
      const detalle = title ? message : undefined

      toast[type](encabezado, { description: detalle, duration })
    },
    [],
  )

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}
