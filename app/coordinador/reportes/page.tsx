'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Calendar, Eye } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import FiltroRuta from '@/components/filtros/FiltroRuta'

const ReportesCoordinador = () => {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  const handleExportExcel = () => console.log('Exporting Excel...')
  const handleExportPDF = () => console.log('Exporting PDF...')

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Mock Data - Rendimiento Operativo
  const rendimientoRutas = [
    { id: '1', ruta: 'Ruta Centro', cobrador: 'Carlos Pérez', meta: 1500000, recaudado: 1250000, eficiencia: 83, nuevosPrestamos: 2, nuevosClientes: 1 },
    { id: '2', ruta: 'Ruta Norte', cobrador: 'María Rodríguez', meta: 1000000, recaudado: 820000, eficiencia: 82, nuevosPrestamos: 0, nuevosClientes: 0 },
    { id: '3', ruta: 'Ruta Sur', cobrador: 'Juanito Alimaña', meta: 500000, recaudado: 300000, eficiencia: 60, nuevosPrestamos: 1, nuevosClientes: 2 },
  ]

  const totalRecaudo = rendimientoRutas.reduce((acc, item) => acc + item.recaudado, 0)
  const totalMeta = rendimientoRutas.reduce((acc, item) => acc + item.meta, 0)
  const porcentajeGlobal = Math.round((totalRecaudo / totalMeta) * 100)

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-slate-50 relative text-slate-900">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200 mb-2">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Análisis de Operaciones</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Reportes </span><span className="text-orange-500">Operativos</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Consolidado del día: cobranza, préstamos y clientes captados.</p>
          </div>
        <div className="flex border-b border-slate-200 pb-4">
           <div className="flex items-center gap-3 ml-auto">
              <ExportButton label="Exportar" onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
           </div>
        </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recaudo Total</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalRecaudo)}</h3>
            <div className="mt-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">{porcentajeGlobal}% Meta</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Préstamos Nuevos</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">3</h3>
            <p className="text-xs text-slate-500 mt-2">Valor: {formatCurrency(450000)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Afiliaciones</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">3</h3>
            <p className="text-xs text-slate-500 mt-2">Nuevos clientes hoy</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Efectividad</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{porcentajeGlobal}%</h3>
            <p className="text-xs text-slate-500 mt-2">Promedio rutas</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 bg-white p-4 rounded-2xl border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800">Desglose por Ruta</h3>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <FiltroRuta 
                  onRutaChange={(r: string | null) => console.log('Ruta:', r)} 
                  selectedRutaId={null}
                  showAllOption={true}
              />
               <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-white rounded-xl transition-all shadow-sm">
                  <Calendar className="h-4 w-4 text-slate-400" /> Hoy, 22 Ene 2026
               </button>
            </div>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-800">Rendimiento Detallado de Cobradores</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-xs text-slate-400 uppercase font-bold">
                        <tr>
                            <th className="px-6 py-4">Ruta / Cobrador</th>
                            <th className="px-6 py-4 text-right">Meta</th>
                            <th className="px-6 py-4 text-right">Recaudo</th>
                            <th className="px-6 py-4 text-center">Eficiencia</th>
                            <th className="px-6 py-4 text-center">Nuevos</th>
                            <th className="px-6 py-4 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {rendimientoRutas.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-slate-900">{r.ruta}</p>
                                    <p className="text-xs text-slate-500">{r.cobrador}</p>
                                </td>
                                <td className="px-6 py-4 text-right">{formatCurrency(r.meta)}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(r.recaudado)}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", r.eficiencia >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100")}>
                                        {r.eficiencia}%
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col text-[10px]">
                                        <span>Cred: {r.nuevosPrestamos}</span>
                                        <span>Cli: {r.nuevosClientes}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => router.push(`/coordinador/reportes/${r.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
      </div>
    </div>
  )
}

export default ReportesCoordinador
