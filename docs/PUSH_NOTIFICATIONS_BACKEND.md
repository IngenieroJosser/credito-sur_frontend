# Documentación Backend - Push Notifications

## Requisitos del Backend para Notificaciones Push

El frontend ya está completamente implementado y listo para recibir notificaciones push. El backend necesita implementar los siguientes endpoints y funcionalidades.

---

## 1. Endpoints Requeridos

### **POST /api-credisur/push/subscribe**

Guardar una nueva suscripción push del usuario.

**Request Body:**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BKxN...",
    "auth": "5I2T..."
  }
}
```

**Response:**

```json
{
  "id": "uuid",
  "userId": "user-id",
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Lógica:**

- Obtener el usuario autenticado del token JWT
- Verificar si ya existe una suscripción con ese endpoint
- Si existe, actualizar; si no, crear nueva
- Guardar en base de datos asociada al userId

---

### **DELETE /api-credisur/push/unsubscribe**

Eliminar una suscripción push.

**Request Body:**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Response:**

```json
{
  "message": "Suscripción eliminada correctamente"
}
```

**Lógica:**

- Buscar la suscripción por endpoint
- Verificar que pertenezca al usuario autenticado
- Eliminar de la base de datos

---

### **GET /api-credisur/push/subscriptions**

Obtener todas las suscripciones activas del usuario.

**Response:**

```json
[
  {
    "id": "uuid",
    "userId": "user-id",
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

### **POST /api-credisur/push/test**

Enviar una notificación de prueba al usuario autenticado.

**Response:**

```json
{
  "message": "Notificación de prueba enviada",
  "sent": 2
}
```

**Lógica:**

- Obtener todas las suscripciones del usuario
- Enviar notificación de prueba a cada una
- Retornar cantidad de notificaciones enviadas

---

## 2. Modelo de Base de Datos

### **Tabla: push_subscriptions**

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_endpoint (endpoint)
);
```

**Prisma Schema:**

```prisma
model PushSubscription {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([endpoint])
  @@map("push_subscriptions")
}
```

---

## 3. Configuración de VAPID Keys

### **Generar claves VAPID:**

```bash
# Instalar web-push
npm install web-push --save

# Generar claves
npx web-push generate-vapid-keys
```

**Output:**

```
Public Key: BKxN...
Private Key: 5I2T...
```

### **Variables de entorno (.env):**

```env
# Push Notifications
VAPID_PUBLIC_KEY=BKxN...
VAPID_PRIVATE_KEY=5I2T...
VAPID_SUBJECT=mailto:erickmanuel238@gmail.com
```

### **Frontend (.env.local):**

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKxN...
```

---

## 4. Servicio de Envío de Notificaciones

### **Instalación:**

```bash
npm install web-push
```

### **Servicio NestJS (push.service.ts):**

```typescript
import { Injectable } from "@nestjs/common";
import * as webpush from "web-push";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PushService {
  constructor(private prisma: PrismaService) {
    // Configurar VAPID
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  }

  async subscribe(userId: string, subscription: any) {
    // Verificar si ya existe
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      // Actualizar
      return this.prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updatedAt: new Date(),
        },
      });
    }

    // Crear nueva
    return this.prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async unsubscribe(endpoint: string) {
    return this.prisma.pushSubscription.delete({
      where: { endpoint },
    });
  }

  async getUserSubscriptions(userId: string) {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
    });
  }

  async sendNotification(userId: string, payload: any) {
    const subscriptions = await this.getUserSubscriptions(userId);

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify(payload),
          );
          return { success: true };
        } catch (error) {
          // Si la suscripción expiró o es inválida, eliminarla
          if (error.statusCode === 410 || error.statusCode === 404) {
            await this.prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          }
          return { success: false, error };
        }
      }),
    );

    return {
      sent: results.filter((r) => r.status === "fulfilled" && r.value.success)
        .length,
      failed: results.filter((r) => r.status === "rejected" || !r.value.success)
        .length,
    };
  }

  async sendTestNotification(userId: string) {
    return this.sendNotification(userId, {
      tipo: "SISTEMA",
      title: "Notificación de Prueba",
      body: "Esta es una notificación de prueba desde Credisur",
      url: "/",
    });
  }
}
```

---

## 5. Controlador NestJS (push.controller.ts)

```typescript
import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PushService } from "./push.service";

