'use client'

import React, { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  UserPlus,
  DollarSign,
  Receipt,
  Eye,
  Check,
  X,
  Clock
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

// Mock Data Interfaces
interface ItemPendiente {
  id: string
  tipo: 'PRESTAMO' | 'CLIENTE' | 'SOLICITUD_DINERO' | 'GASTO'
  solicitante: string
  fecha: string
  detalle: string
  monto?: number
  estado: 'PENDIENTE'
}

const AprobacionesPage = () => {
  const [activeTab, setActiveTab] = useState<'TODOS' | 'PRESTAMOS' | 'CLIENTES' | 'SOLICITUDES' | 'GASTOS'>('TODOS')

  // Mock Data
  const pendientes: ItemPendiente[] = [
    {
      id: '1',
      tipo: 'SOLICITUD_DINERO',
      solicitante: 'Juan Cobrador',
      fecha: '2026-01-21T08:00:00',
      detalle: 'Base para ruta centro, alta demanda esperada.',
      monto: 2000000,
      estado: 'PENDIENTE'
    },
    {
      id: '2',
      tipo: 'PRESTAMO',
      solicitante: 'Maria Cobradora',
      fecha: '2026-01-21T09:15:00',
      detalle: 'Préstamo nuevo para Cliente ID #452 (Nuevo Comercio).',
      monto: 500000,
      estado: 'PENDIENTE'
    },
    {
      id: '3',
      tipo: 'GASTO',
      solicitante: 'Juan Cobrador',
      fecha: '2026-01-20T16:00:00',
      detalle: 'Reparación llanta moto.',
      monto: 25000,
      estado: 'PENDIENTE'
    },
    {
      id: '4',
      tipo: 'CLIENTE',
      solicitante: 'Pedro Supervisor',
      fecha: '2026-01-21T10:00:00',
      detalle: 'Nuevo registro: Carlos Rodriguez (Requiere validación de dirección).',
      estado: 'PENDIENTE'
    }
  ]

  const filteredItems = activeTab === 'TODOS' 
    ? pendientes 
    : pendientes.filter(item => {
        if (activeTab === 'PRESTAMOS') return item.tipo === 'PRESTAMO'
        if (activeTab === 'CLIENTES') return item.tipo === 'CLIENTE'
        if (activeTab === 'SOLICITUDES') return item.tipo === 'SOLICITUD_DINERO'
        if (activeTab === 'GASTOS') return item.tipo === 'GASTO'
        return true
      })

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'PRESTAMO': return <CreditCard className="h-5 w-5 text-blue-600" />
      case 'CLIENTE': return <UserPlus className="h-5 w-5 text-purple-600" />
      case 'SOLICITUD_DINERO': return <DollarSign className="h-5 w-5 text-emerald-600" />
      case 'GASTO': return <Receipt className="h-5 w-5 text-orange-600" />
      default: return <AlertCircle className="h-5 w-5 text-slate-600" />
    }
  }

  const getLabelTipo = (tipo: string) => {
    switch (tipo) {
      case 'PRESTAMO': return 'Préstamo'
      case 'CLIENTE': return 'Cliente'
      case 'SOLICITUD_DINERO': return 'Solicitud Base'
      case 'GASTO': return 'Gasto'
      default: return 'Otro'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Centro de Control</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Gestión de </span>
              <span className="text-orange-500">Aprobaciones</span>
            </h1>
            <p className="text-base text-slate-500 max-w-xl font-medium">
              Revisa y autoriza solicitudes de préstamos, clientes, dinero y gastos.
            </p>
          </div>
        </header>

        {/* Tabs de Navegación */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'PRESTAMOS', label: 'Préstamos' },
            { id: 'CLIENTES', label: 'Clientes' },
            { id: 'SOLICITUDES', label: 'Dinero' },
            { id: 'GASTOS', label: 'Gastos' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                activeTab === tab.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lista de Aprobaciones */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider font-bold bg-slate-50/50">
                  <th className="px-6 py-4 text-left">Tipo</th>
                  <th className="px-6 py-4 text-left">Solicitante</th>
                  <th className="px-6 py-4 text-left">Detalle</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-white transition-colors">
                          {getIconoTipo(item.tipo)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{getLabelTipo(item.tipo)}</span>
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{item.solicitante}</div>
                      <div className="text-xs text-slate-500">Solicitante</div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600 font-medium line-clamp-2 max-w-xs" title={item.detalle}>
                        {item.detalle}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {item.monto ? (
                        <div className="font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg inline-block border border-slate-100">
                          {formatCurrency(item.monto)}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-bold uppercase">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Ver Detalles">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Rechazar">
                          <X className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Aprobar">
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 border-t border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-slate-900 font-bold mb-1">Todo al día</h3>
              <p className="text-slate-500 text-sm">No hay aprobaciones pendientes en esta categoría.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AprobacionesPage
