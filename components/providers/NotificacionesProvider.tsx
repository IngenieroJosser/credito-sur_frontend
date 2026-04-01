'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { Notificacion, notificacionesService } from '@/services/notificaciones-service'
import { toast } from 'sonner'
import { showLocalNotification } from '@/lib/push/pushNotifications'
import { refreshSesion } from '@/services/autenticacion-service'

interface NotificacionesContextProps {
  socket: Socket | null;
  notificaciones: Notificacion[];
  unreadCount: number;
  showDropdown: boolean;
  setShowDropdown: (val: boolean) => void;
  isBellRinging: boolean;
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
  isBellRinging: false,
  marcarComoLeida: () => {},
  marcarTodasComoLeidas: () => {},
  refreshNotificaciones: () => {},
})

export const useNotificaciones = () => useContext(NotificacionesContext)

export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isBellRinging, setIsBellRinging] = useState(false)
  const bellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchNotificaciones = async () => {
    try {
      const data = await notificacionesService.obtenerTodas()
      setNotificaciones(data)
    } catch (e) {
      console.error('Error fetching notifications:', e)
    }
  }

  /** Activa la animación de la campanita por 1.5s */
  const ringBell = () => {
    setIsBellRinging(true)
    if (bellTimerRef.current) clearTimeout(bellTimerRef.current)
    bellTimerRef.current = setTimeout(() => setIsBellRinging(false), 1500)
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
      hasLoggedError = false;
      console.log(`[Socket] Conectado con ID: ${newSocket.id}`);
      if (currentUserId) {
        newSocket.emit('register', { userId: currentUserId })
      }
    })

    // Cuando un admin actualiza permisos de un usuario, el backend emite usuarios_actualizados.
    // Si aplica a este usuario, refrescamos sesión (token + permisos + sidebar) sin requerir re-login.
    newSocket.on('usuarios_actualizados', async (payload: any) => {
      try {
        if (!currentUserId) return;
        if (payload?.accion !== 'PERMISOS_ACTUALIZADOS') return;
        if (payload?.usuarioId && String(payload.usuarioId) !== String(currentUserId)) return;

        const refreshed = await refreshSesion();
        if (refreshed?.access_token) {
          localStorage.setItem('token', refreshed.access_token);
        }

        if (refreshed?.usuario) {
          const existingRaw = localStorage.getItem('user');
          let existing: any = null;
          try {
            existing = existingRaw ? JSON.parse(existingRaw) : null;
          } catch {
            existing = null;
          }
          const mergedUser = {
            ...(existing || {}),
            ...refreshed.usuario,
          };
          localStorage.setItem('user', JSON.stringify(mergedUser));
        }

        window.dispatchEvent(new Event('userUpdated'));
      } catch (e) {
        // No interrumpir la app si falla el refresh; el cambio se aplicará en el próximo login.
      }
    })

    newSocket.on('connect_error', (error) => {
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

      // 🔔 Animar campanita — NO abrir el dropdown automáticamente
      ringBell()
      
      // Toast de confirmación visual
      const isSuccess = ['EXITO', 'APROBADA'].some(k => notificacion.tipo?.includes(k) || notificacion.titulo?.toUpperCase().includes(k));
      const isError = ['RECHAZADA', 'ERROR', 'FRACASO'].some(k => notificacion.tipo?.includes(k) || notificacion.titulo?.toUpperCase().includes(k));
      
      if (isSuccess) toast.success(notificacion.titulo, { description: notificacion.mensaje, duration: 8000 });
      else if (isError) toast.error(notificacion.titulo, { description: notificacion.mensaje, duration: 8000 });
      else toast.info(notificacion.titulo, { description: notificacion.mensaje, duration: 5000 });

      // Mostrar Push Notification local
      showLocalNotification(notificacion.titulo, { body: notificacion.mensaje })
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

      // 🔔 Animar campanita — NO abrir el dropdown automáticamente
      ringBell()
      
      toast.info(notificacion.titulo, { description: notificacion.mensaje, duration: 5000 });

      // Mostrar Push Notification local global
      showLocalNotification(notificacion.titulo, { body: notificacion.mensaje })
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
      if (bellTimerRef.current) clearTimeout(bellTimerRef.current)
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
      isBellRinging,
      marcarComoLeida,
      marcarTodasComoLeidas,
      refreshNotificaciones
    }}>
      {children}
    </NotificacionesContext.Provider>
  )
}
