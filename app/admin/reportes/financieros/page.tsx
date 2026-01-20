'use client'

import React, { useState, useEffect } from 'react'
import { 
  LineChart, 
  DollarSign, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  ArrowUpRight, 
  Target
} from 'lucide-react'
import { 
  getFinancialSummary, 
  getMonthlyEvolution, 
  getExpenseDistribution,
  FinancialSummary,
  MonthlyEvolution,
  ExpenseDistribution
} from '@/services/reportes-service'

// Interfaces
type ExpenseWithPercentage = ExpenseDistribution & {
  porcentaje: number
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const ReportesFinancierosPage = () => {
  const [periodo, setPeriodo] = useState('ANUAL')
  const [loading, setLoading] = useState(true)
  
  const [summary, setSummary] = useState<FinancialSummary>({
    ingresos: 0,
    egresos: 0,
    utilidad: 0,
    margen: 0
  })
  
  const [monthlyData, setMonthlyData] = useState<MonthlyEvolution[]>([])
  const [expenseData, setExpenseData] = useState<ExpenseWithPercentage[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const currentYear = new Date().getFullYear()
        
        // Ejecutar peticiones en paralelo
        const [summaryRes, monthlyRes, expenseRes] = await Promise.all([
          getFinancialSummary(), // Por defecto año actual/mes actual según backend logic o ajustar params
          getMonthlyEvolution(currentYear),
          getExpenseDistribution()
        ])

        setSummary(summaryRes)
        setMonthlyData(monthlyRes)

        // Calcular porcentajes para gastos
        const totalGastos = expenseRes.reduce((acc, curr) => acc + curr.monto, 0)
        const expensesWithPercentage = expenseRes.map(item => ({
          categoria: item.categoria,
          monto: item.monto,
          porcentaje: totalGastos > 0 ? Math.round((item.monto / totalGastos) * 100) : 0
        })).sort((a, b) => b.monto - a.monto) // Ordenar por monto descendente

        setExpenseData(expensesWithPercentage)
      } catch (error) {
        console.error('Error fetching financial reports:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [periodo]) // Recargar si cambia el periodo (aunque por ahora periodo es solo UI, se podría conectar a la API)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#08557f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Cargando reportes financieros...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide font-medium">
              <LineChart className="h-3.5 w-3.5" />
              <span>Reportes financieros</span>
            </div>
            <h1 className="text-3xl font-light text-gray-900 tracking-tight">
              Ingresos, egresos y rentabilidad
            </h1>
            <p className="text-sm text-gray-500 max-w-xl leading-relaxed">
              Análisis detallado del desempeño financiero. Visualice tendencias, controle gastos y monitoree la rentabilidad del negocio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              {['MENSUAL', 'TRIMESTRAL', 'ANUAL'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    periodo === p 
                      ? 'bg-gray-100 text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#08557f] px-4 py-2 text-xs font-medium text-white hover:bg-[#064364] transition-colors shadow-sm">
              <Download className="h-4 w-4" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ingresos Totales</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.ingresos)}</h3>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-emerald-600 font-medium">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>Actualizado hoy</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Egresos Totales</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.egresos)}</h3>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-red-600 font-medium">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>Actualizado hoy</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Utilidad Neta</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.utilidad)}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-emerald-600 font-medium">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>Rentable</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Margen Promedio</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.margen.toFixed(1)}%</h3>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <PieChart className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Target className="h-3 w-3 mr-1" />
              <span>Meta: 45%</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart: Monthly Trends */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Evolución Financiera Mensual</h3>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#08557f]"></div>
                  <span className="text-gray-600">Ingresos</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <span className="text-gray-600">Egresos</span>
                </div>
              </div>
            </div>
            
            {/* Custom Bar Chart Visualization */}
            <div className="h-64 flex items-end justify-between gap-2 md:gap-4">
              {monthlyData.map((item) => {
                const maxVal = Math.max(...monthlyData.map(d => d.ingresos), 1) // Avoid division by zero
                const heightIngreso = (item.ingresos / maxVal) * 100
                const heightEgreso = (item.egresos / maxVal) * 100
                
                return (
                  <div key={item.mes} className="flex-1 flex flex-col justify-end items-center group relative">
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10 pointer-events-none">
                      Ing: {formatCurrency(item.ingresos)} <br/> Egr: {formatCurrency(item.egresos)}
                    </div>
                    <div className="w-full flex gap-1 items-end justify-center h-full">
                      <div 
                        className="w-1/2 bg-[#08557f] rounded-t-sm transition-all duration-500 hover:bg-[#064364]"
                        style={{ height: `${heightIngreso}%` }}
                      ></div>
                      <div 
                        className="w-1/2 bg-red-400 rounded-t-sm transition-all duration-500 hover:bg-red-500"
                        style={{ height: `${heightEgreso}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2 font-medium">{item.mes}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Side Chart: Expense Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribución de Gastos</h3>
            <div className="space-y-6">
              {expenseData.length > 0 ? (
                expenseData.map((cat) => (
                  <div key={cat.categoria}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{cat.categoria}</span>
                      <span className="text-gray-500">{cat.porcentaje}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gray-800 h-2 rounded-full" 
                        style={{ width: `${cat.porcentaje}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">{formatCurrency(cat.monto)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No hay gastos registrados en este periodo.</p>
              )}
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Observación del Contador</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Los gastos operativos se han mantenido estables. Se recomienda revisar el presupuesto de marketing para el próximo trimestre.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Detalle Financiero por Periodo</h3>
            <button className="text-sm text-[#08557f] font-medium hover:underline">Ver reporte completo</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Periodo</th>
                  <th className="px-6 py-3 text-right">Ingresos Operativos</th>
                  <th className="px-6 py-3 text-right">Gastos & Costos</th>
                  <th className="px-6 py-3 text-right">Utilidad Bruta</th>
                  <th className="px-6 py-3 text-right">Margen</th>
                  <th className="px-6 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyData.map((row) => (
                  <tr key={row.mes} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{row.mes} {new Date().getFullYear()}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(row.ingresos)}</td>
                    <td className="px-6 py-4 text-right text-red-500">-{formatCurrency(row.egresos)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(row.utilidad)}</td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {row.ingresos > 0 ? ((row.utilidad / row.ingresos) * 100).toFixed(1) : '0.0'}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Cerrado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportesFinancierosPage

