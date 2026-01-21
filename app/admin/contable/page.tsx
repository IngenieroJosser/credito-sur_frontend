'use client'

import React, { useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  Calendar,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  Wallet
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

// Interfaces alineadas con el dominio
interface MovimientoContable {
  id: string
  fecha: string // Changed to string for serialization safety
  concepto: string
  tipo: 'INGRESO' | 'EGRESO'
  monto: number
  categoria: string
  responsable: string
  referencia?: string
}

interface ResumenFinanciero {
  ingresos: number
  egresos: number
  utilidadNeta: number
  capitalEnCalle: number
  cajaActual: number
}

const ModuloContablePage = () => {
  const [activeTab, setActiveTab] = useState<'MOVIMIENTOS' | 'GASTOS' | 'REPORTES'>('MOVIMIENTOS')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS')

  // Datos de ejemplo (Mock Data) - Moved inside component state or effect to avoid hydration mismatch
  const [resumenData] = useState<ResumenFinanciero>({
    ingresos: 28500500,
    egresos: 13250750,
    utilidadNeta: 15249750,
    capitalEnCalle: 45000000,
    cajaActual: 5200000
  })

  const [movimientos] = useState<MovimientoContable[]>([
    {
      id: 'MOV-001',
      fecha: '2026-01-20T10:00:00.000Z', // Fixed date for consistency
      concepto: 'Cobro Cuota - Cliente Juan Pérez',
      tipo: 'INGRESO',
      monto: 150000,
      categoria: 'COBRO_CUOTA',
      responsable: 'Carlos Cobrador'
    },
    {
      id: 'MOV-002',
      fecha: '2026-01-20T11:00:00.000Z', // Fixed date for consistency
      concepto: 'Combustible Ruta Norte',
      tipo: 'EGRESO',
      monto: 25000,
      categoria: 'GASTO_OPERATIVO',
      responsable: 'Carlos Cobrador'
    },
    {
      id: 'MOV-003',
      fecha: '2026-01-20T12:00:00.000Z', // Fixed date for consistency
      concepto: 'Cobro Cuota - Cliente María Garcia',
      tipo: 'INGRESO',
      monto: 200000,
      categoria: 'COBRO_CUOTA',
      responsable: 'Carlos Cobrador'
    },
    {
      id: 'MOV-004',
      fecha: '2026-01-19T14:30:00.000Z', // Ayer
      concepto: 'Compra Papelería Oficina',
      tipo: 'EGRESO',
      monto: 45500,
      categoria: 'GASTO_ADMINISTRATIVO',
      responsable: 'Ana Admin'
    },
    {
      id: 'MOV-005',
      fecha: '2026-01-19T16:45:00.000Z', // Ayer
      concepto: 'Abono Capital - Cliente Luis Rodriguez',
      tipo: 'INGRESO',
      monto: 500000,
      categoria: 'ABONO_CAPITAL',
      responsable: 'Pedro Supervisor'
    }
  ])

  // Filtrado de movimientos
  const movimientosFiltrados = movimientos.filter(mov => {
    const cumpleBusqueda = 
      mov.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
      mov.responsable.toLowerCase().includes(busqueda.toLowerCase()) ||
      mov.categoria.toLowerCase().includes(busqueda.toLowerCase())
    
    const cumpleTipo = filtroTipo === 'TODOS' || mov.tipo === filtroTipo

    return cumpleBusqueda && cumpleTipo
  })

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        {/* Líneas de estructura */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative z-10 min-h-screen pb-12">
        {/* Header Ultra Clean */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#08557f]/5 px-3 py-1 text-xs font-medium text-[#08557f] ring-1 ring-[#08557f]/10">
                <DollarSign className="h-3.5 w-3.5" />
                <span>Gestión Financiera</span>
              </div>
              <h1 className="text-4xl font-light text-gray-900 tracking-tight">
                Contabilidad
              </h1>
              <p className="text-base text-gray-500 max-w-xl font-light">
                Control centralizado de flujos de caja, gastos operativos y rentabilidad.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                <FileText className="h-4 w-4" />
                Exportar
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#08557f] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#064364] transition-all shadow-lg shadow-[#08557f]/20">
                <Calendar className="h-4 w-4" />
                Cierre de Caja
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Tarjetas de Resumen Minimalistas */}
        <section className="grid gap-6 md:grid-cols-4">
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Ingresos
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900 tracking-tight">
              {formatCurrency(resumenData.ingresos)}
            </div>
            <div className="mt-2 flex items-center text-xs font-medium text-emerald-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +12.5%
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Egresos
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900 tracking-tight">
              {formatCurrency(resumenData.egresos)}
            </div>
            <div className="mt-2 flex items-center text-xs font-medium text-red-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +5.2%
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Utilidad Neta
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#08557f]/10 text-[#08557f]">
                <PieChart className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900 tracking-tight">
              {formatCurrency(resumenData.utilidadNeta)}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Margen operativo saludable
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Caja Actual
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900 tracking-tight">
              {formatCurrency(resumenData.cajaActual)}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Disponible inmediato
            </div>
          </div>
        </section>

        {/* Tabs de Navegación Clean */}
        <div className="border-b border-gray-100">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setActiveTab('MOVIMIENTOS')}
              className={cn(
                "py-4 text-sm font-medium border-b-2 transition-all",
                activeTab === 'MOVIMIENTOS' 
                  ? "border-gray-900 text-gray-900" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
              )}
            >
              Movimientos
            </button>
            <button
              onClick={() => setActiveTab('GASTOS')}
              className={cn(
                "py-4 text-sm font-medium border-b-2 transition-all",
                activeTab === 'GASTOS' 
                  ? "border-gray-900 text-gray-900" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
              )}
            >
              Control de Gastos
            </button>
            <button
              onClick={() => setActiveTab('REPORTES')}
              className={cn(
                "py-4 text-sm font-medium border-b-2 transition-all",
                activeTab === 'REPORTES' 
                  ? "border-gray-900 text-gray-900" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
              )}
            >
              Reportes
            </button>
          </nav>
        </div>

        {/* Contenido Principal */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          {/* Barra de Herramientas */}
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-white">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por concepto, responsable..."
                className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#08557f] sm:leading-6 transition-all"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <select 
                className="rounded-xl border-0 bg-gray-50 py-2.5 pl-3 pr-8 text-sm text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-[#08557f] sm:leading-6 outline-none cursor-pointer"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as 'TODOS' | 'INGRESO' | 'EGRESO')}
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="INGRESO">Ingresos</option>
                <option value="EGRESO">Egresos</option>
              </select>
              <button className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-xl ring-1 ring-inset ring-gray-200 transition-colors">
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabla de Movimientos */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-40 font-medium">Fecha</th>
                  <th className="px-6 py-4 font-medium">Concepto</th>
                  <th className="px-6 py-4 font-medium">Categoría</th>
                  <th className="px-6 py-4 font-medium">Responsable</th>
                  <th className="px-6 py-4 font-medium text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movimientosFiltrados.length > 0 ? (
                  movimientosFiltrados.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(mov.fecha).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                            mov.tipo === 'INGRESO' 
                              ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100" 
                              : "bg-red-50 text-red-600 group-hover:bg-red-100"
                          )}>
                            {mov.tipo === 'INGRESO' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          </div>
                          <span className="font-medium text-gray-900">{mov.concepto}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                          {mov.categoria.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {mov.responsable}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-medium",
                        mov.tipo === 'INGRESO' ? "text-emerald-600" : "text-red-600"
                      )}>
                        {mov.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(mov.monto)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                          <Briefcase className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-base font-medium text-gray-900">No se encontraron movimientos</p>
                        <p className="text-sm">Intenta ajustar los filtros de búsqueda.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Paginación simple */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
            <span>Mostrando {movimientosFiltrados.length} resultados</span>
            <div className="flex gap-2">
              <button disabled className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white opacity-50 cursor-not-allowed font-medium">Anterior</button>
              <button className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium text-gray-700 transition-colors">Siguiente</button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default ModuloContablePage