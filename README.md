<p align="center">
  <img src="public/android-chrome-512x512.png" alt="Creditos del sur - Logo oficial" width="160">
</p>

## Créditos del Sur — Sistema de Gestión de Créditos y Cobranzas

Créditos del Sur es un sistema web profesional diseñado para la gestión integral de créditos, préstamos y cobranzas de electrodomésticos, enfocado en entornos empresariales que requieren operación continua, control financiero y alta confiabilidad, incluso en escenarios con conectividad limitada.

La plataforma permite administrar clientes, préstamos, cuotas, pagos, rutas de cobro y reportes financieros de forma centralizada, con control de acceso por roles y auditoría completa de acciones. Está pensada para uso diario intensivo por administradores, coordinadores, cobradores y personal contable, priorizando eficiencia operativa, seguridad de la información y claridad en los flujos de trabajo.

El sistema ha sido concebido con una arquitectura moderna y escalable, preparada para operar en red local (LAN), con sincronización de datos y respaldos automáticos en la nube cuando existe conexión a Internet. Su interfaz es sobria, intuitiva y orientada a productividad, adecuada para jornadas prolongadas y operación en campo mediante dispositivos móviles.

Créditos del Sur no es una aplicación genérica: es una herramienta diseñada para gestionar dinero, riesgo y confianza, con una base técnica sólida que permite crecer, integrarse y evolucionar sin comprometer estabilidad ni control.

### Evolución Técnica Reciente

El frontend ha sido actualizado para cumplir con los más altos estándares de desarrollo moderno, implementando:

- **Server-Side Rendering (SSR):** Optimización completa de las vistas críticas como listados de clientes y rutas, garantizando tiempos de carga mínimos y mejor experiencia de usuario.
- **Gestión de Riesgo Visual:** Implementación de indicadores semánticos de riesgo en tiempo real, permitiendo a los operadores identificar rutas y clientes críticos de un vistazo.
- **Arquitectura Limpia:** Separación estricta entre componentes de servidor (data fetching) y componentes de cliente (interactividad), eliminando deuda técnica y facilitando el mantenimiento.
- **Normalización de UI:** Estandarización de componentes visuales, modales y acciones para mantener consistencia y usabilidad en todos los módulos del sistema.
- **Sistema Offline Completo:** Operación total sin conexión mediante IndexedDB, permitiendo consultas, registros y sincronización automática al reconectar.
- **Notificaciones Push:** Sistema de alertas en tiempo real para pagos, mora, clientes y eventos críticos del sistema, con soporte para acciones interactivas.

---

## Capacidades Offline

El sistema implementa funcionalidad offline completa en **16+ componentes críticos**, permitiendo operación continua sin conexión a Internet:

### Componentes con Soporte Offline

- **Clientes:** Consulta, búsqueda, filtrado y edición offline
- **Préstamos:** Visualización de préstamos, cuotas y detalles completos
- **Pagos:** Registro de pagos con encolamiento automático para sincronización
- **Rutas:** Visualización de rutas asignadas y visitas del día
- **Dashboards:** Estadísticas básicas construidas desde datos locales
- **Cuentas Mora/Vencidas:** Listados reconstruidos desde datos en caché
- **Historial de Pagos:** Visualización de pagos pendientes de sincronización

### Arquitectura Offline

```txt
lib/offline/
├── offlineDb.ts          # Schema IndexedDB (clientes, prestamos, cuotas, rutas, queue)
├── offlineQueue.ts       # Cola de operaciones pendientes
├── syncManager.ts        # Descarga y sincronización automática
└── index.ts              # Re-exports

hooks/
├── useOffline.ts         # Estado offline, sincronización manual
└── useOfflineData.ts     # Hooks para datos offline por entidad

components/offline/
├── OfflineIndicator.tsx  # Banner flotante con estado y cola
└── OfflineIndicatorWrapper.tsx
```

### Flujo de Operación Offline

1. **Carga Inicial:** Al iniciar sesión, descarga automática de datos críticos a IndexedDB
2. **Operación Offline:** Consultas desde IndexedDB, mutaciones encoladas
3. **Reconexión:** Sincronización automática de cola pendiente
4. **Feedback Visual:** Banner flotante indica estado offline y operaciones pendientes

---

## Notificaciones Push

Sistema completo de notificaciones push implementado con soporte para múltiples tipos de eventos y acciones interactivas.

### Características

- **Suscripción Automática:** Auto-registro al iniciar sesión
- **Tipos Soportados:** PAGO, MORA, CLIENTE, PRESTAMO, SOLICITUD, SISTEMA
- **Acciones Interactivas:** Aprobar, Ver, Cerrar (según tipo)
- **Vibración Personalizada:** Patrones específicos por tipo de notificación
- **Navegación Inteligente:** Abre o enfoca la app en la URL correcta

### Configuración

El sistema requiere claves VAPID configuradas en variables de entorno:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKxN...
```

### Componentes

```txt
lib/push/
├── pushNotifications.ts  # Gestión de permisos y suscripciones
└── pushService.ts        # API para backend

components/push/
└── PushNotificationManager.tsx  # UI de gestión

public/
└── sw-push-handler.js    # Service Worker handlers
```

### Documentación Backend

Ver `docs/PUSH_NOTIFICATIONS_BACKEND.md` para implementación completa del backend, incluyendo endpoints, modelo de datos y ejemplos de integración.

---
