'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Calendar,
  LayoutDashboard,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ExportButton } from '@/components/ui/ExportButton';
import { PremiumBarChart } from '@/components/ui/PremiumCharts';
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal';

interface MetricItem {
  title: string;
  value: number | string;
  subValue?: string;
  isCurrency: boolean;
  change: number;
  icon: React.ReactNode;
  color: string;
}

interface QuickAccessItem {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  badge?: number;
  href: string;
}

interface DashboardData {
  userFullName: string;
  userRole: string;
  mainMetrics: MetricItem[];
  quickAccess: QuickAccessItem[];
  recentLoans: Array<{
    client: string;
    amount: number;
    term: string;
    status: string;
    date: string;
  }>;
  topCollectors: Array<{
    name: string;
    collected: number;
    efficiency: number;
    trend: 'up' | 'down';
  }>;
  chartData: Array<{
    label: string;
    value: number;
    target: number;
  }>;
}

interface DashboardClientProps {
  data: DashboardData;
}

/**
 * CLIENT COMPONENT - Maneja la interactividad del Dashboard
 * Recibe los datos ya procesados desde el Server Component
 */
export function DashboardClient({ data }: DashboardClientProps) {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const [currentDate] = useState(new Date());
  const [showCrearCreditoModal, setShowCrearCreditoModal] = useState(false);

  const handleExportExcel = () => {
    console.log('Exporting Excel...');
  };

  const handleExportPDF = () => {
    console.log('Exporting PDF...');
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-CO', options);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 p-6 lg:p-12 space-y-12">
        {/* Header Standard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-blue-600">Panel</span> <span className="text-orange-500">Principal</span>
              </h1>
            </div>
            <p className="text-slate-500 mt-1 font-medium text-sm flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(currentDate)}
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold border border-slate-200">
                {data.userRole}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
              {['Hoy', 'Sem', 'Mes', 'Trim'].map((item, index) => {
                const values = ['today', 'week', 'month', 'quarter'] as const;
                return (
                  <button
                    key={item}
                    onClick={() => setTimeFilter(values[index])}
                    className={`px-5 py-2 text-sm rounded-lg transition-all font-medium ${
                      timeFilter === values[index] 
                        ? 'bg-primary text-white shadow-md shadow-primary/20' 
                        : 'text-slate-500 hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            
            <ExportButton 
              label="Exportar" 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF} 
            />
          </div>
        </div>
        
        {/* Filtro móvil */}
        <div className="md:hidden flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
          {['Hoy', 'Semana', 'Mes', 'Trimestre'].map((item, index) => {
             const values = ['today', 'week', 'month', 'quarter'] as const;
             return (
               <button
                 key={item}
                 onClick={() => setTimeFilter(values[index])}
                 className={`px-4 py-2 text-sm rounded-full whitespace-nowrap transition-all font-medium ${
                   timeFilter === values[index] 
                     ? 'bg-primary text-white' 
                     : 'bg-white text-slate-600 border border-slate-200'
                 }`}
               >
                 {item}
               </button>
             );
           })}
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.mainMetrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="p-3 rounded-xl transition-all duration-300"
                  style={{ backgroundColor: `${metric.color}10`, color: metric.color }}
                >
                  {metric.icon}
                </div>
                <div className={`flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-full ${
                  metric.change >= 0 
                    ? 'text-emerald-700 bg-emerald-50' 
                    : 'text-rose-700 bg-rose-50'
                }`}>
                  {metric.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{metric.change >= 0 ? '+' : ''}{metric.change}%</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-2xl font-bold text-slate-800 tracking-tight truncate" title={metric.isCurrency ? formatCurrency(Number(metric.value)) : String(metric.value)}>
                  {metric.isCurrency ? formatCurrency(Number(metric.value)) : metric.value}
                </div>
                {metric.subValue && (
                  <div className="text-xs font-medium text-slate-500">{metric.subValue}</div>
                )}
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{metric.title}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Principal (Izquierda) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Gráfico Principal: Tendencia de Cobros */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Tendencia de Cobros</h3>
                  <p className="text-slate-500 text-sm">Últimos 7 días vs Meta Diaria</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    Real
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <div className="w-3 h-3 rounded-full border-2 border-dashed border-amber-500 bg-amber-50"></div>
                    Meta
                  </div>
                </div>
              </div>
              
              <PremiumBarChart 
                showTarget
                data={data.chartData}
              />
            </div>

            {/* Listado: Últimos Préstamos Aprobados */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Últimos Préstamos Aprobados</h3>
                <Link href="/admin/prestamos" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                  Ver todos
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Monto</th>
                      <th className="px-4 py-3 font-medium">Cuotas</th>
                      <th className="px-4 py-3 font-medium text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentLoans.map((loan, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{loan.client}</div>
                          <div className="text-xs text-slate-500">{loan.date}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{formatCurrency(loan.amount)}</td>
                        <td className="px-4 py-3 text-slate-600">{loan.term}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            loan.status === 'APROBADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Columna Lateral (Derecha) */}
          <div className="space-y-8">
            
            {/* Listado: Top 5 Cobradores */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Top 5 Cobradores</h3>
                <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-full">Mes Actual</span>
              </div>
              <div className="space-y-5">
                {data.topCollectors.map((collector, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 text-sm">{collector.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          Eficiencia: 
                          <span className={collector.efficiency >= 95 ? 'text-emerald-600 font-semibold' : 'text-slate-600'}>
                            {collector.efficiency}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800 text-sm">{formatCurrency(collector.collected)}</div>
                      {collector.trend === 'up' ? (
                        <div className="text-[10px] text-emerald-600 flex items-center justify-end gap-0.5">
                          <TrendingUp className="h-3 w-3" />
                          <span>Excelente</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-600 flex items-center justify-end gap-0.5">
                          <TrendingDown className="h-3 w-3" />
                          <span>Regular</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link href="/admin/reportes/operativos" className="block w-full text-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Ver reporte completo
                </Link>
              </div>
            </div>

            {/* Accesos Rápidos (Reducido) */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Accesos Rápidos</h3>
              <div className="grid grid-cols-1 gap-3">
                 {data.quickAccess.slice(0, 3).map((item, index) => {
                   // Si es "Nuevo Crédito", mostrar modal en lugar de navegar
                   const isNewCredit = item.title === 'Nuevo Crédito';
                   
                   if (isNewCredit) {
                     return (
                       <button
                         key={index}
                         onClick={() => setShowCrearCreditoModal(true)}
                         className="w-full flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all group text-left"
                       >
                         <div className="p-2 rounded-lg bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                           {item.icon}
                         </div>
                         <div>
                           <div className="font-medium text-slate-900 text-sm group-hover:text-blue-700">{item.title}</div>
                           <div className="text-xs text-slate-500">{item.subtitle}</div>
                         </div>
                       </button>
                     );
                   }
                   
                   return (
                     <Link
                       key={index}
                       href={item.href}
                       className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all group"
                     >
                       <div className="p-2 rounded-lg bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                         {item.icon}
                       </div>
                       <div>
                         <div className="font-medium text-slate-900 text-sm group-hover:text-blue-700">{item.title}</div>
                         <div className="text-xs text-slate-500">{item.subtitle}</div>
                       </div>
                     </Link>
                   );
                 })}
              </div>
            </div>

          </div>
        </div>

        {/* Footer sutil */}
        <div className="mt-8 text-center pb-6">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">
            CrediSur • Sistema de Gestión v1.0 • Sesión activa
          </p>
        </div>
      </div>

      {/* Modal de Crear Crédito */}
      <CrearCreditoModal
        isOpen={showCrearCreditoModal}
        onClose={() => setShowCrearCreditoModal(false)}
        onConfirm={(data) => {
          console.log('Crédito creado:', data);
          setShowCrearCreditoModal(false);
        }}
      />
    </div>
  );
}
