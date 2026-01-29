'use client'

import React, { useState } from 'react'
import {
  ClipboardList,
  Plus,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Eye,
  Trash2,
  Check,
  X
} from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber, cn } from '@/lib/utils'

// Tipos
interface SolicitudDinero {
  id: string
  fecha: string
  monto: number
  descripcion: string
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  comentarioAdmin?: string
}

const SolicitudesPage = () => {
  const [showForm, setShowForm] = useState(false)
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  
  // Mock Data
  const [solicitudes] = useState<SolicitudDinero[]>([
    {
      id: 'SOL-001',
      fecha: '2026-01-21T08:00:00',
      monto: 2000000,
      descripcion: 'Base para ruta centro, se espera alta demanda de préstamos hoy.',
      estado: 'PENDIENTE'
    },
    {
      id: 'SOL-002',
      fecha: '2026-01-20T08:15:00',
      monto: 1500000,
      descripcion: 'Dinero para nuevos clientes referidos en sector norte.',
      estado: 'APROBADO',
      comentarioAdmin: 'Aprobado, pasar por tesorería.'
    },
    {
      id: 'SOL-003',
      fecha: '2026-01-19T09:30:00',
      monto: 5000000,
      descripcion: 'Solicitud extraordinaria para cliente VIP.',
      estado: 'RECHAZADO',
      comentarioAdmin: 'Monto excede el límite diario permitido sin autorización previa.'
    }
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Lógica de envío
    console.log({ monto: parseCOPInputToNumber(monto), descripcion })
    setShowForm(false)
    setMonto('')
    setDescripcion('')
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'APROBADO': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
      case 'RECHAZADO': return 'bg-rose-50 text-rose-600 border-rose-100'
      default: return 'bg-amber-50 text-amber-600 border-amber-100'
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'APROBADO': return <CheckCircle2 className="h-4 w-4" />
      case 'RECHAZADO': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Gestión de Fondos</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Solicitudes </span>
              <span className="text-orange-500">de Dinero</span>
            </h1>
            <p className="text-base text-slate-500 max-w-xl font-medium">
              Gestiona tus solicitudes de base para préstamos y operación diaria.
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Nueva Solicitud
          </button>
        </header>

        {/* Formulario Modal (Inline por simplicidad visual en este ejemplo) */}
        {showForm && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Nueva Solicitud de Base</h2>
              <button 
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Monto Solicitado</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={monto}
                      onChange={(e) => setMonto(formatCOPInputValue(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-lg text-slate-900"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Fecha Requerida</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Motivo / Observación</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 resize-none h-24"
                    placeholder="Describe para qué necesitas este dinero (ej: Ruta Centro, Cliente Específico...)"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Enviar Solicitud
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Solicitudes */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white/50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Historial de Solicitudes
            </h3>
            <div className="flex gap-2">
               {/* Filtros simples */}
               <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                 <Filter className="h-4 w-4" />
               </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4">Monto</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Comentarios</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitudes.map((sol) => (
                  <tr key={sol.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {new Date(sol.fecha).toLocaleDateString('es-CO', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {sol.descripcion}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrency(sol.monto)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                        getEstadoColor(sol.estado)
                      )}>
                        {getEstadoIcon(sol.estado)}
                        {sol.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 italic text-xs">
                      {sol.comentarioAdmin || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver Detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {sol.estado === 'PENDIENTE' && (
                          <>
                            <button 
                              className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Aprobar Solicitud"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button 
                              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Rechazar Solicitud"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {sol.estado === 'PENDIENTE' && (
                          <button 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Cancelar Solicitud"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SolicitudesPage
