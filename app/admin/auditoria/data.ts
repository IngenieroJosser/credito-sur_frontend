import { formatCurrency } from '@/lib/utils';

export interface LogAuditoria {
  id: string
  usuario: string
  rol: string
  accion: string
  modulo: string
  detalle: string
  fecha: string
  ip: string
  nivel: 'INFO' | 'WARNING' | 'CRITICAL'
}

export const MOCK_LOGS: LogAuditoria[] = [
  {
    id: 'LOG-001',
    usuario: 'Carlos Pérez',
    rol: 'COBRADOR',
    accion: 'REGISTRO_PAGO',
    modulo: 'COBRANZAS',
    detalle: `Registró pago de cuota #5 para préstamo P-1024 (Monto: ${formatCurrency(50000)})`,
    fecha: '2024-01-24T10:30:00Z',
    ip: '192.168.1.10',
    nivel: 'INFO'
  },
  {
    id: 'LOG-002',
    usuario: 'Ana López',
    rol: 'COORDINADOR',
    accion: 'APROBACION_PRESTAMO',
    modulo: 'PRESTAMOS',
    detalle: `Aprobó préstamo P-1025 por ${formatCurrency(500000)} para cliente C-203`,
    fecha: '2024-01-24T09:15:00Z',
    ip: '192.168.1.5',
    nivel: 'CRITICAL'
  },
  {
    id: 'LOG-003',
    usuario: 'Admin Sistema',
    rol: 'ADMIN',
    accion: 'LOGIN_FALLIDO',
    modulo: 'AUTH',
    detalle: 'Intento de acceso fallido usuario desconocido',
    fecha: '2024-01-24T08:00:00Z',
    ip: '201.12.34.56',
    nivel: 'WARNING'
  },
  {
    id: 'LOG-004',
    usuario: 'Carlos Pérez',
    rol: 'COBRADOR',
    accion: 'CREACION_CLIENTE',
    modulo: 'CLIENTES',
    detalle: 'Creó nuevo cliente "Maria Rodriguez" en Ruta Norte',
    fecha: '2024-01-23T15:45:00Z',
    ip: '192.168.1.10',
    nivel: 'INFO'
  },
  {
    id: 'LOG-005',
    usuario: 'Ana López',
    rol: 'COORDINADOR',
    accion: 'MODIFICACION_TASA',
    modulo: 'CONFIGURACION',
    detalle: 'Cambió tasa de interés global de 10% a 12%',
    fecha: '2024-01-22T11:20:00Z',
    ip: '192.168.1.5',
    nivel: 'CRITICAL'
  }
];
