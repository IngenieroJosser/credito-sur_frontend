'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  User,
  Clock,
  ChevronRight
} from 'lucide-react'

type NivelRiesgo = 'verde' | 'amarillo' | 'rojo'

interface CuentaMora {
  id: string
  cliente: string
  documento: string
  diasMora: number
  montoMora: number
  montoCuota: number
  ruta: string
  cobrador: string
  nivelRiesgo: NivelRiesgo
}

const CuentasMoraPage = () => {
  const [filtroRiesgo, setFiltroRiesgo] = useState<NivelRiesgo | 'todos'>(
    'todos'
  )
  const [busqueda, setBusqueda] = useState('')

  const cuentas: CuentaMora[] = [
    {
      id: 'CM-001',
      cliente: 'Carlos Rodríguez',
      documento: 'V-23456789',
      diasMora: 12,
      montoMora: 1250,
      montoCuota: 850,
      ruta: 'Ruta Centro',
      cobrador: 'Juan Pérez',
      nivelRiesgo: 'rojo'
    },
    {
      id: 'CM-002',
      cliente: 'Ana Martínez',
      documento: 'V-34567890',
      diasMora: 5,
      montoMora: 450,
      montoCuota: 300,
      ruta: 'Ruta Norte',
      cobrador: 'María Gómez',
      nivelRiesgo: 'amarillo'
    },
    {
      id: 'CM-003',
      cliente: 'Luis Fernández',
      documento: 'V-45678901',
      diasMora: 1,
      montoMora: 150,
      montoCuota: 150,
      ruta: 'Ruta Este',
      cobrador: 'Pedro López',
      nivelRiesgo: 'verde'
    }
  ]

  const cuentasFiltradas = cuentas.filter((cuenta) => {
    if (filtroRiesgo !== 'todos' && cuenta.nivelRiesgo !== filtroRiesgo) {
      return false
    }
    if (
      busqueda &&
      !`${cuenta.cliente} ${cuenta.documento} ${cuenta.ruta}`
        .toLowerCase()
        .includes(busqueda.toLowerCase())
    ) {
      return false
    }
    return true
  })

  const totalMora = cuentas.reduce((acc, cuenta) => acc + cuenta.montoMora, 0)
  const promedioDias = cuentas.reduce((acc, cuenta) => acc + cuenta.diasMora, 0) / cuentas.length

  const getChipClasses = (nivel: NivelRiesgo) => {
    if (nivel === 'verde') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (nivel === 'amarillo') return 'bg-amber-50 text-amber-700 border-amber-100'
    return 'bg-red-50 text-red-600 border-red-100'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-red-50 text-xs text-red-600 tracking-wide">
            <AlertCircle className="h-3 w-3" />
            <span>Cuentas en mora</span>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
                Radar de riesgo y mora
              </h1>
              <p className="text-sm text-gray-500 max-w-xl">
                Identifica de forma instantánea los clientes en mora, prioriza gestiones y controla intereses adicionales autorizados por coordinación.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:border-gray-300">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span>Reducir cartera vencida</span>
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    Monto en mora
                  </div>
                  <TrendingUp className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-light text-gray-900">
                  ${totalMora.toFixed(2)}
                </div>
                <p className="text-xs text-gray-400">
                  Incluye cuotas vencidas y recargos por mora.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    Antigüedad promedio
                  </div>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-light text-gray-900">
                  {Math.round(promedioDias)} días
                </div>
                <p className="text-xs text-gray-400">
                  Desde el primer día de vencimiento hasta regularización.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 gap-2">
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar por cliente, documento o ruta"
                      className="w-full rounded-full border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#08557f] focus:ring-2 focus:ring-[#08557f]/10 transition-all"
                    />
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:border-gray-300">
                    <Filter className="h-4 w-4" />
                    <span>Filtros</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  onClick={() => setFiltroRiesgo('todos')}
                  className={`rounded-full px-3 py-1 border ${
                    filtroRiesgo === 'todos'
                      ? 'border-gray-800 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroRiesgo('verde')}
                  className={`rounded-full px-3 py-1 border ${
                    filtroRiesgo === 'verde'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  Verde
                </button>
                <button
                  onClick={() => setFiltroRiesgo('amarillo')}
                  className={`rounded-full px-3 py-1 border ${
                    filtroRiesgo === 'amarillo'
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  Amarillo
                </button>
                <button
                  onClick={() => setFiltroRiesgo('rojo')}
                  className={`rounded-full px-3 py-1 border ${
                    filtroRiesgo === 'rojo'
                      ? 'border-red-400 bg-red-50 text-red-600'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  Rojo
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-[0.18em]">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span>Detalle de cuentas en mora</span>
              </div>
              <span className="text-[11px] text-gray-400">
                {cuentasFiltradas.length} clientes en la vista actual
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-xs text-gray-500 uppercase tracking-[0.18em]">
                    <th className="px-3 py-3 text-left">Cliente</th>
                    <th className="px-3 py-3 text-left">Días</th>
                    <th className="px-3 py-3 text-left">Mora</th>
                    <th className="px-3 py-3 text-left">Cuota</th>
                    <th className="px-3 py-3 text-left">Ruta</th>
                    <th className="px-3 py-3 text-left">Riesgo</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentasFiltradas.map((cuenta) => (
                    <tr
                      key={cuenta.id}
                      className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#08557f]/10 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-[#08557f]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-800">
                              {cuenta.cliente}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {cuenta.documento}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="text-sm text-gray-800">
                          {cuenta.diasMora} días
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="text-sm font-medium text-red-600">
                          ${cuenta.montoMora.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="text-sm text-gray-700">
                          ${cuenta.montoCuota.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-800">
                            {cuenta.ruta}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {cuenta.cobrador}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${getChipClasses(
                            cuenta.nivelRiesgo
                          )}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                          <span className="capitalize">
                            {cuenta.nivelRiesgo}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle text-right">
                        <button className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-gray-300">
                          <span>Opciones</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cuentasFiltradas.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-10 text-center text-sm text-gray-500"
                      >
                        No hay cuentas en mora con los filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default CuentasMoraPage

