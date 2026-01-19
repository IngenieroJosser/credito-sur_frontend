'use client'

import React, { useState } from 'react'
import { 
  Shield, 
  Search, 
  Clock, 
  User, 
  AlertCircle,
  Calendar,
  Download,
  Eye
} from 'lucide-react'

// Interfaces mockeadas
interface LogAuditoria {
  id: string
  usuario: string
  rol: string
  accion: string
  modulo: string
  detalle: string
  fecha: Date
  ip: string
  nivel: 'INFO' | 'WARNING' | 'CRITICAL'
}

const AuditoriaSistemaPage = () => {
  const [busqueda, setBusqueda] = useState('')
  const [filtroNivel, setFiltroNivel] = useState<'TODOS' | 'INFO' | 'WARNING' | 'CRITICAL'>('TODOS')

  // Datos de ejemplo
  const [logs] = useState<LogAuditoria[]>([
    {
      id: 'LOG-001',
      usuario: 'Carlos Pérez',
      rol: 'COBRADOR',
      accion: 'REGISTRO_PAGO',
      modulo: 'COBRANZAS',
      detalle: 'Registró pago de cuota #5 para préstamo P-1024 (Monto: 50.00 VES)',
      fecha: new Date('2024-01-24T10:30:00'),
      ip: '192.168.1.10',
      nivel: 'INFO'
    },
    {
      id: 'LOG-002',
      usuario: 'Ana López',
      rol: 'COORDINADOR',
      accion: 'APROBACION_PRESTAMO',
      modulo: 'PRESTAMOS',
      detalle: 'Aprobó préstamo P-1025 por 500.00 VES para cliente C-203',
      fecha: new Date('2024-01-24T09:15:00'),
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
      fecha: new Date('2024-01-24T08:00:00'),
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
      fecha: new Date('2024-01-23T15:45:00'),
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
      fecha: new Date('2024-01-22T11:20:00'),
      ip: '192.168.1.5',
      nivel: 'CRITICAL'
    }
  ]);

  const logsFiltrados = logs.filter(log => {
    const coincideTexto = 
      log.usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.accion.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.detalle.toLowerCase().includes(busqueda.toLowerCase())
    
    const coincideNivel = filtroNivel === 'TODOS' || log.nivel === filtroNivel

    return coincideTexto && coincideNivel
  })

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getNivelBadge = (nivel: string) => {
    switch(nivel) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200'
      case 'WARNING': return 'bg-orange-100 text-orange-700 border-orange-200'
      default: return 'bg-blue-50 text-blue-700 border-blue-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#08557f]/10 text-xs text-[#08557f] tracking-wide font-medium border border-[#08557f]/10">
              <Shield className="h-3.5 w-3.5" />
              <span>Auditoría del Sistema</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Trazabilidad de Eventos
            </h1>
            <p className="text-sm text-gray-500 max-w-xl">
              Registro inmutable de todas las acciones críticas, cambios de configuración y movimientos financieros.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 transition-all">
              <Download className="h-4 w-4" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </header>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Eventos Hoy</p>
                <h3 className="text-xl font-bold text-gray-900">24</h3>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg text-red-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Alertas Críticas</p>
                <h3 className="text-xl font-bold text-gray-900">2</h3>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Usuarios Activos</p>
                <h3 className="text-xl font-bold text-gray-900">5</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y Tabla */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por usuario, acción o detalle..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] transition-all text-sm bg-white"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
              {(['TODOS', 'INFO', 'WARNING', 'CRITICAL'] as const).map((nivel) => (
                <button
                  key={nivel}
                  onClick={() => setFiltroNivel(nivel)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    filtroNivel === nivel 
                      ? 'bg-gray-800 text-white border-gray-800' 
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {nivel}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 font-medium">Fecha / Hora</th>
                  <th className="px-6 py-3 font-medium">Usuario</th>
                  <th className="px-6 py-3 font-medium">Módulo / Acción</th>
                  <th className="px-6 py-3 font-medium">Detalle</th>
                  <th className="px-6 py-3 font-medium text-center">Nivel</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(log.fecha)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {log.usuario.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{log.usuario}</div>
                          <div className="text-xs text-gray-500">{log.rol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">{log.accion.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-gray-400">{log.modulo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-gray-600" title={log.detalle}>
                      {log.detalle}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border ${getNivelBadge(log.nivel)}`}>
                        {log.nivel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-[#08557f] transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {logsFiltrados.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No se encontraron registros que coincidan con la búsqueda.
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
            <span>Mostrando {logsFiltrados.length} de {logs.length} eventos</span>
            <div className="flex gap-2">
              <button disabled className="px-3 py-1 rounded border border-gray-200 bg-white opacity-50 cursor-not-allowed">Anterior</button>
              <button className="px-3 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50">Siguiente</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AuditoriaSistemaPage
