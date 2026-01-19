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
      monto: 125.5,
      metodo: 'Efectivo',
      estado: 'completado'
    },
    {
      id: 'PG-002',
      fecha: '2024-03-10 10:15',
      cliente: 'Carlos Rodríguez',
      cobrador: 'Ana López',
      ruta: 'Ruta Este',
      monto: 80,
      metodo: 'Transferencia',
      estado: 'en_revision'
    },
    {
      id: 'PG-003',
      fecha: '2024-03-10 10:50',
      cliente: 'Ana Martínez',
      cobrador: 'Pedro Gómez',
      ruta: 'Ruta Norte',
      monto: 150,
      metodo: 'Efectivo',
      estado: 'pendiente'
    },
    {
      id: 'PG-004',
      fecha: '2024-03-10 11:20',
      cliente: 'Luis Fernández',
      cobrador: 'Carlos Pérez',
      ruta: 'Ruta Centro',
      monto: 95.75,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#08557f]/5 text-xs text-[#08557f] tracking-wide">
              <Wallet className="h-3 w-3" />
              <span>Historial de pagos</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
              Seguimiento de cuotas cobradas
            </h1>
            <p className="text-sm text-gray-500 max-w-xl">
              Visualiza en tiempo real los pagos registrados por cliente, cobrador y ruta, con
              estados claros para conciliación contable.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:border-gray-300">
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-3">
              <div className="relative flex-1 max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por cliente, cobrador o ruta"
                  className="w-full rounded-full border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#08557f] focus:ring-2 focus:ring-[#08557f]/10 transition-all"
                />
              </div>
              <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:border-gray-300">
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => setEstadoFiltro('todos')}
                className={`rounded-full px-3 py-1 border text-xs ${
                  estadoFiltro === 'todos'
                    ? 'border-[#08557f] bg-[#08557f]/5 text-[#08557f]'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setEstadoFiltro('completado')}
                className={`rounded-full px-3 py-1 border text-xs ${
                  estadoFiltro === 'completado'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                Completado
              </button>
              <button
                onClick={() => setEstadoFiltro('pendiente')}
                className={`rounded-full px-3 py-1 border text-xs ${
                  estadoFiltro === 'pendiente'
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                Pendiente
              </button>
              <button
                onClick={() => setEstadoFiltro('en_revision')}
                className={`rounded-full px-3 py-1 border text-xs ${
                  estadoFiltro === 'en_revision'
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                En revisión
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>
                  Hoy se han registrado{' '}
                  <span className="font-semibold text-gray-800">{pagos.length}</span> pagos
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Datos de ejemplo para diseño de interfaz</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-xs text-gray-500 uppercase tracking-[0.18em]">
                    <th className="px-4 py-3 text-left">Pago</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Cobrador / Ruta</th>
                    <th className="px-4 py-3 text-left">Monto</th>
                    <th className="px-4 py-3 text-left">Método</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosFiltrados.map((pago) => (
                    <tr
                      key={pago.id}
                      className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-800">
                            {pago.id}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {pago.fecha}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#08557f]/10 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-[#08557f]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-800">{pago.cliente}</span>
                            <span className="text-[11px] text-gray-500">
                              Cliente activo
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-800">
                            {pago.cobrador}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {pago.ruta}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-sm font-medium text-gray-800">
                          ${pago.monto.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-xs text-gray-600">{pago.metodo}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${getEstadoChipClasses(
                            pago.estado
                          )}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
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
                        className="px-4 py-10 text-center text-sm text-gray-500"
                      >
                        No se encontraron pagos con los filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span>Mostrando</span>
                <span className="font-medium text-gray-700">
                  {pagosFiltrados.length}
                </span>
                <span>registros</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setPaginaActual((prev) => Math.max(1, prev - 1))
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span>Página {paginaActual}</span>
                <button
                  onClick={() => setPaginaActual((prev) => prev + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-300"
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

