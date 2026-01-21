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
  AlertCircle
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

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
    if (estado === 'fallido') return 'bg-red-50 text-red-600 border-red-100'
    return 'bg-blue-50 text-blue-700 border-blue-100'
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
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#08557f]/5 text-xs font-medium text-[#08557f] tracking-wide border border-[#08557f]/10">
              <Wallet className="h-3.5 w-3.5" />
              <span>Historial de pagos</span>
            </div>
            <h1 className="text-3xl font-light text-gray-900 tracking-tight">
              Seguimiento de cuotas cobradas
            </h1>
            <p className="text-sm text-gray-500 max-w-xl font-light leading-relaxed">
              Visualiza en tiempo real los pagos registrados por cliente, cobrador y ruta, con
              estados claros para conciliación contable.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm">
              <Download className="h-4 w-4 text-gray-400" />
              <span>Exportar</span>
            </button>
          </div>
        </header>

        <section className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-3">
              <div className="relative flex-1 max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por cliente, cobrador o ruta"
                  className="w-full rounded-full border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#08557f] focus:ring-2 focus:ring-[#08557f]/5 transition-all placeholder:text-gray-400 hover:border-gray-300"
                />
              </div>
              <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all">
                <Filter className="h-4 w-4 text-gray-400" />
                <span>Filtros</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setEstadoFiltro('todos')}
                className={cn(
                  "rounded-full px-4 py-1.5 border text-xs font-medium transition-all",
                  estadoFiltro === 'todos'
                    ? "border-[#08557f] bg-[#08557f] text-white shadow-md shadow-[#08557f]/20"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setEstadoFiltro('completado')}
                className={cn(
                  "rounded-full px-4 py-1.5 border text-xs font-medium transition-all",
                  estadoFiltro === 'completado'
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                Completado
              </button>
              <button
                onClick={() => setEstadoFiltro('pendiente')}
                className={cn(
                  "rounded-full px-4 py-1.5 border text-xs font-medium transition-all",
                  estadoFiltro === 'pendiente'
                    ? "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                Pendiente
              </button>
              <button
                onClick={() => setEstadoFiltro('en_revision')}
                className={cn(
                  "rounded-full px-4 py-1.5 border text-xs font-medium transition-all",
                  estadoFiltro === 'en_revision'
                    ? "border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                En revisión
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-gray-50/30">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>
                  Hoy se han registrado{' '}
                  <span className="font-semibold text-gray-900">{pagos.length}</span> pagos
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">
                <AlertCircle className="h-3 w-3" />
                <span>Datos de ejemplo</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-[0.1em] font-medium">
                    <th className="px-6 py-4 text-left bg-gray-50/20">Pago</th>
                    <th className="px-6 py-4 text-left bg-gray-50/20">Cliente</th>
                    <th className="px-6 py-4 text-left bg-gray-50/20">Cobrador / Ruta</th>
                    <th className="px-6 py-4 text-left bg-gray-50/20">Monto</th>
                    <th className="px-6 py-4 text-left bg-gray-50/20">Método</th>
                    <th className="px-6 py-4 text-left bg-gray-50/20">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagosFiltrados.map((pago) => (
                    <tr
                      key={pago.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900 group-hover:text-[#08557f] transition-colors">
                            {pago.id}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {pago.fecha}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:border-[#08557f]/20 group-hover:bg-[#08557f]/5 transition-colors">
                            <User className="h-3.5 w-3.5 text-gray-400 group-hover:text-[#08557f] transition-colors" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{pago.cliente}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                              Cliente activo
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-gray-700">
                            {pago.cobrador}
                          </span>
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            {pago.ruta}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className="text-sm font-semibold text-gray-900 font-mono">
                          {formatCurrency(pago.monto)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                          {pago.metodo}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${getEstadoChipClasses(
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
                          <div className="p-3 rounded-full bg-gray-50">
                            <Search className="h-5 w-5 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">No se encontraron resultados</p>
                          <p className="text-xs text-gray-500">Intenta ajustar los filtros de búsqueda</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/30">
              <div className="text-xs text-gray-500">
                Mostrando <span className="font-semibold text-gray-900">{pagosFiltrados.length}</span> registros
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPaginaActual((prev) => Math.max(1, prev - 1))
                  }
                  disabled={paginaActual === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium text-gray-700 px-2">Página {paginaActual}</span>
                <button
                  onClick={() => setPaginaActual((prev) => prev + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default HistorialPagosPage
