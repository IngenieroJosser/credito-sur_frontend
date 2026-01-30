'use client'

import React, { useState } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  CreditCard,
  UserPlus,
  DollarSign,
  Receipt,
  Eye,
  Check,
  X,
  AlertTriangle,
  Filter
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import FiltroRuta from '@/components/filtros/FiltroRuta'

// Mock Data Interfaces
interface ItemPendiente {
  id: string
  tipo: 'PRESTAMO' | 'CLIENTE' | 'SOLICITUD_DINERO' | 'GASTO'
  solicitante: string
  fecha: string
  detalle: string
  monto?: number
  estado: 'PENDIENTE'
  rutaId?: string
}

type TabId = 'TODOS' | 'PRESTAMOS' | 'CLIENTES' | 'SOLICITUDES' | 'GASTOS';

const AprobacionesCoordinador = () => {
  const [activeTab, setActiveTab] = useState<TabId>('TODOS')
  const [filtroRuta, setFiltroRuta] = useState<string | null>(null)
  
  // State for modals and actions
  const [items, setItems] = useState<ItemPendiente[]>([
    {
      id: '1',
      tipo: 'SOLICITUD_DINERO',
      solicitante: 'Juan Cobrador',
      fecha: '2026-01-21T08:00:00',
      detalle: 'Base para ruta centro, alta demanda esperada.',
      monto: 2000000,
      estado: 'PENDIENTE',
      rutaId: 'RT-001'
    },
    {
      id: '2',
      tipo: 'PRESTAMO',
      solicitante: 'Maria Cobradora',
      fecha: '2026-01-21T09:15:00',
      detalle: 'Préstamo nuevo para Cliente ID #452 (Nuevo Comercio).',
      monto: 500000,
      estado: 'PENDIENTE',
      rutaId: 'RT-002'
    },
    {
      id: '3',
      tipo: 'GASTO',
      solicitante: 'Juan Cobrador',
      fecha: '2026-01-20T16:00:00',
      detalle: 'Reparación llanta moto.',
      monto: 25000,
      estado: 'PENDIENTE',
      rutaId: 'RT-001'
    },
    {
      id: '4',
      tipo: 'CLIENTE',
      solicitante: 'Pedro Supervisor',
      fecha: '2026-01-21T10:00:00',
      detalle: 'Nuevo registro: Carlos Rodriguez (Requiere validación de dirección).',
      estado: 'PENDIENTE',
      rutaId: 'RT-003'
    }
  ])

  const [selectedItem, setSelectedItem] = useState<ItemPendiente | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null)

  const handleAction = (item: ItemPendiente, type: 'APPROVE' | 'REJECT') => {
    setSelectedItem(item)
    setActionType(type)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmAction = () => {
    if (selectedItem && actionType) {
      setItems(items.filter(i => i.id !== selectedItem.id))
      setIsConfirmModalOpen(false)
      setIsDetailModalOpen(false)
      setSelectedItem(null)
      setActionType(null)
      // Simulación de API call realizada
    }
  }

  const filteredItems = items.filter(item => {
    // Filtro por Tab
    const matchesTab = activeTab === 'TODOS' || 
      (activeTab === 'PRESTAMOS' && item.tipo === 'PRESTAMO') ||
      (activeTab === 'CLIENTES' && item.tipo === 'CLIENTE') ||
      (activeTab === 'SOLICITUDES' && item.tipo === 'SOLICITUD_DINERO') ||
      (activeTab === 'GASTOS' && item.tipo === 'GASTO');

    // Filtro por Ruta
    const matchesRuta = !filtroRuta || item.rutaId === filtroRuta;

    return matchesTab && matchesRuta;
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
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-8 space-y-8 text-slate-900">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-200/50 px-3 py-1 text-[10px] font-bold text-slate-600 border border-slate-200 mb-2 uppercase tracking-widest">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              <span>Coordinación Operativa</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Centro de </span><span className="text-orange-500">Aprobación</span>
            </h1>
            <p className="text-base text-slate-500 max-w-xl font-medium mt-2">
              Supervisión y autorización centralizada de solicitudes de ruta.
            </p>
          </div>
        </header>

        {/* Filtros Premium - Estilo Unificado */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-slate-200">
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
                onClick={() => setActiveTab(tab.id as TabId)}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border shrink-0",
                  activeTab === tab.id
                    ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <FiltroRuta 
              selectedRutaId={filtroRuta}
              onRutaChange={setFiltroRuta}
            />
            
            <div className="h-10 w-[1px] bg-slate-200 hidden md:block mx-1"></div>
            
            <div className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all cursor-pointer">
              <Filter className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase font-bold bg-slate-50/50">
                  <th className="px-6 py-4 text-left">Solicitud</th>
                  <th className="px-6 py-4 text-left">Origen</th>
                  <th className="px-6 py-4 text-left">Detalle</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 italic">
                          {getIconoTipo(item.tipo)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{getLabelTipo(item.tipo)}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{new Date(item.fecha).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="font-bold text-slate-700">{item.solicitante}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600 line-clamp-1 max-w-xs">{item.detalle}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.monto ? <span className="font-bold text-slate-900">{formatCurrency(item.monto)}</span> : '---'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setSelectedItem(item); setIsDetailModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => handleAction(item, 'REJECT')} className="p-2 text-rose-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
                        <button onClick={() => handleAction(item, 'APPROVE')} className="p-2 text-emerald-400 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Revisión de Solicitud</h3>
              <button onClick={() => setIsDetailModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Información Principal</p>
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <p className="font-bold text-slate-900">{selectedItem.solicitante}</p>
                            <p className="text-sm text-slate-500">{getLabelTipo(selectedItem.tipo)}</p>
                        </div>
                        {selectedItem.monto && <p className="text-xl font-bold text-blue-600">{formatCurrency(selectedItem.monto)}</p>}
                    </div>
                </div>
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase mb-2">Explicación / Detalle</p>
                   <p className="text-sm text-slate-700 bg-slate-100/50 p-4 rounded-xl border border-dashed border-slate-200 leading-relaxed">{selectedItem.detalle}</p>
                </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => handleAction(selectedItem, 'REJECT')} className="px-6 py-2 bg-white border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-all">Rechazar</button>
              <button onClick={() => handleAction(selectedItem, 'APPROVE')} className="px-6 py-2 bg-white border border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all">Confirmar Aprobación</button>
            </div>
          </div>
        </div>
      )}

      {isConfirmModalOpen && actionType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto", actionType === 'APPROVE' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
                {actionType === 'APPROVE' ? <CheckCircle2 className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
            </div>
            <h3 className="text-xl font-bold text-slate-900">{actionType === 'APPROVE' ? '¿Aprobar Solicitud?' : '¿Rechazar Solicitud?'}</h3>
            <p className="text-slate-500 text-sm">Esta acción marcará la solicitud como finalizada y no se podrá revertir.</p>
            <div className="flex gap-3 pt-2">
                <button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50">Cancelar</button>
                <button onClick={handleConfirmAction} className={cn("flex-1 py-3 bg-white font-bold rounded-2xl shadow-sm border", actionType === 'APPROVE' ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-rose-200 text-rose-600 hover:bg-rose-50")}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AprobacionesCoordinador
