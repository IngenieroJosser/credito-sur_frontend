'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Notificacion, notificacionesService } from '@/services/notificaciones-service'
import { toast } from 'sonner'

interface NotificacionesContextProps {
  socket: Socket | null;
  notificaciones: Notificacion[];
  unreadCount: number;
  marcarComoLeida: (id: string) => void;
  marcarTodasComoLeidas: () => void;
  refreshNotificaciones: () => void;
}

const NotificacionesContext = createContext<NotificacionesContextProps>({
  socket: null,
  notificaciones: [],
  unreadCount: 0,
  marcarComoLeida: () => {},
  marcarTodasComoLeidas: () => {},
  refreshNotificaciones: () => {},
})

export const useNotificaciones = () => useContext(NotificacionesContext)

export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  
  const fetchNotificaciones = async () => {
    try {
      const data = await notificacionesService.obtenerTodas()
      setNotificaciones(data)
    } catch (e) {
      console.error('Error fetching notifications:', e)
    }
  }

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
    // Solo intentar conectar y descargar si hay sesión
    if (!token) return;

    // Carga inicial de notificaciones
    fetchNotificaciones()

    let currentUserId: string | null = null

    try {
      if (token) {
        // Decodificación rápida del JWT para obtener el ID de usuario sin librerías pesadas
        const payload = JSON.parse(atob(token.split('.')[1]))
        currentUserId = payload.sub || payload.id
      }
    } catch(e) {}

    // Inicialización del socket
    const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:3001'
    const baseUrl = rawBaseUrl.replace(/\/api-credisur\/?$/, '') // Socket.io suele ir a la raíz o /socket.io

    console.log(`[Socket] Intentando conectar a: ${baseUrl}`);
    
    const newSocket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      withCredentials: true,
    })

    newSocket.on('connect', () => {
      console.log(`[Socket] Conectado con ID: ${newSocket.id}`);
      if (currentUserId) {
        console.log(`[Socket] Registrando usuario: ${currentUserId}`);
        newSocket.emit('register', { userId: currentUserId })
      }
    })

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Error de conexión:', error.message);
    })

    newSocket.on('disconnect', (reason) => {
      console.warn('[Socket] Desconectado:', reason);
    })

    // Escuchar nuevas notificaciones directas
    newSocket.on('nueva_notificacion', (notificacion: Notificacion) => {
      setNotificaciones(prev => [notificacion, ...prev])
      
      // Mostrar toast nativo
      toast(notificacion.titulo, {
        description: notificacion.mensaje,
        duration: 5000,
        action: notificacion.link ? {
          label: 'Ver Detalles',
          onClick: () => window.location.href = notificacion.link!
        } : undefined
      })
    })

    // Escuchar cambios de estado (ej. se marcaron como leídas en otra pestaña)
    newSocket.on('notificaciones_actualizadas', () => {
      fetchNotificaciones()
    })

    // Escuchar notificaciones globales (para todos los usuarios)
    newSocket.on('nueva_notificacion_global', (notificacion: Notificacion) => {
      setNotificaciones(prev => [notificacion, ...prev])
      toast.info(notificacion.titulo, { description: notificacion.mensaje })
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const unreadCount = notificaciones.filter(n => !n.leida).length

  const marcarComoLeida = async (id: string) => {
    try {
      await notificacionesService.marcarComoLeida(id)
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    } catch(e) {
      console.error(e)
    }
  }

  const marcarTodasComoLeidas = async () => {
    try {
      // Optimizacion simple, no hay endpoint bulk todavía pero actualizamos local
      const unreadList = notificaciones.filter(n => !n.leida)
      await Promise.all(unreadList.map(n => notificacionesService.marcarComoLeida(n.id)))
      
      setNotificaciones(prev => prev.map(n => ({...n, leida: true})))
    } catch(e) {
      console.error(e)
    }
  }

  const refreshNotificaciones = fetchNotificaciones

  return (
    <NotificacionesContext.Provider value={{
      socket,
      notificaciones,
      unreadCount,
      marcarComoLeida,
      marcarTodasComoLeidas,
      refreshNotificaciones
    }}>
      {children}
    </NotificacionesContext.Provider>
  )
}
