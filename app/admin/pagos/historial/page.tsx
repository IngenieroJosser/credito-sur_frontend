'use client'

import { useState } from 'react'
import {
  Search,
  Filter,
  Calendar,
  User,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  LayoutGrid,
  List
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'

type EstadoPago = 'completado' | 'pendiente' | 'fallido' | 'en_revision'

interface Pago {
  id: string
  fecha: string
  cliente: string
  cobrador: string
  ruta: string
  monto: number
  metodo: string
  estado: EstadoPago
}

const HistorialPagosPage = () => {
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPago | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
  const [vista, setVista] = useState<'grid' | 'list'>('list')

  const handleExportExcel = () => {
    console.log('Exporting Excel...')
  }

  const handleExportPDF = () => {
    console.log('Exporting PDF...')
  }

  const pagos: Pago[] = [
    {
      id: 'PG-001',
      fecha: '2024-03-10 09:42',
      cliente: 'María González',
      cobrador: 'Carlos Pérez',
      ruta: 'Ruta Centro',
      monto: 125500,
      metodo: 'Efectivo',
      estado: 'completado'
    },
    {
      id: 'PG-002',
      fecha: '2024-03-10 10:15',
      cliente: 'Carlos Rodríguez',
      cobrador: 'Ana López',
      ruta: 'Ruta Este',
      monto: 80000,
      metodo: 'Transferencia',
      estado: 'en_revision'
    },
    {
      id: 'PG-003',
      fecha: '2024-03-10 10:50',
      cliente: 'Ana Martínez',
      cobrador: 'Pedro Gómez',
      ruta: 'Ruta Norte',
      monto: 150000,
      metodo: 'Efectivo',
      estado: 'pendiente'
    },
    {
      id: 'PG-004',
      fecha: '2024-03-10 11:20',
      cliente: 'Luis Fernández',
      cobrador: 'Carlos Pérez',
      ruta: 'Ruta Centro',
      monto: 95750,
      metodo: 'Transferencia',
      estado: 'completado'
    }
  ]

  const getEstadoChipClasses = (estado: EstadoPago) => {
    if (estado === 'completado') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (estado === 'pendiente') return 'bg-amber-50 text-amber-700 border-amber-100'
    if (estado === 'fallido') return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-sky-50 text-sky-700 border-sky-100'
  }

  const pagosFiltrados = pagos.filter((pago) => {
    if (estadoFiltro !== 'todos' && pago.estado !== estadoFiltro) return false
    if (
      busqueda &&
      !`${pago.id} ${pago.cliente} ${pago.cobrador} ${pago.ruta}`
        .toLowerCase()
        .includes(busqueda.toLowerCase())
    ) {
      return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-sky-500 opacity-20 blur-[100px]"></div>
      </div>

      {/* Header Sticky */}
      <div className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
                <Wallet className="h-3.5 w-3.5" />
                <span>Historial de pagos</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
                Seguimiento de <span className="text-slate-700">Cuotas</span>
              </h1>
              <p className="text-slate-500 mt-2 font-medium text-sm max-w-2xl">
                Visualiza pagos registrados por cliente, cobrador y ruta.
              </p>
            </div>
            <div className="flex gap-3">
              <ExportButton 
                label="Exportar Reporte" 
                onExportExcel={handleExportExcel} 
                onExportPDF={handleExportPDF} 
              />
            </div>
          </header>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-3">
              <div className="relative flex-1 max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por cliente, cobrador o ruta"
                  className="w-full rounded-xl border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/5 transition-all placeholder:text-slate-400 hover:border-slate-300 shadow-sm"
                />
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                <Filter className="h-4 w-4 text-slate-400" />
                <span>Filtros</span>
              </button>

              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => setVista('grid')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    vista === 'grid'
                      ? 'bg-slate-100 text-primary shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setVista('list')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    vista === 'list'
                      ? 'bg-slate-100 text-primary shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setEstadoFiltro('todos')}
                className={cn(
                  "rounded-full px-4 py-1.5 border text-xs font-bold transition-all",
                  estadoFiltro === 'todos'
                    ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setEstadoFiltro('completado')}
                className={cn(
                  "rounded-full px-4 py-1.5 border text-xs font-bold transition-all",
                  estadoFiltro === 'completado'
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                )}
              >
                Completado
              </button>
              <button
                onClick={() => setEstadoFiltro('pendiente')}
                className={cn(
                  "rounded-full px-4 py-1.5 border text-xs font-bold transition-all",
                  estadoFiltro === 'pendiente'
                    ? "border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                )}
              >
                Pendiente
              </button>
              <button
                onClick={() => setEstadoFiltro('en_revision')}
                className={cn(
                  "rounded-full px-4 py-1.5 border text-xs font-bold transition-all",
                  estadoFiltro === 'en_revision'
                    ? "border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                )}
              >
                En revisión
              </button>
            </div>
          </div>

          {vista === 'list' ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>
                    Hoy se han registrado{' '}
                    <span className="font-bold text-slate-900">{pagos.length}</span> pagos
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                  <AlertCircle className="h-3 w-3" />
                  <span>Datos de ejemplo</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider font-bold">
                      <th className="px-6 py-4 text-left bg-slate-50/30">Pago</th>
                      <th className="px-6 py-4 text-left bg-slate-50/30">Cliente</th>
                      <th className="px-6 py-4 text-left bg-slate-50/30">Cobrador / Ruta</th>
                      <th className="px-6 py-4 text-left bg-slate-50/30">Monto</th>
                      <th className="px-6 py-4 text-left bg-slate-50/30">Método</th>
                      <th className="px-6 py-4 text-left bg-slate-50/30">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagosFiltrados.map((pago) => (
                      <tr
                        key={pago.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4 align-middle">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-primary group-hover:text-primary-dark transition-colors">
                              {pago.id}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {pago.fecha}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:border-slate-300 group-hover:bg-white transition-colors">
                              <User className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{pago.cliente}</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                                Cliente activo
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm text-slate-700">
                              {pago.cobrador}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              {pago.ruta}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <span className="text-sm font-bold text-slate-900 font-mono">
                            {formatCurrency(pago.monto)}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {pago.metodo}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${getEstadoChipClasses(
                              pago.estado
                            )}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                            <span>
                              {pago.estado === 'completado' && 'Completado'}
                              {pago.estado === 'pendiente' && 'Pendiente'}
                              {pago.estado === 'fallido' && 'Fallido'}
                              {pago.estado === 'en_revision' && 'En revisión'}
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                    {pagosFiltrados.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="p-3 rounded-full bg-slate-50">
                              <Search className="h-5 w-5 text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-900">No se encontraron resultados</p>
                            <p className="text-xs text-slate-500 font-medium">Intenta ajustar los filtros de búsqueda</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                <div className="text-xs font-medium text-slate-500">
                  Mostrando <span className="font-bold text-slate-900">{pagosFiltrados.length}</span> registros
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPaginaActual((prev) => Math.max(1, prev - 1))
                    }
                    disabled={paginaActual === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-2">Página {paginaActual}</span>
                  <button
                    onClick={() => setPaginaActual((prev) => prev + 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pagosFiltrados.map((pago) => (
                <div 
                  key={pago.id} 
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-slate-300 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                  
                  <div className="relative flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:border-slate-300 group-hover:bg-white transition-colors">
                        <User className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary group-hover:text-primary-dark transition-colors">
                          {pago.cliente}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                          <Wallet className="h-3 w-3" />
                          {pago.id}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getEstadoChipClasses(
                        pago.estado
                      )}`}
                    >
                      {pago.estado === 'completado' && 'Completado'}
                      {pago.estado === 'pendiente' && 'Pendiente'}
                      {pago.estado === 'fallido' && 'Fallido'}
                      {pago.estado === 'en_revision' && 'Revisión'}
                    </span>
                  </div>

                  <div className="relative space-y-3 mb-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium">Fecha</span>
                      <span className="font-bold text-slate-900">{pago.fecha}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium">Cobrador</span>
                      <span className="font-bold text-slate-900">{pago.cobrador}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium">Ruta</span>
                      <span className="font-bold text-slate-900">{pago.ruta}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium">Método</span>
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {pago.metodo}
                      </span>
                    </div>
                  </div>

                  <div className="relative pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Monto</p>
                      <p className="text-lg font-bold text-slate-900 font-mono">
                        {formatCurrency(pago.monto)}
                      </p>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              
              {pagosFiltrados.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                    <Search className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-500 font-bold">
                    No se encontraron pagos con estos filtros
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default HistorialPagosPage
