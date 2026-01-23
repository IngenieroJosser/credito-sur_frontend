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
  Wallet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Edit2,
  Lock,
  Plus,
  History,
  Receipt
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'

// Interfaces alineadas con el dominio
interface Caja {
  id: string
  nombre: string
  tipo: 'PRINCIPAL' | 'RUTA'
  responsable: string
  saldo: number
  estado: 'ABIERTA' | 'CERRADA'
  ultimaActualizacion: string
}

interface HistorialCierre {
  id: string
  fecha: string
  caja: string
  responsable: string
  saldoSistema: number
  saldoReal: number
  diferencia: number
  estado: 'CUADRADA' | 'DESCUADRADA'
}

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
  const [activeTab, setActiveTab] = useState<'MOVIMIENTOS' | 'CAJAS' | 'HISTORIAL'>('CAJAS')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS')

  // Mock Data: Cajas
  const [cajas] = useState<Caja[]>([
    {
      id: 'CAJA-MAIN',
      nombre: 'Caja Principal Oficina',
      tipo: 'PRINCIPAL',
      responsable: 'Ana Admin',
      saldo: 5200000,
      estado: 'ABIERTA',
      ultimaActualizacion: 'Hace 10 min'
    },
    {
      id: 'CAJA-R1',
      nombre: 'Caja Ruta Norte',
      tipo: 'RUTA',
      responsable: 'Carlos Cobrador',
      saldo: 850000,
      estado: 'ABIERTA',
      ultimaActualizacion: 'Hace 2 horas'
    },
    {
      id: 'CAJA-R2',
      nombre: 'Caja Ruta Sur',
      tipo: 'RUTA',
      responsable: 'Pedro Supervisor',
      saldo: 120000,
      estado: 'CERRADA',
      ultimaActualizacion: 'Ayer 6:00 PM'
    }
  ])

  // Mock Data: Historial Cierres
  const [historialCierres] = useState<HistorialCierre[]>([
    {
      id: 'CIERRE-001',
      fecha: '2026-01-22T18:30:00',
      caja: 'Caja Principal Oficina',
      responsable: 'Ana Admin',
      saldoSistema: 5200000,
      saldoReal: 5200000,
      diferencia: 0,
      estado: 'CUADRADA'
    },
    {
      id: 'CIERRE-002',
      fecha: '2026-01-22T17:00:00',
      caja: 'Caja Ruta Norte',
      responsable: 'Carlos Cobrador',
      saldoSistema: 850000,
      saldoReal: 845000,
      diferencia: -5000,
      estado: 'DESCUADRADA'
    },
    {
      id: 'CIERRE-003',
      fecha: '2026-01-21T18:00:00',
      caja: 'Caja Principal Oficina',
      responsable: 'Ana Admin',
      saldoSistema: 4800000,
      saldoReal: 4800000,
      diferencia: 0,
      estado: 'CUADRADA'
    }
  ])

  const handleExportExcel = () => {
    console.log('Exporting Excel...')
  }

  const handleExportPDF = () => {
    console.log('Exporting PDF...')
  }

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
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-8 space-y-8">
        {/* Header Ultra Clean */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                <DollarSign className="h-3.5 w-3.5" />
                <span>Gestión Financiera</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="text-blue-600">Gestión </span><span className="text-orange-500">Contable</span>
              </h1>
              <p className="text-base text-slate-500 max-w-xl font-medium">
                Control centralizado de flujos de caja, gastos operativos y rentabilidad.
              </p>
            </div>
            
            <div className="flex gap-3">
              <ExportButton 
                label="Exportar" 
                onExportExcel={handleExportExcel} 
                onExportPDF={handleExportPDF} 
              />
              <Link 
                href="/admin/contable/cierre-caja"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 transform active:scale-95"
              >
                <Calendar className="h-4 w-4" />
                Cierre de Caja
              </Link>
            </div>
        </header>

        {/* Tarjetas de Resumen Minimalistas */}
        <section className="grid gap-6 md:grid-cols-4">
          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ingresos
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(resumenData.ingresos)}
            </div>
            <div className="mt-2 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +12.5%
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Egresos
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(resumenData.egresos)}
            </div>
            <div className="mt-2 flex items-center text-xs font-bold text-red-600 bg-red-50 w-fit px-2 py-1 rounded-full">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +5.2%
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Utilidad Neta
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                <PieChart className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(resumenData.utilidadNeta)}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Margen operativo saludable
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Caja Actual
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(resumenData.cajaActual)}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Disponible inmediato
            </div>
          </div>
        </section>

        {/* Tabs de Navegación Clean */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setActiveTab('CAJAS')}
              className={cn(
                "py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
                activeTab === 'CAJAS' 
                  ? "border-slate-900 text-slate-900" 
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <Wallet className="h-4 w-4" />
              Control de Cajas
            </button>
            <button
              onClick={() => setActiveTab('MOVIMIENTOS')}
              className={cn(
                "py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
                activeTab === 'MOVIMIENTOS' 
                  ? "border-slate-900 text-slate-900" 
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <FileText className="h-4 w-4" />
              Movimientos
            </button>
            <button
              onClick={() => setActiveTab('HISTORIAL')}
              className={cn(
                "py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
                activeTab === 'HISTORIAL' 
                  ? "border-slate-900 text-slate-900" 
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <History className="h-4 w-4" />
              Historial de Cierres
            </button>
          </nav>
        </div>

        {/* Contenido Principal */}
        {activeTab === 'CAJAS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cajas.map((caja) => (
              <div key={caja.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "p-3 rounded-xl",
                    caja.tipo === 'PRINCIPAL' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"
                  )}>
                    <Wallet className="h-6 w-6" />
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-bold border",
                    caja.estado === 'ABIERTA' 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  )}>
                    {caja.estado}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{caja.nombre}</h3>
                <p className="text-sm text-slate-500 font-medium mb-4">{caja.responsable}</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-2xl font-bold text-slate-900">{formatCurrency(caja.saldo)}</span>
                  <span className="text-xs text-slate-400 font-medium">COP</span>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Act: {caja.ultimaActualizacion}</span>
                  <div className="flex items-center gap-2">
                    <Link 
                          href={`/admin/contable/cajas/${caja.id}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver Detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link 
                          href={`/admin/contable/cajas/${caja.id}/editar`}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Editar Caja"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                    {caja.estado === 'ABIERTA' && (
                      <Link 
                        href="/admin/contable/cierre-caja"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Cerrar Caja"
                      >
                        <Lock className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'MOVIMIENTOS' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Barra de Herramientas */}
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/50">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por concepto, responsable..."
                className="w-full rounded-xl border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <Link
                href="/admin/contable/movimientos/nuevo"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm font-bold text-sm group"
              >
                <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
                <span>Registrar Movimiento</span>
              </Link>
              <select 
                className="rounded-xl border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm font-medium text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none cursor-pointer"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as 'TODOS' | 'INGRESO' | 'EGRESO')}
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="INGRESO">Ingresos</option>
                <option value="EGRESO">Egresos</option>
              </select>
              <button className="p-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl border border-slate-200 transition-colors">
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabla de Movimientos */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-40">Fecha</th>
                  <th className="px-6 py-4">Concepto</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Responsable</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimientosFiltrados.length > 0 ? (
                  movimientosFiltrados.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap font-medium">
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
                              ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 border border-emerald-100" 
                              : "bg-red-50 text-red-600 group-hover:bg-red-100 border border-red-100"
                          )}>
                            {mov.tipo === 'INGRESO' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          </div>
                          <span className="font-bold text-slate-900">{mov.concepto}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                          {mov.categoria.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {mov.responsable}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-bold",
                        mov.tipo === 'INGRESO' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {mov.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(mov.monto)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/admin/contable/movimientos/${mov.id}`}
                          className="inline-flex p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver Detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-200">
                          <Briefcase className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-base font-bold text-slate-900">No se encontraron movimientos</p>
                        <p className="text-sm font-medium">Intenta ajustar los filtros de búsqueda.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Paginación simple */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500 font-medium">
            <span>Mostrando {movimientosFiltrados.length} resultados</span>
            <div className="flex gap-2">
              <button disabled className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white opacity-50 cursor-not-allowed font-bold">Anterior</button>
              <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 transition-colors">Siguiente</button>
            </div>
          </div>
          </div>
        )}

        {activeTab === 'HISTORIAL' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white/50">
               <div>
                  <h2 className="text-lg font-bold text-slate-900">Historial de Cierres</h2>
                  <p className="text-sm text-slate-500">Registro histórico de arqueos y cierres de caja.</p>
               </div>
               <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm">
                  <Download className="h-4 w-4" />
                  Descargar Informe
               </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Fecha Cierre</th>
                    <th className="px-6 py-4">Caja</th>
                    <th className="px-6 py-4">Responsable</th>
                    <th className="px-6 py-4 text-right">Saldo Sistema</th>
                    <th className="px-6 py-4 text-right">Saldo Real</th>
                    <th className="px-6 py-4 text-right">Diferencia</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historialCierres.map((cierre) => (
                    <tr key={cierre.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">
                        {new Date(cierre.fecha).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {cierre.caja}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {cierre.responsable}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-600">
                        {formatCurrency(cierre.saldoSistema)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {formatCurrency(cierre.saldoReal)}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-bold",
                        cierre.diferencia === 0 ? "text-slate-400" : (cierre.diferencia > 0 ? "text-emerald-600" : "text-rose-600")
                      )}>
                        {cierre.diferencia > 0 ? '+' : ''}{formatCurrency(cierre.diferencia)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border",
                          cierre.estado === 'CUADRADA'
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        )}>
                          {cierre.estado === 'CUADRADA' ? (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertCircle className="w-3 h-3 mr-1" />
                          )}
                          {cierre.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/admin/contable/historial/${cierre.id}`}
                          className="inline-flex p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="Ver Comprobante"
                        >
                          <Receipt className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModuloContablePage