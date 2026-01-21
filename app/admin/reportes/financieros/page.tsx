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
import { formatCurrency } from '@/lib/utils'

// Interfaces
interface FinancialSummary {
  ingresos: number;
  egresos: number;
  utilidad: number;
  margen: number;
}

interface MonthlyEvolution {
  mes: string;
  ingresos: number;
  egresos: number;
  utilidad: number;
}

interface ExpenseDistribution {
  categoria: string;
  monto: number;
}

type ExpenseWithPercentage = ExpenseDistribution & {
  porcentaje: number
}

const ReportesFinancierosPage = () => {
  const [periodo, setPeriodo] = useState('ANUAL')
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  
  const [summary, setSummary] = useState<FinancialSummary>({
    ingresos: 0,
    egresos: 0,
    utilidad: 0,
    margen: 0
  })
  
  const [monthlyData, setMonthlyData] = useState<MonthlyEvolution[]>([])
  const [expenseData, setExpenseData] = useState<ExpenseWithPercentage[]>([])

  useEffect(() => {
    setMounted(true)
    const fetchData = async () => {
      setLoading(true)
      try {
        // Simulación de datos para demostración (Valores en COP)
        await new Promise(resolve => setTimeout(resolve, 800)); // Simular latencia

        const mockSummary: FinancialSummary = {
          ingresos: 285000000,
          egresos: 132500000,
          utilidad: 152500000,
          margen: 53.5
        };

        const mockMonthly: MonthlyEvolution[] = [
          { mes: 'Ene', ingresos: 42000000, egresos: 18000000, utilidad: 24000000 },
          { mes: 'Feb', ingresos: 45000000, egresos: 20000000, utilidad: 25000000 },
          { mes: 'Mar', ingresos: 38000000, egresos: 19000000, utilidad: 19000000 },
          { mes: 'Abr', ingresos: 48000000, egresos: 22000000, utilidad: 26000000 },
          { mes: 'May', ingresos: 52000000, egresos: 24000000, utilidad: 28000000 },
          { mes: 'Jun', ingresos: 60000000, egresos: 29500000, utilidad: 30500000 }
        ];

        const mockExpenses: ExpenseDistribution[] = [
          { categoria: 'Nómina', monto: 65000000 },
          { categoria: 'Servicios', monto: 12000000 },
          { categoria: 'Marketing', monto: 15000000 },
          { categoria: 'Transporte', monto: 25000000 },
          { categoria: 'Otros', monto: 15500000 }
        ];

        setSummary(mockSummary);
        setMonthlyData(mockMonthly);

        // Calcular porcentajes para gastos
        const totalGastos = mockExpenses.reduce((acc, curr) => acc + curr.monto, 0);
        const expensesWithPercentage = mockExpenses.map(item => ({
          categoria: item.categoria,
          monto: item.monto,
          porcentaje: totalGastos > 0 ? Math.round((item.monto / totalGastos) * 100) : 0
        })).sort((a, b) => b.monto - a.monto);

        setExpenseData(expensesWithPercentage);

      } catch (error) {
        console.error('Error fetching financial reports:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [periodo])

  if (!mounted) {
    return null;
  }

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
    <div className="min-h-screen bg-white relative px-4 py-8">
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

      <div className="mx-auto max-w-7xl space-y-8 relative z-10">
        {/* Header Minimalista */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#08557f]/5 px-3 py-1 text-xs text-[#08557f] tracking-wide font-medium border border-[#08557f]/10">
              <LineChart className="h-3.5 w-3.5" />
              <span>Reportes financieros</span>
            </div>
            <h1 className="text-3xl font-light text-gray-900 tracking-tight">
              Ingresos y <span className="font-semibold text-[#08557f]">Rentabilidad</span>
            </h1>
            <p className="text-sm text-gray-500 max-w-xl leading-relaxed">
              Análisis detallado del desempeño financiero. Visualice tendencias, controle gastos y monitoree la rentabilidad del negocio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              {['MENSUAL', 'TRIMESTRAL', 'ANUAL'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    periodo === p 
                      ? 'bg-gray-900 text-white shadow-md' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#08557f] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#064364] transition-all shadow-md hover:shadow-lg">
              <Download className="h-4 w-4" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </header>

        {/* KPI Cards - Estilo Ultra Clean */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ingresos Totales</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-2">{formatCurrency(summary.ingresos)}</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-emerald-600 font-bold bg-emerald-50 w-fit px-2 py-1 rounded-full">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>+12.5% vs mes anterior</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Egresos Totales</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-2">{formatCurrency(summary.egresos)}</h3>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-red-600 font-bold bg-red-50 w-fit px-2 py-1 rounded-full">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>+5.2% vs mes anterior</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Utilidad Neta</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-2">{formatCurrency(summary.utilidad)}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-blue-600 font-bold bg-blue-50 w-fit px-2 py-1 rounded-full">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>Rentable</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Margen Promedio</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-2">{summary.margen.toFixed(1)}%</h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <PieChart className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-gray-500 font-medium bg-gray-50 w-fit px-2 py-1 rounded-full">
              <Target className="h-3 w-3 mr-1" />
              <span>Meta: 45%</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart: Monthly Trends */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Evolución Financiera</h3>
                <p className="text-sm text-gray-400 font-medium">Comportamiento mensual de ingresos y egresos</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#08557f]"></div>
                  <span className="text-gray-600">Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <span className="text-gray-600">Egresos</span>
                </div>
              </div>
            </div>
            
            {/* Custom Bar Chart Visualization */}
            <div className="h-72 flex items-end justify-between gap-4">
              {monthlyData.map((item) => {
                const maxVal = Math.max(...monthlyData.map(d => d.ingresos), 1) // Avoid division by zero
                const heightIngreso = (item.ingresos / maxVal) * 100
                const heightEgreso = (item.egresos / maxVal) * 100
                
                return (
                  <div key={item.mes} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                    <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-bold rounded-lg py-2 px-3 whitespace-nowrap z-10 pointer-events-none shadow-xl">
                      <div className="mb-1">Ing: {formatCurrency(item.ingresos)}</div>
                      <div className="text-red-300">Egr: {formatCurrency(item.egresos)}</div>
                    </div>
                    <div className="w-full flex gap-1.5 items-end justify-center h-full">
                      <div 
                        className="w-full bg-[#08557f] rounded-t-lg transition-all duration-500 hover:bg-[#064364] relative group-hover:shadow-lg"
                        style={{ height: `${heightIngreso}%` }}
                      ></div>
                      <div 
                        className="w-full bg-red-400 rounded-t-lg transition-all duration-500 hover:bg-red-500 relative group-hover:shadow-lg"
                        style={{ height: `${heightEgreso}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400 mt-4 font-bold uppercase tracking-wide">{item.mes}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Side Chart: Expense Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Distribución de Gastos</h3>
            <div className="space-y-6">
              {expenseData.length > 0 ? (
                expenseData.map((cat) => (
                  <div key={cat.categoria} className="group">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-700 font-bold group-hover:text-[#08557f] transition-colors">{cat.categoria}</span>
                      <span className="text-gray-500 font-medium">{cat.porcentaje}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gray-800 h-2.5 rounded-full transition-all duration-1000 group-hover:bg-[#08557f]" 
                        style={{ width: `${cat.porcentaje}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 text-right font-medium">{formatCurrency(cat.monto)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No hay gastos registrados en este periodo.</p>
              )}
            </div>
            
            <div className="mt-8 p-5 bg-blue-50/50 rounded-xl border border-blue-100">
              <h4 className="text-sm font-bold text-[#08557f] mb-2">Observación del Contador</h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Los gastos operativos se han mantenido estables. Se recomienda revisar el presupuesto de marketing para el próximo trimestre para optimizar el retorno de inversión.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Detalle Financiero</h3>
              <p className="text-sm text-gray-400 font-medium">Desglose por periodo contable</p>
            </div>
            <button className="text-sm text-[#08557f] font-bold hover:text-[#063a58] bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all">
              Ver reporte completo
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-8 py-4">Periodo</th>
                  <th className="px-8 py-4 text-right">Ingresos Operativos</th>
                  <th className="px-8 py-4 text-right">Gastos & Costos</th>
                  <th className="px-8 py-4 text-right">Utilidad Bruta</th>
                  <th className="px-8 py-4 text-right">Margen</th>
                  <th className="px-8 py-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyData.map((row) => (
                  <tr key={row.mes} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-8 py-5 font-bold text-gray-800 group-hover:text-[#08557f]">{row.mes} {new Date().getFullYear()}</td>
                    <td className="px-8 py-5 text-right text-gray-600 font-medium">{formatCurrency(row.ingresos)}</td>
                    <td className="px-8 py-5 text-right text-red-500 font-medium">-{formatCurrency(row.egresos)}</td>
                    <td className="px-8 py-5 text-right font-bold text-gray-900 bg-gray-50/30">{formatCurrency(row.utilidad)}</td>
                    <td className="px-8 py-5 text-right text-gray-600 font-medium">
                      {row.ingresos > 0 ? ((row.utilidad / row.ingresos) * 100).toFixed(1) : '0.0'}%
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
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
