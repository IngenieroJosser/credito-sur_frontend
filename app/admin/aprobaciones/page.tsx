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
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <div 
              key={item.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                  {getIconoTipo(item.tipo)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {getLabelTipo(item.tipo)}
                    </span>
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {item.solicitante}
                  </h3>
                  <p className="text-slate-600 text-sm font-medium">
                    {item.detalle}
                  </p>
                  {item.monto && (
                    <div className="mt-1 font-bold text-slate-900">
                      {formatCurrency(item.monto)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                <button className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors hidden md:flex">
                  <Eye className="h-4 w-4" />
                  Ver Detalles
                </button>
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 border border-rose-100 transition-colors">
                  <X className="h-4 w-4" />
                  Rechazar
                </button>
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-colors">
                  <Check className="h-4 w-4" />
                  Aprobar
                </button>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-12 bg-white/50 rounded-2xl border border-slate-200 border-dashed">
              <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">No hay elementos pendientes en esta categoría.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AprobacionesPage
