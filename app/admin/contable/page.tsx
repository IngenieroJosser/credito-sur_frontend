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

// Interfaces alineadas con el dominio
interface MovimientoContable {
  id: string
  fecha: Date
  concepto: string
  tipo: 'INGRESO' | 'EGRESO'
  monto: number
  categoria: string // 'COBRO_CUOTA', 'GASTO_OPERATIVO', 'CAPITAL_INICIAL', 'RETIRO_UTILIDAD', etc.
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

// Datos de ejemplo (Mock Data)
const resumenData: ResumenFinanciero = {
  ingresos: 28500.50,
  egresos: 13250.75,
  utilidadNeta: 15249.75,
  capitalEnCalle: 45000.00,
  cajaActual: 5200.00
}

const movimientosData: MovimientoContable[] = [
  {
    id: 'MOV-001',
    fecha: new Date(),
    concepto: 'Cobro Cuota - Cliente Juan Pérez',
    tipo: 'INGRESO',
    monto: 150.00,
    categoria: 'COBRO_CUOTA',
    responsable: 'Carlos Cobrador'
  },
  {
    id: 'MOV-002',
    fecha: new Date(),
    concepto: 'Combustible Ruta Norte',
    tipo: 'EGRESO',
    monto: 25.00,
    categoria: 'GASTO_OPERATIVO',
    responsable: 'Carlos Cobrador'
  },
  {
    id: 'MOV-003',
    fecha: new Date(),
    concepto: 'Cobro Cuota - Cliente María Garcia',
    tipo: 'INGRESO',
    monto: 200.00,
    categoria: 'COBRO_CUOTA',
    responsable: 'Carlos Cobrador'
  },
  {
    id: 'MOV-004',
    fecha: new Date(Date.now() - 86400000), // Ayer
    concepto: 'Compra Papelería Oficina',
    tipo: 'EGRESO',
    monto: 45.50,
    categoria: 'GASTO_ADMINISTRATIVO',
    responsable: 'Ana Admin'
  },
  {
    id: 'MOV-005',
    fecha: new Date(Date.now() - 86400000), // Ayer
    concepto: 'Abono Capital - Cliente Luis Rodriguez',
    tipo: 'INGRESO',
    monto: 500.00,
    categoria: 'ABONO_CAPITAL',
    responsable: 'Pedro Supervisor'
  }
]

// Utilidad para formateo de moneda VES
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

const ModuloContablePage = () => {
  const [activeTab, setActiveTab] = useState<'MOVIMIENTOS' | 'GASTOS' | 'REPORTES'>('MOVIMIENTOS')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS')

  // Filtrado de movimientos
  const movimientosFiltrados = movimientosData.filter(mov => {
    const cumpleBusqueda = 
      mov.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
      mov.responsable.toLowerCase().includes(busqueda.toLowerCase()) ||
      mov.categoria.toLowerCase().includes(busqueda.toLowerCase())
    
    const cumpleTipo = filtroTipo === 'TODOS' || mov.tipo === filtroTipo

    return cumpleBusqueda && cumpleTipo
  })

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Header con gradiente suave */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <DollarSign className="h-3.5 w-3.5" />
                <span>Gestión Financiera</span>
              </div>
              <h1 className="text-3xl font-light text-gray-900 tracking-tight">
                Módulo Contable
              </h1>
              <p className="text-sm text-gray-500 max-w-xl">
                Control centralizado de ingresos, egresos, gastos operativos e indicadores de rentabilidad del negocio.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                <FileText className="h-4 w-4" />
                Exportar Reporte
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg bg-[#08557f] px-4 py-2 text-sm font-medium text-white hover:bg-[#064364] transition-colors shadow-sm">
                <Calendar className="h-4 w-4" />
                Cierre de Caja
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Tarjetas de Resumen */}
        <section className="grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Ingresos Totales
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrency(resumenData.ingresos)}
            </div>
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              +12.5% vs mes anterior
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Egresos Totales
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrency(resumenData.egresos)}
            </div>
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              +5.2% vs mes anterior
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Utilidad Neta
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <PieChart className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrency(resumenData.utilidadNeta)}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Resultado del periodo
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Caja Actual
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrency(resumenData.cajaActual)}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Disponible inmediato
            </p>
          </div>
        </section>

        {/* Tabs de Navegación */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('MOVIMIENTOS')}
              className={`
                py-4 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'MOVIMIENTOS' 
                  ? 'border-[#08557f] text-[#08557f]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Movimientos Financieros
            </button>
            <button
              onClick={() => setActiveTab('GASTOS')}
              className={`
                py-4 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'GASTOS' 
                  ? 'border-[#08557f] text-[#08557f]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Control de Gastos
            </button>
            <button
              onClick={() => setActiveTab('REPORTES')}
              className={`
                py-4 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'REPORTES' 
                  ? 'border-[#08557f] text-[#08557f]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Reportes
            </button>
          </nav>
        </div>

        {/* Contenido Principal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Barra de Herramientas */}
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar movimientos..."
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-[#08557f] focus:ring-1 focus:ring-[#08557f] outline-none"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <select 
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[#08557f] outline-none"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as 'TODOS' | 'INGRESO' | 'EGRESO')}
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="INGRESO">Ingresos</option>
                <option value="EGRESO">Egresos</option>
              </select>
              <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-300">
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabla de Movimientos */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 w-32">Fecha</th>
                  <th className="px-6 py-3">Concepto</th>
                  <th className="px-6 py-3">Categoría</th>
                  <th className="px-6 py-3">Responsable</th>
                  <th className="px-6 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movimientosFiltrados.length > 0 ? (
                  movimientosFiltrados.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {mov.fecha.toLocaleDateString('es-VE')}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className={`
                            p-1.5 rounded-full 
                            ${mov.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}
                          `}>
                            {mov.tipo === 'INGRESO' ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                          </div>
                          {mov.concepto}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {mov.categoria.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {mov.responsable}
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${
                        mov.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {mov.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(mov.monto)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Briefcase className="h-8 w-8 text-gray-300" />
                        <p>No se encontraron movimientos con los filtros actuales.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Paginación simple */}
          <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-between items-center text-xs text-gray-500">
            <span>Mostrando {movimientosFiltrados.length} resultados</span>
            <div className="flex gap-2">
              <button disabled className="px-3 py-1 rounded border border-gray-200 bg-white opacity-50 cursor-not-allowed">Anterior</button>
              <button className="px-3 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50">Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModuloContablePage

