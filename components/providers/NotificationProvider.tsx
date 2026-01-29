'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Toast, Notification, NotificationType } from '@/components/ui/Toast'
import { createPortal } from 'react-dom'

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string, title?: string, duration?: number) => void
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

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((type: NotificationType, message: string, title?: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(7)
    setNotifications((prev) => [...prev, { id, type, message, title, duration }])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Portal para renderizar notificaciones fuera del flujo normal */}
      {mounted && createPortal(
        <div className="fixed top-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-2 pointer-events-none p-4 md:p-0">
          {notifications.map((notification) => (
            <Toast
              key={notification.id}
              {...notification}
              onClose={removeNotification}
            />
          ))}
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  )
}
