'use client'

import { BarChart3, Calendar, Download, TrendingUp, Users, FilePlus, DollarSign, MapPin } from 'lucide-react'

const ReportesOperativosPage = () => {
  // Mock Data
  const rendimientoRutas = [
    { ruta: 'Ruta Centro', cobrador: 'Carlos Pérez', meta: 15000, recaudado: 12500, eficiencia: 83, nuevosPrestamos: 2, nuevosClientes: 1 },
    { ruta: 'Ruta Norte', cobrador: 'María Rodríguez', meta: 10000, recaudado: 8200, eficiencia: 82, nuevosPrestamos: 0, nuevosClientes: 0 },
    { ruta: 'Ruta Sur', cobrador: 'Juanito Alimaña', meta: 5000, recaudado: 3000, eficiencia: 60, nuevosPrestamos: 1, nuevosClientes: 2 },
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50/50 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/10 px-3 py-1 text-xs text-[#08557f] tracking-wide font-medium border border-[#08557f]/10">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Reportes Operativos</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Rendimiento Diario
            </h1>
            <p className="text-sm text-gray-500 max-w-xl">
              Consolidado de operaciones del día: cobranza, colocación de créditos y captación de clientes.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="font-medium">Hoy, 19 Ene 2026</span>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#08557f] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#08557f]/20 hover:bg-[#064364] transition-all">
              <Download className="h-4 w-4" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </header>

        {/* KPIs del Día */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recaudo Total</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(23700)}</h3>
                <div className="mt-2 text-xs font-medium text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>79% de la meta diaria</span>
                </div>
              </div>
              <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Préstamos Nuevos</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">3</h3>
                <div className="mt-2 text-xs font-medium text-blue-600">
                  Total: {formatCurrency(4500)}
                </div>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <FilePlus className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clientes Nuevos</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">3</h3>
                <div className="mt-2 text-xs text-gray-500">
                  En 2 rutas diferentes
                </div>
              </div>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Efectividad Global</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">79%</h3>
                <div className="mt-2 text-xs text-gray-500">
                  Promedio de todas las rutas
                </div>
              </div>
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Desglose por Ruta */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              Desglose por Ruta
            </h3>
            <button className="text-xs font-medium text-[#08557f] hover:underline">Ver detalle completo</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/30">
                <tr>
                  <th className="px-6 py-3 font-medium">Ruta</th>
                  <th className="px-6 py-3 font-medium">Cobrador</th>
                  <th className="px-6 py-3 font-medium text-right">Meta</th>
                  <th className="px-6 py-3 font-medium text-right">Recaudado</th>
                  <th className="px-6 py-3 font-medium text-center">Eficiencia</th>
                  <th className="px-6 py-3 font-medium text-center">Nuevos Prést.</th>
                  <th className="px-6 py-3 font-medium text-center">Nuevos Clientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rendimientoRutas.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.ruta}</td>
                    <td className="px-6 py-4 text-gray-600">{item.cobrador}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{formatCurrency(item.meta)}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(item.recaudado)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-xs font-bold ${
                          item.eficiencia >= 80 ? 'text-green-600' : 
                          item.eficiencia >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {item.eficiencia}%
                        </span>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              item.eficiencia >= 80 ? 'bg-green-500' : 
                              item.eficiencia >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
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
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-6">Comparativa de Recaudo vs Meta</h3>
            <div className="space-y-4">
              {rendimientoRutas.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{item.ruta}</span>
                    <span className="text-gray-500">{formatCurrency(item.recaudado)} / {formatCurrency(item.meta)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-[#08557f] h-2.5 rounded-full" 
                      style={{ width: `${(item.recaudado / item.meta) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#08557f] p-6 rounded-xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Resumen Ejecutivo</h3>
              <p className="text-blue-100 text-sm mb-6 max-w-xs">
                La operación de hoy muestra un rendimiento sólido en la Ruta Centro. Se recomienda revisar la Ruta Sur que está por debajo del 70% de cumplimiento.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-green-300" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-200">Mejor Ruta</p>
                    <p className="font-medium">Ruta Centro (83%)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-200">Clientes Atendidos</p>
                    <p className="font-medium">95 visitas realizadas</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decoración de fondo */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ReportesOperativosPage
