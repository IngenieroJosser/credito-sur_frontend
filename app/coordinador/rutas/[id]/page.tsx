'use client'

import React, { useState } from 'react'
import {
  Navigation,
  CheckCircle2,
  XCircle,
  MapPin,
  MoreVertical,
  Banknote,
  AlertTriangle,
  ArrowLeft,
  Receipt,
  Plus,
  Pencil,
  Save,
  Search,
  Filter,
  History as HistoryIcon
} from 'lucide-react'
import { formatCOPInputValue, formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// Interfaces de datos
interface ClienteRuta {
  id: string
  nombre: string
  direccion: string
  telefono: string
  cuota: number
  saldoPendiente: number
  diasMora: number
  estadoVisita: 'PENDIENTE' | 'VISITADO_PAGO' | 'VISITADO_NO_PAGO'
  horaVisita?: string
}

interface GastoRuta {
  id: string
  tipo: 'OPERATIVO' | 'TRANSPORTE' | 'OTRO'
  descripcion: string
  valor: number
  hora: string
}

const DetalleRutaPage = () => {
  const params = useParams()
  // Manejo seguro del ID de la ruta
  const rutaId = params?.id ? decodeURIComponent(params.id as string) : 'Desconocida'

  // Datos de prueba (Mock Data)
  const [clientes] = useState<ClienteRuta[]>([
    {
      id: '1',
      nombre: 'Maria Tienda Esquina',
      direccion: 'Calle 5 #45-20, Barrio Centro',
      telefono: '310 123 4567',
      cuota: 50000,
      saldoPendiente: 450000,
      diasMora: 0,
      estadoVisita: 'PENDIENTE'
    },
    {
      id: '2',
      nombre: 'Juan Taller Motos',
      direccion: 'Cra 10 #12-30, Barrio Norte',
      telefono: '320 987 6543',
      cuota: 100000,
      saldoPendiente: 1200000,
      diasMora: 2,
      estadoVisita: 'VISITADO_PAGO',
      horaVisita: '09:30 AM'
    },
    {
      id: '3',
      nombre: 'Ana Panadería',
      direccion: 'Av Principal #88, Barrio Sur',
      telefono: '315 555 1234',
      cuota: 75000,
      saldoPendiente: 800000,
      diasMora: 0,
      estadoVisita: 'PENDIENTE'
    },
    {
      id: '4',
      nombre: 'Pedro Comidas Rápidas',
      direccion: 'Calle 1 #2-3, Barrio Centro',
      telefono: '300 111 2233',
      cuota: 60000,
      saldoPendiente: 300000,
      diasMora: 5,
      estadoVisita: 'VISITADO_NO_PAGO',
      horaVisita: '10:15 AM'
    }
  ])

  const [gastos] = useState<GastoRuta[]>([
    {
      id: '1',
      tipo: 'TRANSPORTE',
      descripcion: 'Gasolina',
      valor: 15000,
      hora: '08:00 AM'
    },
    {
      id: '2',
      tipo: 'OPERATIVO',
      descripcion: 'Almuerzo',
      valor: 12000,
      hora: '12:30 PM'
    }
  ])

  const progreso = {
    total: clientes.length,
    visitados: clientes.filter(c => c.estadoVisita !== 'PENDIENTE').length,
    recaudado: 150000
  }

  const totalGastos = gastos.reduce((acc, g) => acc + g.valor, 0)

  const porcentajeProgreso = (progreso.visitados / progreso.total) * 100

  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false)
  const [nuevoGasto, setNuevoGasto] = useState({ tipo: 'OPERATIVO', descripcion: '', valor: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [rutaCompletada, setRutaCompletada] = useState(false)
  const [showCompletarRutaModal, setShowCompletarRutaModal] = useState(false)
  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<'TODOS' | 'DIA' | 'SEMANA' | 'MES'>('TODOS')

  const handleGuardarGasto = (e: React.FormEvent) => {
    e.preventDefault()
    // La hora se toma automáticamente del sistema
    const horaActual = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    console.log('Guardando gasto:', { ...nuevoGasto, hora: horaActual })
    setIsGastoModalOpen(false)
    setNuevoGasto({ tipo: 'OPERATIVO', descripcion: '', valor: '' })
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-cyan-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <Link href="/admin/rutas" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
               </Link>
               <div>
                 <h1 className="text-3xl font-bold tracking-tight">
                   <span className="text-blue-600">Ruta </span><span className="text-orange-500">Diaria</span>
                 </h1>
                 <p className="text-slate-500 font-medium text-sm">
                   {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} • ID: {rutaId}
                 </p>
              </div>
            </div>
            <Link 
              href={`/admin/rutas/${rutaId}/editar`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <Pencil className="h-4 w-4" />
              <span>Editar</span>
            </Link>
          </div>

          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta de Progreso y Recaudo */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Recaudado Hoy</p>
                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(progreso.recaudado)}</div>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Progreso</p>
                  <div className="text-xl font-bold text-slate-900">{progreso.visitados}/{progreso.total}</div>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeProgreso}%` }}
                />
              </div>
            </div>

            {/* Tarjeta de Gastos */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Gastado Hoy</p>
                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(totalGastos)}</div>
                </div>
                <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                  <Receipt className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500">
                 <span className="font-medium text-slate-900">{gastos.length}</span> registros de gastos hoy
              </div>
            </div>
          </div>
        </header>

        
        {/* Buscador y filtros */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente, dirección..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] shadow-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFilters((v) => !v)}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                      showFilters
                        ? 'bg-[#08557f] text-white border-[#08557f]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filtros</span>
                  </button>
                 
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                      showHistory 
                        ? 'bg-[#08557f] text-white border-[#08557f]' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <HistoryIcon className="h-4 w-4" />
                    <span className="hidden md:inline">{showHistory ? 'Ver Ruta' : 'Historial'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCompletarRutaModal(true)}
                    disabled={rutaCompletada}
                    className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors ${
                      rutaCompletada
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 opacity-70'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden md:inline">Activar Ruta</span>
                  </button>
                </div>
              </div>

              {showFilters && !showHistory && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período de ruta</div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(
                        [
                          { key: 'TODOS' as const, label: 'Día / Semana / Mes' },
                          { key: 'DIA' as const, label: 'Día' },
                          { key: 'SEMANA' as const, label: 'Semana' },
                          { key: 'MES' as const, label: 'Mes' },
                        ]
                      ).map((item) => (
                        <button
                          key={item.key}
                          onClick={() => setPeriodoRutaFiltro(item.key)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                            periodoRutaFiltro === item.key
                              ? 'bg-[#08557f] text-white border-[#08557f] shadow-lg shadow-[#08557f]/20'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
        
        {/* Lista de Clientes */}
        <div className="space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="h-4 w-4 text-slate-500" />
            Clientes por visitar
          </h2>

          {/* Lista de Clientes - Vista Tabla */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Cliente</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Dirección</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Estado Mora</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Financiero</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Estado Visita</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-slate-900">{cliente.nombre}</div>
                          <div className="text-xs text-slate-500 font-medium">{cliente.telefono}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{cliente.direccion}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {cliente.diasMora > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-bold text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            {cliente.diasMora} días
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs">
                            Al día
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="flex justify-between gap-4 text-xs">
                            <span className="text-slate-500 font-medium">Cuota:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(cliente.cuota)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-xs">
                            <span className="text-slate-500 font-medium">Saldo:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(cliente.saldoPendiente)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         {cliente.estadoVisita !== 'PENDIENTE' ? (
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs border",
                              cliente.estadoVisita === 'VISITADO_PAGO' 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                : "bg-rose-50 text-rose-700 border-rose-100"
                            )}>
                              {cliente.estadoVisita === 'VISITADO_PAGO' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {cliente.estadoVisita === 'VISITADO_PAGO' ? 'Pago' : 'No Pago'}
                              <span className="opacity-70 ml-0.5">({cliente.horaVisita})</span>
                            </div>
                         ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs">
                              Pendiente
                            </span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {cliente.estadoVisita === 'PENDIENTE' && (
                          <div className="flex justify-end gap-2">
                            <button className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all" title="No Pago">
                              <XCircle className="h-4 w-4" />
                            </button>
                            <Link 
                              href={`/admin/pagos/registrar/${cliente.id}`}
                              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all inline-flex" 
                              title="Registrar Pago"
                            >
                              <Banknote className="h-4 w-4" />
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sección de Gastos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-500" />
              Gastos Operativos
            </h2>
            <button 
              onClick={() => setIsGastoModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-orange-600 border border-orange-200 text-sm font-bold rounded-xl hover:bg-orange-50 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Registrar Gasto
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Tipo</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Descripción</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Hora</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gastos.length > 0 ? (
                    gastos.map((gasto) => (
                      <tr key={gasto.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          <span className={cn(
                            "px-2 py-1 rounded-md text-xs font-bold border",
                            gasto.tipo === 'OPERATIVO' ? "bg-blue-50 text-blue-700 border-blue-100" :
                            gasto.tipo === 'TRANSPORTE' ? "bg-amber-50 text-amber-700 border-amber-100" :
                            "bg-slate-50 text-slate-700 border-slate-100"
                          )}>
                            {gasto.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{gasto.descripcion}</td>
                        <td className="px-6 py-4 text-slate-500">{gasto.hora}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(gasto.valor)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No hay gastos registrados hoy
                      </td>
                    </tr>
                  )}
                </tbody>
                {gastos.length > 0 && (
                  <tfoot className="bg-slate-50/50 border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-right font-bold text-slate-700">Total Gastos:</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {formatCurrency(gastos.reduce((acc, g) => acc + g.valor, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Registro de Gasto */}
      {isGastoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-900">
                <span className="text-blue-600">Registrar</span> <span className="text-orange-500">Gasto</span>
              </h3>
              <button 
                onClick={() => setIsGastoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            {/* Modal Body */}
            <form onSubmit={handleGuardarGasto} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tipo de Gasto</label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 appearance-none"
                  value={nuevoGasto.tipo}
                  onChange={e => setNuevoGasto({...nuevoGasto, tipo: e.target.value})}
                >
                  <option value="OPERATIVO">OPERATIVO</option>
                  <option value="TRANSPORTE">TRANSPORTE</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Descripción</label>
                <textarea 
                  required
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 resize-none"
                  placeholder="Detalles del gasto..."
                  value={nuevoGasto.descripcion}
                  onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    required
                    min="0"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900"
                    placeholder="0"
                    value={nuevoGasto.valor}
                    onChange={e => setNuevoGasto({ ...nuevoGasto, valor: formatCOPInputValue(e.target.value) })}
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-3 border border-blue-100">
                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600 mt-0.5">
                  <Banknote className="h-4 w-4" />
                </div>
                <div className="text-xs text-blue-800">
                  <p className="font-bold mb-0.5">Nota Importante</p>
                  <p>Este gasto quedará en estado <strong>Pendiente de Aprobación</strong> hasta que el supervisor lo valide.</p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGastoModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetalleRutaPage
