'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Calendar, TrendingUp, Users, FilePlus, DollarSign, MapPin, Eye } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'

const ReportesOperativosPage = () => {
  const [mounted, setMounted] = useState(false)

  const handleExportExcel = () => {
    console.log('Exporting Excel...')
  }

  const handleExportPDF = () => {
    console.log('Exporting PDF...')
  }

  useEffect(() => {
    // Usamos setTimeout para evitar advertencias de setState síncrono
    const timer = setTimeout(() => {
      setMounted(true)
    }, 0)
    
    return () => clearTimeout(timer)
  }, [])

  // Mock Data - Values updated to realistic COP
  const rendimientoRutas = [
    { ruta: 'Ruta Centro', cobrador: 'Carlos Pérez', meta: 1500000, recaudado: 1250000, eficiencia: 83, nuevosPrestamos: 2, nuevosClientes: 1 },
    { ruta: 'Ruta Norte', cobrador: 'María Rodríguez', meta: 1000000, recaudado: 820000, eficiencia: 82, nuevosPrestamos: 0, nuevosClientes: 0 },
    { ruta: 'Ruta Sur', cobrador: 'Juanito Alimaña', meta: 500000, recaudado: 300000, eficiencia: 60, nuevosPrestamos: 1, nuevosClientes: 2 },
  ]

  const totalRecaudo = rendimientoRutas.reduce((acc, item) => acc + item.recaudado, 0)
  const totalMeta = rendimientoRutas.reduce((acc, item) => acc + item.meta, 0)
  const porcentajeGlobal = Math.round((totalRecaudo / totalMeta) * 100)

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full space-y-8 p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Reportes Operativos</span>
          </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Rendimiento </span><span className="text-orange-500">Diario</span>
            </h1>
            <p className="text-lg text-slate-500 mt-2 max-w-2xl font-medium leading-relaxed">
              Consolidado de operaciones del día: cobranza, colocación de créditos y captación de clientes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm font-bold">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>Hoy, 19 Ene 2026</span>
            </div>
            <ExportButton 
              label="Exportar" 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF} 
            />
          </div>
        </header>

        {/* KPIs del Día */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recaudo Total</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalRecaudo)}</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform border border-emerald-100">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                <TrendingUp className="h-3 w-3" />
                {porcentajeGlobal}% meta
              </span>
              <span className="text-xs text-slate-400 font-medium">vs ayer</span>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Préstamos Nuevos</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">3</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform border border-blue-100">
                <FilePlus className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                Total colocado: <span className="text-slate-900 font-bold">{formatCurrency(450000)}</span>
              </span>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clientes Nuevos</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">3</h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl group-hover:scale-110 transition-transform border border-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">En 2 rutas diferentes</span>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Efectividad Global</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{porcentajeGlobal}%</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform border border-amber-100">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Promedio rutas</span>
            </div>
          </div>
        </div>

        {/* Desglose por Ruta */}
        <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-white/50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200">
                <MapPin className="h-4 w-4 text-slate-500" />
              </div>
              Desglose por Ruta
            </h3>
            <button className="text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline transition-colors">
              Ver detalle completo
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 font-bold">
                <tr>
                  <th className="px-6 py-4 tracking-wider">Ruta</th>
                  <th className="px-6 py-4 tracking-wider">Cobrador</th>
                  <th className="px-6 py-4 tracking-wider text-right">Meta</th>
                  <th className="px-6 py-4 tracking-wider text-right">Recaudado</th>
                  <th className="px-6 py-4 tracking-wider text-center">Eficiencia</th>
                  <th className="px-6 py-4 tracking-wider text-center">Nuevos Prést.</th>
                  <th className="px-6 py-4 tracking-wider text-center">Nuevos Clientes</th>
                  <th className="px-6 py-4 tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rendimientoRutas.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors bg-white/0">
                    <td className="px-6 py-4 font-bold text-slate-900">{item.ruta}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{item.cobrador}</td>
                    <td className="px-6 py-4 text-right text-slate-500 font-medium">{formatCurrency(item.meta)}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(item.recaudado)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full border",
                          item.eficiencia >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 
                          item.eficiencia >= 60 ? 'text-yellow-700 bg-yellow-50 border-yellow-100' : 'text-red-700 bg-red-50 border-red-100'
                        )}>
                          {item.eficiencia}%
                        </span>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              item.eficiencia >= 80 ? 'bg-emerald-500' : 
                              item.eficiencia >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${item.eficiencia}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 font-medium">{item.nuevosPrestamos}</td>
                    <td className="px-6 py-4 text-center text-slate-600 font-medium">{item.nuevosClientes}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Gráfico de Barras Simple (CSS) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <h3 className="font-bold text-slate-900 mb-6 text-lg">Comparativa de Recaudo vs Meta</h3>
            <div className="space-y-6">
              {rendimientoRutas.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-700">{item.ruta}</span>
                    <span className="text-slate-500 font-medium">
                      <span className="text-slate-900 font-bold">{formatCurrency(item.recaudado)}</span> 
                      <span className="mx-1 text-slate-300">/</span> 
                      {formatCurrency(item.meta)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-slate-900 h-2 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${(item.recaudado / item.meta) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-bold text-xl mb-3 text-slate-900">Resumen</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">
                La operación de hoy muestra un rendimiento sólido en la Ruta Centro. Se recomienda revisar la Ruta Sur que está por debajo del 70% de cumplimiento.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Mejor Ruta</p>
                    <p className="font-bold text-slate-900">Ruta Centro (83%)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    <Users className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Clientes Atendidos</p>
                    <p className="font-bold text-slate-900">95 visitas realizadas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ReportesOperativosPage
