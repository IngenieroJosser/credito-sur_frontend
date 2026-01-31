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
  Clock,
  AlertTriangle,
  Info,
  Filter
} from 'lucide-react'
import { formatCurrency, cn, formatCOPInputValue, parseCOPInputToNumber } from '@/lib/utils'
import { useNotification } from '@/components/providers/NotificationProvider'
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
  rutaNombre?: string
  detalles?: {
    cuotas?: number
    porcentaje?: number
    frecuenciaPago?: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'
    articulo?: string
    valorArticulo?: number
  }
}

const RevisionesPage = () => {
  const { showNotification } = useNotification()
  const [activeTab, setActiveTab] = useState<'TODOS' | 'PRESTAMOS' | 'CLIENTES' | 'SOLICITUDES' | 'GASTOS'>('TODOS')
  const [filtroRuta, setFiltroRuta] = useState<string>('all')
  
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
      rutaId: 'RUTA-CENTRO',
      rutaNombre: 'Ruta Centro'
    },
    {
      id: '2',
      tipo: 'PRESTAMO',
      solicitante: 'Maria Cobradora',
      fecha: '2026-01-21T09:15:00',
      detalle: 'Préstamo nuevo para Cliente ID #452 (Nuevo Comercio).',
      monto: 500000,
      estado: 'PENDIENTE',
      rutaId: 'RUTA-NORTE',
      rutaNombre: 'Ruta Norte',
      detalles: {
        cuotas: 20,
        porcentaje: 20,
        frecuenciaPago: 'DIARIO'
      }
    },
    {
      id: '3',
      tipo: 'GASTO',
      solicitante: 'Juan Cobrador',
      fecha: '2026-01-20T16:00:00',
      detalle: 'Reparación llanta moto.',
      monto: 25000,
      estado: 'PENDIENTE',
      rutaId: 'RUTA-CENTRO',
      rutaNombre: 'Ruta Centro'
    },
    {
      id: '4',
      tipo: 'CLIENTE',
      solicitante: 'Pedro Supervisor',
      fecha: '2026-01-21T10:00:00',
      detalle: 'Nuevo registro: Carlos Rodriguez (Requiere validación de dirección).',
      estado: 'PENDIENTE',
      rutaId: 'RUTA-SUR',
      rutaNombre: 'Ruta Sur'
    }
  ])

  const [selectedItem, setSelectedItem] = useState<ItemPendiente | null>(null)
  const [editedItem, setEditedItem] = useState<ItemPendiente | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null)

  const handleOpenDetail = (item: ItemPendiente) => {
    setSelectedItem(item)
    setEditedItem(JSON.parse(JSON.stringify(item))) // Deep copy for editing
    setIsEditingMode(false)
    setIsDetailModalOpen(true)
  }

  const handleAction = (item: ItemPendiente, type: 'APPROVE' | 'REJECT') => {
    setSelectedItem(item)
    setEditedItem(JSON.parse(JSON.stringify(item)))
    setActionType(type)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmAction = () => {
    if (selectedItem && actionType) {
      setItems(items.filter(i => i.id !== selectedItem.id))
      setIsConfirmModalOpen(false)
      setIsDetailModalOpen(false)
      setSelectedItem(null)
      setEditedItem(null)
      setActionType(null)
      
      const title = actionType === 'APPROVE' ? 'Solicitud Aprobada' : 'Solicitud Rechazada'
      const message = actionType === 'APPROVE' 
        ? 'La solicitud ha sido autorizada correctamente' 
        : 'La solicitud ha sido rechazada exitosamente'
      
      showNotification('success', message, title)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesTab = activeTab === 'TODOS' || 
      (activeTab === 'PRESTAMOS' && item.tipo === 'PRESTAMO') ||
      (activeTab === 'CLIENTES' && item.tipo === 'CLIENTE') ||
      (activeTab === 'SOLICITUDES' && item.tipo === 'SOLICITUD_DINERO') ||
      (activeTab === 'GASTOS' && item.tipo === 'GASTO');

    const matchesRuta = filtroRuta === 'all' || item.rutaId === filtroRuta;
    return matchesTab && matchesRuta;
  })

  const getIconoTipo = (tipo: ItemPendiente['tipo']) => {
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

      <div className="relative z-10 w-full p-8 space-y-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Centro de Control</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Gestión de </span>
              <span className="text-orange-500">Revisiones</span>
            </h1>
            <p className="text-base text-slate-500 max-w-xl font-medium">
              Revisa y autoriza solicitudes de préstamos, clientes, dinero y gastos.
            </p>
          </div>
        </header>

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
                onClick={() => setActiveTab(tab.id as any)}
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
              selectedRutaId={filtroRuta === 'all' ? null : filtroRuta}
              onRutaChange={(rutaId) => setFiltroRuta(rutaId || 'all')}
              className="md:w-64"
            />
            <div className="h-10 w-[1px] bg-slate-200 hidden md:block mx-1"></div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer">
              <Filter className="h-5 w-5" />
            </div>
          </div>
        </div>

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
                        <button 
                          onClick={() => handleOpenDetail(item)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-100 shadow-sm" 
                          title="Ver Detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleAction(item, 'REJECT')}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-100 shadow-sm"
                          title="Rechazar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleAction(item, 'APPROVE')}
                          className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-100 shadow-sm"
                          title="Aprobar"
                        >
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

      {isDetailModalOpen && editedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 text-slate-900">
              <h3 className="text-xs font-black flex items-center gap-2 uppercase tracking-widest">
                <Info className="h-4 w-4 text-blue-600" />
                Revisión Operativa
              </h3>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                  {getIconoTipo(editedItem.tipo)}
                </div>
                <div className="min-w-0">
                  <div className="font-black text-slate-900 text-[13px] uppercase tracking-tight leading-tight truncate">{getLabelTipo(editedItem.tipo)}</div>
                  <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5 uppercase">
                    <Clock className="h-3 w-3" />
                    ID: {editedItem.id}
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-slate-900">
                <div className="flex items-center justify-between px-1">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Análisis de Solicitud</p>
                   {editedItem.tipo === 'PRESTAMO' && (
                     <button 
                       onClick={() => setIsEditingMode(!isEditingMode)}
                       className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                         isEditingMode 
                           ? 'bg-orange-500 text-white shadow-sm' 
                           : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                       }`}
                     >
                       {isEditingMode ? 'Bloquear' : 'Editar'}
                     </button>
                   )}
                </div>

                <div className="space-y-3">
                  <div className={`p-4 rounded-2xl border transition-all duration-300 ${isEditingMode ? 'bg-white border-orange-200 shadow-lg' : 'bg-slate-50/50 border-slate-100'}`}>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-3 block border-b border-slate-200/50 pb-1">Origen / Solicitante</p>
                    <div className="space-y-3">
                       <div>
                         <label className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Responsable</label>
                         <p className="text-[13px] font-black text-slate-900 leading-none">{editedItem.solicitante}</p>
                       </div>
                       {editedItem.rutaNombre && (
                         <div>
                           <label className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5">Ruta</label>
                           <p className="text-[11px] font-black text-blue-600 uppercase italic leading-none">{editedItem.rutaNombre}</p>
                         </div>
                       )}
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border transition-all duration-300 ${isEditingMode ? 'bg-white border-blue-200 shadow-lg' : 'bg-blue-50/70 border-blue-100'}`}>
                    <p className="text-[8px] font-black uppercase tracking-widest text-blue-700/70 mb-3 block border-b border-blue-200 pb-1 italic">Condiciones Operativas</p>
                    <div className="space-y-4">
                       {editedItem.monto !== undefined && (
                         <div>
                           <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Monto Solicitado</label>
                           {isEditingMode ? (
                             <input 
                               type="text"
                               value={formatCOPInputValue(editedItem.monto.toString())}
                               onChange={(e) => setEditedItem({...editedItem, monto: parseCOPInputToNumber(e.target.value)})}
                               className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1 text-xs font-black outline-none"
                             />
                           ) : (
                             <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">{formatCurrency(editedItem.monto)}</p>
                           )}
                         </div>
                       )}

                       {editedItem.tipo === 'PRESTAMO' && editedItem.detalles && (
                         <>
                           <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-200/50">
                             <div>
                               <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Cuotas</label>
                               {isEditingMode ? (
                                  <input 
                                    type="number"
                                    value={editedItem.detalles.cuotas || ''}
                                    onChange={(e) => setEditedItem(prev => (prev && prev.detalles) ? {...prev, detalles: {...prev.detalles, cuotas: Number(e.target.value)}} : prev)}
                                    className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1 text-xs font-black outline-none"
                                  />
                               ) : (
                                  <p className="text-base font-black text-slate-900 leading-none">{editedItem.detalles.cuotas} <span className="text-[9px] font-black text-slate-500">MESES</span></p>
                               )}
                             </div>
                             <div>
                               <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Interés (%)</label>
                               {isEditingMode ? (
                                  <input 
                                    type="number"
                                    value={editedItem.detalles.porcentaje || ''}
                                    onChange={(e) => setEditedItem(prev => (prev && prev.detalles) ? {...prev, detalles: {...prev.detalles, porcentaje: Number(e.target.value)}} : prev)}
                                    className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1 text-xs font-black outline-none"
                                  />
                               ) : (
                                  <p className="text-base font-black text-slate-900 leading-none">{editedItem.detalles.porcentaje}%</p>
                               )}
                             </div>
                             <div className="col-span-2">
                               <label className="text-[8px] text-blue-700 uppercase font-bold block mb-0.5">Frecuencia</label>
                               {isEditingMode ? (
                                  <select 
                                    value={editedItem.detalles.frecuenciaPago || 'DIARIO'}
                                    onChange={(e) => setEditedItem(prev => (prev && prev.detalles) ? {...prev, detalles: {...prev.detalles, frecuenciaPago: e.target.value as 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'}} : prev)}
                                    className="w-full bg-white border border-blue-200 text-slate-900 rounded-md px-2 py-1 text-xs font-black outline-none"
                                  >
                                    <option value="DIARIO">DIARIO</option>
                                    <option value="SEMANAL">SEMANAL</option>
                                    <option value="QUINCENAL">QUINCENAL</option>
                                    <option value="MENSUAL">MENSUAL</option>
                                  </select>
                               ) : (
                                  <p className="text-sm font-black text-blue-800 uppercase italic">{editedItem.detalles.frecuenciaPago || 'DIARIO'}</p>
                               )}
                             </div>
                           </div>

                           <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 border-dashed">
                              <p className="text-[8px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Resumen Proyectado</p>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="text-[7px] text-emerald-500 uppercase font-bold block">Vr. Cuota</label>
                                    <p className="text-xs font-black text-emerald-900">
                                      {formatCurrency(
                                        ((editedItem.monto || 0) * (1 + (editedItem.detalles.porcentaje || 0) / 100)) / (editedItem.detalles.cuotas || 1)
                                      )}
                                    </p>
                                 </div>
                                 <div>
                                    <label className="text-[7px] text-emerald-500 uppercase font-bold block">Recaudo Total</label>
                                    <p className="text-xs font-black text-emerald-900">
                                      {formatCurrency(
                                        (editedItem.monto || 0) * (1 + (editedItem.detalles.porcentaje || 0) / 100)
                                      )}
                                    </p>
                                 </div>
                              </div>
                           </div>
                         </>
                       )}

                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Descripción del Solicitante</p>
                          <p className="text-[11px] text-slate-700 font-medium leading-normal italic border-l-2 border-blue-400 pl-2">
                            {editedItem.detalle}
                          </p>
                       </div>
                    </div>
                  </div>
                </div>

                {editedItem.rutaId && (
                  <div className="flex items-center justify-center pt-1">
                    <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/30 font-black text-[10px] uppercase tracking-[0.2em]">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      RUTA: {editedItem.rutaId}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => handleAction(editedItem, 'REJECT')}
                className="flex-1 py-3 bg-white border border-rose-200 text-rose-600 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-colors shadow-sm"
              >
                Rechazar
              </button>
              <button 
                onClick={() => handleAction(editedItem, 'APPROVE')}
                className="flex-1 py-3 bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-colors"
              >
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

      {isConfirmModalOpen && editedItem && actionType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                actionType === 'APPROVE' ? "bg-emerald-100" : "bg-rose-100"
              )}>
                {actionType === 'APPROVE' ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-rose-600" />
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {actionType === 'APPROVE' ? '¿Aprobar Solicitud?' : '¿Rechazar Solicitud?'}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                {actionType === 'APPROVE' 
                  ? 'Esta acción autorizará la solicitud y notificará al solicitante.'
                  : 'Esta acción denegará la solicitud. Esta acción no se puede deshacer.'}
              </p>
              
              <div className="space-y-3 text-left">
                <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validación de Parámetros</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 ml-1 block">Monto Final</label>
                      <input 
                        type="text" 
                        value={formatCOPInputValue(editedItem?.monto?.toString() || '')}
                        onChange={(e) => setEditedItem(prev => prev ? {...prev, monto: parseCOPInputToNumber(e.target.value)} : null)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmAction}
                  className={cn(
                    "flex-1 px-4 py-3 text-white font-bold rounded-2xl shadow-lg transition-colors",
                    actionType === 'APPROVE' 
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" 
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  )}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RevisionesPage
