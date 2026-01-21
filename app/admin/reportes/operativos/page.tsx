'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Calendar, Download, TrendingUp, Users, FilePlus, DollarSign, MapPin } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

const ReportesOperativosPage = () => {
  const [mounted, setMounted] = useState(false)

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
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        {/* Líneas de estructura */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-8 p-6 md:p-12">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#08557f]/5 text-xs text-[#08557f] tracking-wide font-medium border border-[#08557f]/10">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Reportes Operativos</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
              Rendimiento <span className="font-semibold text-[#08557f]">Diario</span>
            </h1>
            <p className="text-lg text-gray-500 mt-2 max-w-2xl font-light leading-relaxed">
              Consolidado de operaciones del día: cobranza, colocación de créditos y captación de clientes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="font-medium">Hoy, 19 Ene 2026</span>
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#08557f] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-[#08557f]/20 hover:bg-[#064364] transition-all duration-300">
              <Download className="h-4 w-4" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </header>

        {/* KPIs del Día */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-gray-200/50 hover:shadow-sm transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recaudo Total</p>
                <h3 className="text-2xl font-light text-gray-900 mt-2">{formatCurrency(totalRecaudo)}</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />
                {porcentajeGlobal}% meta
              </span>
              <span className="text-xs text-gray-400">vs ayer</span>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-gray-200/50 hover:shadow-sm transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Préstamos Nuevos</p>
                <h3 className="text-2xl font-light text-gray-900 mt-2">3</h3>
              </div>
              <div className="p-3 bg-[#08557f]/5 rounded-xl group-hover:scale-110 transition-transform">
                <FilePlus className="h-5 w-5 text-[#08557f]" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">
                Total colocado: <span className="text-gray-900 font-bold">{formatCurrency(450000)}</span>
              </span>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-gray-200/50 hover:shadow-sm transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Clientes Nuevos</p>
                <h3 className="text-2xl font-light text-gray-900 mt-2">3</h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">En 2 rutas diferentes</span>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-gray-200/50 hover:shadow-sm transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Efectividad Global</p>
                <h3 className="text-2xl font-light text-gray-900 mt-2">{porcentajeGlobal}%</h3>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Promedio rutas</span>
            </div>
          </div>
        </div>

        {/* Desglose por Ruta */}
        <section className="bg-white rounded-2xl border border-gray-200/50 overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
                <MapPin className="h-4 w-4 text-gray-500" />
              </div>
              Desglose por Ruta
            </h3>
            <button className="text-xs font-semibold text-[#08557f] hover:underline transition-colors">
              Ver detalle completo
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Ruta</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Cobrador</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Meta</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Recaudado</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-center">Eficiencia</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-center">Nuevos Prést.</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-center">Nuevos Clientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rendimientoRutas.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors bg-white">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.ruta}</td>
                    <td className="px-6 py-4 text-gray-600">{item.cobrador}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{formatCurrency(item.meta)}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(item.recaudado)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full",
                          item.eficiencia >= 80 ? 'text-emerald-700 bg-emerald-50' : 
                          item.eficiencia >= 60 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50'
                        )}>
                          {item.eficiencia}%
                        </span>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
                    <td className="px-6 py-4 text-center text-gray-600">{item.nuevosPrestamos}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{item.nuevosClientes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Gráfico de Barras Simple (CSS) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/50 hover:shadow-sm transition-all">
            <h3 className="font-medium text-gray-900 mb-6 text-lg">Comparativa de Recaudo vs Meta</h3>
            <div className="space-y-6">
              {rendimientoRutas.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.ruta}</span>
                    <span className="text-gray-500 font-light">
                      <span className="text-gray-900 font-medium">{formatCurrency(item.recaudado)}</span> 
                      <span className="mx-1 text-gray-300">/</span> 
                      {formatCurrency(item.meta)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-[#08557f] h-2 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${(item.recaudado / item.meta) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#08557f] p-8 rounded-2xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-bold text-xl mb-3">Resumen Ejecutivo</h3>
              <p className="text-white/80 text-sm mb-8 leading-relaxed max-w-sm font-light">
                La operación de hoy muestra un rendimiento sólido en la Ruta Centro. Se recomienda revisar la Ruta Sur que está por debajo del 70% de cumplimiento.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider font-medium">Mejor Ruta</p>
                    <p className="font-bold text-white">Ruta Centro (83%)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider font-medium">Clientes Atendidos</p>
                    <p className="font-bold text-white">95 visitas realizadas</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decoración de fondo */}
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-700"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ReportesOperativosPage
