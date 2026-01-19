'use client'

import { useState } from 'react'
import {
  Package,
  DollarSign,
  Plus,
  Search,
  Filter,
  ChevronRight
} from 'lucide-react'

interface Articulo {
  id: string
  nombre: string
  categoria: string
  costoBase: number
  precioCredito: number
  plazoMeses: number
}

const ArticulosPage = () => {
  const [busqueda, setBusqueda] = useState('')

  const articulos: Articulo[] = [
    {
      id: 'AR-001',
      nombre: 'Televisor 50" UHD',
      categoria: 'Electrodomésticos',
      costoBase: 350,
      precioCredito: 520,
      plazoMeses: 12
    },
    {
      id: 'AR-002',
      nombre: 'Refrigerador 14 pies',
      categoria: 'Electrodomésticos',
      costoBase: 420,
      precioCredito: 690,
      plazoMeses: 18
    },
    {
      id: 'AR-003',
      nombre: 'Lavadora 14kg',
      categoria: 'Electrodomésticos',
      costoBase: 280,
      precioCredito: 430,
      plazoMeses: 10
    }
  ]

  const articulosFiltrados = articulos.filter((articulo) =>
    `${articulo.nombre} ${articulo.categoria}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-primary/5 px-3 py-1 text-xs text-primary tracking-wide">
              <Package className="h-3 w-3" />
              <span>Gestión de artículos</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight">
              Catálogo de electrodomésticos
            </h1>
            <p className="text-sm text-gray-500 max-w-xl">
              Define costos base y condiciones de crédito para cada artículo, alineado con las
              reglas financieras de la empresa.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:border-gray-300">
              <Plus className="h-4 w-4" />
              <span>Nuevo artículo</span>
            </button>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o categoría"
                className="w-full rounded-full border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:border-gray-300">
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.18em] text-gray-500">
                Lista de artículos
              </div>
              <span className="text-[11px] text-gray-400">
                {articulosFiltrados.length} registros visibles
              </span>
            </div>
            <div className="grid gap-3">
              {articulosFiltrados.map((articulo) => (
                <div
                  key={articulo.id}
                  className="group flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 hover:bg-white hover:border-gray-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {articulo.nombre}
                        </span>
                        <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] text-white tracking-wide">
                          {articulo.categoria}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-gray-400" />
                          <span>Costo base ${articulo.costoBase.toFixed(2)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-secondary" />
                          <span>
                            Crédito ${articulo.precioCredito.toFixed(2)} en{' '}
                            {articulo.plazoMeses} meses
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 group-hover:border-gray-300">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {articulosFiltrados.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">
                  No se encontraron artículos para los filtros aplicados.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ArticulosPage

