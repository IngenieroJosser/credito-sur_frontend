'use client'

import { useState } from 'react'
import {
  Archive,
  Search,
  Clock,
  LayoutGrid,
  List,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'

// Enums
type NivelRiesgo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'LISTA_NEGRA';
type ViewMode = 'list' | 'grid';

interface CuentaVencida {
  id: string
  numeroPrestamo: string
  cliente: {
    nombre: string
    documento: string
  }
  fechaVencimiento: string
  diasVencidos: number
  saldoPendiente: number
  montoOriginal: number
  ruta: string
  nivelRiesgo: NivelRiesgo
}

const CuentasVencidasCoordinador = () => {
  const [busqueda, setBusqueda] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const handleExportExcel = () => console.log('Exporting Excel...')
  const handleExportPDF = () => console.log('Exporting PDF...')

  // Datos mock para Cuentas Vencidas
  const cuentas: CuentaVencida[] = [
    {
      id: 'v1',
      numeroPrestamo: 'P-2023-500',
      cliente: { nombre: 'Luisa Fernanda Martínez', documento: '1.050.555.555' },
      fechaVencimiento: '2023-11-20',
      diasVencidos: 68,
      saldoPendiente: 5000000,
      montoOriginal: 5000000,
      ruta: 'Ruta Sur',
      nivelRiesgo: 'LISTA_NEGRA'
    },
    {
      id: 'v2',
      numeroPrestamo: 'P-2023-120',
      cliente: { nombre: 'Valentina Castro', documento: '1.110.606.060' },
      fechaVencimiento: '2023-12-15',
      diasVencidos: 43,
      saldoPendiente: 700000,
      montoOriginal: 1200000,
      ruta: 'Ruta Norte',
      nivelRiesgo: 'LISTA_NEGRA'
    },
    {
      id: 'v3',
      numeroPrestamo: 'P-2023-888',
      cliente: { nombre: 'Andrés Vargas', documento: '1.090.404.040' },
      fechaVencimiento: '2024-01-05',
      diasVencidos: 22,
      saldoPendiente: 250000,
      montoOriginal: 3500000,
      ruta: 'Ruta Centro',
      nivelRiesgo: 'ROJO'
    }
  ]

  const filtradas = cuentas.filter(c => 
    c.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    c.numeroPrestamo.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalVencido = filtradas.reduce((sum, c) => sum + c.saldoPendiente, 0)

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 md:px-8 py-8 space-y-8 text-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 mb-2 border border-slate-200">
              <Archive className="h-3.5 w-3.5" />
              <span>Cuentas para Castigo / Jurídico</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Cuentas </span><span className="text-slate-900">Vencidas</span>
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1 font-medium">
              Créditos cuya fecha final de contrato ha expirado sin ser liquidados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExportButton label="Exportar " onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Capital Final Vencido</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalVencido)}</h3>
            </div>
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
              <Archive className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Días Promedio Vencimiento</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">45 Días</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Filtro de Ruta Integrado con estilo estándar */}
            <div className="bg-slate-50 p-1 rounded-xl border border-slate-200">
                <FiltroRuta 
                    onRutaChange={(r) => console.log('Ruta:', r)} 
                    selectedRutaId={null}
                    className="w-48"
                    showAllOption={true}
                />
            </div>

            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500/10"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg", viewMode === 'list' ? "bg-slate-100 text-blue-600" : "text-slate-400")}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg", viewMode === 'grid' ? "bg-slate-100 text-blue-600" : "text-slate-400")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Préstamo / Cliente</th>
                <th className="px-6 py-4">Vencimiento</th>
                <th className="px-6 py-4 text-center">Días</th>
                <th className="px-6 py-4 text-right">Saldo Pendiente</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{c.numeroPrestamo}</div>
                    <div className="text-xs text-slate-500">{c.cliente.nombre}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-3.5 w-3.5" />
                      {c.fechaVencimiento}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100">
                      {c.diasVencidos} un.
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-bold text-slate-900">{formatCurrency(c.saldoPendiente)}</div>
                    <div className="text-xs text-slate-400">Orig: {formatCurrency(c.montoOriginal)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/coordinador/cuentas-vencidas/${c.id}`} 
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-blue-200 text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-all text-xs shadow-sm hover:shadow-md"
                    >
                      Ver Expediente
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CuentasVencidasCoordinador