@Controller("push")
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private pushService: PushService) {}

  @Post("subscribe")
  async subscribe(@Req() req, @Body() subscription: any) {
    return this.pushService.subscribe(req.user.id, subscription);
  }

  @Delete("unsubscribe")
  async unsubscribe(@Body("endpoint") endpoint: string) {
    return this.pushService.unsubscribe(endpoint);
  }

  @Get("subscriptions")
  async getSubscriptions(@Req() req) {
    return this.pushService.getUserSubscriptions(req.user.id);
  }

  @Post("test")
  async sendTest(@Req() req) {
    return this.pushService.sendTestNotification(req.user.id);
  }
}
```

---

## 6. Integración con Eventos del Sistema

### **Ejemplo: Notificar cuando se recibe un pago**

```typescript
// En payments.service.ts
async registrarPago(data: any, userId: string) {
  const pago = await this.prisma.payment.create({ data });

  // Enviar notificación push
  await this.pushService.sendNotification(userId, {
    tipo: 'PAGO',
    title: 'Pago Recibido',
    body: `Se registró un pago de ${formatCurrency(pago.monto)}`,
    url: `/pagos/historial`,
    data: {
      pagoId: pago.id,
      monto: pago.monto,
    },
  });

  return pago;
}
```

### **Ejemplo: Notificar cuentas en mora**

```typescript
// En cron job o tarea programada
async notifyMoraAccounts() {
  const moraAccounts = await this.getMoraAccounts();

  for (const account of moraAccounts) {
    await this.pushService.sendNotification(account.userId, {
      tipo: 'MORA',
      title: 'Cuenta en Mora',
      body: `El cliente ${account.clienteNombre} tiene ${account.diasMora} días de mora`,
      url: `/cuentas-mora/${account.id}`,
      data: {
        clienteId: account.clienteId,
        diasMora: account.diasMora,
      },
    });
  }
}
```

---

## 7. Tipos de Notificaciones Soportadas

El frontend está configurado para manejar los siguientes tipos:

| Tipo          | Descripción                | Vibración                 | Requiere Interacción |
| ------------- | -------------------------- | ------------------------- | -------------------- |
| **PAGO**      | Pagos recibidos            | [200, 100, 200]           | Sí                   |
| **MORA**      | Cuentas en mora            | [300, 100, 300, 100, 300] | Sí                   |
| **CLIENTE**   | Eventos de clientes        | [200, 100, 200]           | No                   |
| **PRESTAMO**  | Eventos de préstamos       | [200, 100, 200]           | No                   |
| **SOLICITUD** | Solicitudes pendientes     | [200, 100, 200, 100, 200] | Sí                   |
| **SISTEMA**   | Notificaciones del sistema | [100]                     | No                   |

---

## 8. Formato de Payload para Notificaciones

### **Estructura básica:**

```json
{
  "tipo": "PAGO",
  "title": "Título de la notificación",
  "body": "Mensaje de la notificación",
  "url": "/ruta/destino",
  "image": "https://url-imagen.jpg",
  "data": {
    "key": "value"
  }
}
```

### **Ejemplo completo:**

```json
{
  "tipo": "PAGO",
  "title": "Pago Recibido",
  "body": "Juan Pérez pagó $50,000 - Cuota 3/12",
  "url": "/pagos/historial",
  "image": "https://tu-servidor.com/imagen-pago.jpg",
  "requireInteraction": true,
  "data": {
    "clienteId": "123",
    "pagoId": "456",
    "monto": 50000
  }
}
```

---

## 9. Migración de Base de Datos

```bash
# Crear migración
npx prisma migrate dev --name add_push_subscriptions

# Aplicar en producción
npx prisma migrate deploy
```

---

## 10. Testing

### **Test de suscripción:**

```bash
curl -X POST http://localhost:3001/api-credisur/push/subscribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://fcm.googleapis.com/fcm/send/test",
    "keys": {
      "p256dh": "test-key",
      "auth": "test-auth"
    }
  }'
```

### **Test de notificación:**

```bash
curl -X POST http://localhost:3001/api-credisur/push/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 11. Consideraciones de Seguridad

1. **Validar suscripciones:** Verificar que el endpoint sea válido
2. **Rate limiting:** Limitar cantidad de notificaciones por usuario
3. **Limpiar suscripciones:** Eliminar suscripciones expiradas automáticamente
4. **Proteger claves VAPID:** Nunca exponer la clave privada
5. **Validar payload:** Sanitizar datos antes de enviar

---

## 12. Monitoreo y Logs

```typescript
// Agregar logs para monitorear
async sendNotification(userId: string, payload: any) {
  this.logger.log(`Enviando notificación tipo ${payload.tipo} a usuario ${userId}`);

  const result = await this.sendNotificationInternal(userId, payload);

  this.logger.log(`Notificación enviada: ${result.sent} exitosas, ${result.failed} fallidas`);

  return result;
}
```

---

## Resumen de Implementación

✅ **Frontend:** Completamente implementado y listo
⏳ **Backend:** Requiere implementación de:

1. Endpoints de suscripción
2. Modelo de base de datos
3. Servicio de envío con web-push
4. Integración con eventos del sistema
5. Configuración de claves VAPID

**Tiempo estimado:** 4-6 horas de desarrollo backend
