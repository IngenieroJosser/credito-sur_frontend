'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Notificacion, notificacionesService } from '@/services/notificaciones-service'
import { toast } from 'sonner'

interface NotificacionesContextProps {
  socket: Socket | null;
  notificaciones: Notificacion[];
  unreadCount: number;
  showDropdown: boolean;
  setShowDropdown: (val: boolean) => void;
  marcarComoLeida: (id: string) => void;
  marcarTodasComoLeidas: () => void;
  refreshNotificaciones: () => void;
}

const NotificacionesContext = createContext<NotificacionesContextProps>({
  socket: null,
  notificaciones: [],
  unreadCount: 0,
  showDropdown: false,
  setShowDropdown: () => {},
  marcarComoLeida: () => {},
  marcarTodasComoLeidas: () => {},
  refreshNotificaciones: () => {},
})

export const useNotificaciones = () => useContext(NotificacionesContext)

export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  
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

    let hasLoggedError = false;

    newSocket.on('connect', () => {
      hasLoggedError = false; // Reset error flag on successful connect
      console.log(`[Socket] Conectado con ID: ${newSocket.id}`);
      if (currentUserId) {
        newSocket.emit('register', { userId: currentUserId })
      }
    })

    newSocket.on('connect_error', (error) => {
      // Evitar spam en la consola durante desconexiones temporales (ej. reinicios del backend)
      if (!hasLoggedError) {
        console.warn(`[Socket] Desconectado o esperando backend... (${error.message})`);
        hasLoggedError = true;
      }
    })

    newSocket.on('disconnect', (reason) => {
      if (reason !== 'io client disconnect') {
        console.warn(`[Socket] Desconectado: ${reason}. Reintentando...`);
      }
    })

    const formatFecha = (fechaRaw?: any) => {
      if (!fechaRaw) return 'Fecha desconocida';
      return new Date(fechaRaw).toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    // Escuchar nuevas notificaciones directas
    newSocket.on('nueva_notificacion', (notificacion: Notificacion) => {
      const formattedNotif = {
        ...notificacion,
        fecha: formatFecha((notificacion as any).creadoEn || notificacion.fecha)
      };
      setNotificaciones(prev => [formattedNotif, ...prev])
      
      // En lugar de toast, abrimos el dropdown
      setShowDropdown(true)
    })

    // Escuchar cambios de estado (ej. se marcaron como leídas en otra pestaña)
    newSocket.on('notificaciones_actualizadas', () => {
      fetchNotificaciones()
    })

    // Escuchar notificaciones globales (para todos los usuarios)
    newSocket.on('nueva_notificacion_global', (notificacion: Notificacion) => {
      const formattedNotif = {
        ...notificacion,
        fecha: formatFecha((notificacion as any).creadoEn || notificacion.fecha)
      };
      setNotificaciones(prev => [formattedNotif, ...prev])
      setShowDropdown(true)
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
      const unreadList = notificaciones.filter(n => !n.leida)
      if (unreadList.length === 0) {
        setShowDropdown(false)
        return
      }
      
      await Promise.all(unreadList.map(n => notificacionesService.marcarComoLeida(n.id)))
      setNotificaciones(prev => prev.map(n => ({...n, leida: true})))
      setShowDropdown(false)
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
      showDropdown,
      setShowDropdown,
      marcarComoLeida,
      marcarTodasComoLeidas,
      refreshNotificaciones
    }}>
      {children}
    </NotificacionesContext.Provider>
  )
}
