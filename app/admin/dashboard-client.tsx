'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Calendar,
  LayoutDashboard,
} from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TimeFilter, TimeFilterPeriod } from '@/components/ui/TimeFilter';
import { formatCurrency } from '@/lib/utils';
import { ExportButton } from '@/components/ui/ExportButton';
import { TransactionalHighDetailChart } from '@/components/ui/TransactionalHighDetailChart';
import CrearCreditoModal from '@/components/dashboards/shared/CrearCreditoModal';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';

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
    target?: number;
    date?: string;
    time?: string;
  }>;
}

interface DashboardClientProps {
  data: DashboardData;
}

/**
 * Componente Cliente del Dashboard.
 * Este archivo se encarga de toda la magia visual y la interacción (modales, filtros, exportación).
 * Recibe los datos "limpios" desde el componente servidor para mantener el cliente ligero.
 */
export function DashboardClient({ data }: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Detectamos qué filtro de tiempo está activo desde la URL (ej: ?period=week)
  const activePeriod = (searchParams.get('period') as TimeFilterPeriod) || 'today';

  // Cambiamos la URL sin recargar toda la página cuando el usuario elige otro periodo
  const handlePeriodChange = (period: TimeFilterPeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [currentDate] = useState(new Date());
  
  // Controlamos la visibilidad de los modales de creación
  const [showCrearCreditoModal, setShowCrearCreditoModal] = useState(false);
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);

  // TODO: Exportar resumen del dashboard administrativo
  // Qué exportar: Estadísticas generales, Cartera activa, Recaudo del día, Alertas
  // Backend: Crear GET /dashboard/export?format=excel|pdf en dashboard.controller.ts
  // Backend: Método exportDashboardSummary() en dashboard.service.ts usando ExcelJS + PDFKit
  // Frontend: Usar exportService.downloadFile('dashboard/export', params, 'resumen-dashboard.xlsm')
  const handleExportExcel = () => {
    console.log('TODO: Exportar resumen dashboard en Excel');
  };

  const handleExportPDF = () => {
    console.log('TODO: Exportar resumen dashboard en PDF');
  };

  // Formato de fecha amigable para el encabezado (ej: Vie, 6 Feb 2026)
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
      {/* Fondo técnico/arquitectónico sutil para darle profundidad */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 p-6 lg:p-16 space-y-20 max-w-[1600px] mx-auto">
        {/* Encabezado Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                <span className="text-blue-600">Panel</span> <span className="text-orange-500">Principal</span>
              </h1>
            </div>
            <p className="text-slate-500 mt-1 font-medium text-xs sm:text-sm flex items-center gap-2 flex-wrap">
              <Calendar className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">{formatDate(currentDate)}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:inline"></span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold border border-slate-200">
                {data.userRole}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
            {/* Selector de periodo (Mes, Semana, Día) */}
            <TimeFilter 
              activePeriod={activePeriod} 
              onPeriodChange={handlePeriodChange} 
            />
            
            {/* Botones de acción rápida */}
            <ExportButton 
              label="Exportar" 
              onExportExcel={handleExportExcel} 
              onExportPDF={handleExportPDF} 
            />
          </div>
        </div>

        {/* Métricas principales - Optimizadas para evitar saturación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {data.mainMetrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-[0_10px_40px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_20px_50px_rgb(0,0,0,0.1)] transition-all duration-500 group hover:-translate-y-2 relative overflow-hidden"
            >
              {/* Decoración sutil de fondo para la métrica */}
              <div 
                className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] transition-transform duration-700 group-hover:scale-150"
                style={{ backgroundColor: metric.color }}
              ></div>

              <div className="flex items-start justify-between mb-6 relative z-10">
                <div 
                  className="p-4 rounded-2xl transition-all duration-500 shadow-sm group-hover:shadow-md group-hover:scale-110"
                  style={{ backgroundColor: `${metric.color}15`, color: metric.color }}
                >
                  {React.cloneElement(metric.icon as React.ReactElement<any>, { size: 24 })}
                </div>
                <div className={`flex items-center space-x-1.5 text-[11px] font-black px-3 py-1 rounded-full shadow-sm ${
                  metric.change >= 0 
                    ? 'text-emerald-700 bg-emerald-100/50' 
                    : 'text-rose-700 bg-rose-100/50'
                }`}>
                  {metric.change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  <span>{metric.change >= 0 ? '+' : ''}{metric.change}%</span>
                </div>
              </div>
              
              <div className="space-y-2 relative z-10">
                <div className="text-3xl font-black text-slate-900 tracking-tight truncate leading-tight" title={metric.isCurrency ? formatCurrency(Number(metric.value)) : String(metric.value)}>
                  {metric.isCurrency ? formatCurrency(Number(metric.value)) : metric.value}
                </div>
                {metric.subValue && (
                  <div className="text-[11px] font-bold text-slate-500/80 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    {metric.subValue}
                  </div>
                )}
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1">{metric.title}</div>
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
                  <p className="text-slate-500 text-sm">Período seleccionado vs Objetivo</p>
                </div>
              </div>
              
              <TransactionalHighDetailChart 
                data={data.chartData}
              />
            </div>

            {/* Listado: Últimos Creditos Aprobados */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Últimos Creditos Aprobados</h3>
                <Link href="/prestamos" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
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
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              loan.status === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' :
                              loan.status === 'PENDIENTE_APROBACION' ? 'bg-amber-100 text-amber-800' :
                              loan.status === 'EN_MORA' ? 'bg-rose-100 text-rose-800' :
                              loan.status === 'PAGADO' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {loan.status === 'PENDIENTE_APROBACION'
                              ? 'PENDIENTE DE APROBACIÓN'
                              : String(loan.status || '').replace(/_/g, ' ')}
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
                <Link href="/reportes/operativos" className="block w-full text-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Ver reporte completo
                </Link>
              </div>
            </div>

            {/* Accesos Rápidos (Reducido) */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Accesos Rápidos</h3>
              <div className="grid grid-cols-1 gap-3">
                 {data.quickAccess.slice(0, 3).map((item, index) => {
                   // Acciones que abren modal en lugar de navegar
                   const modalAction = 
                     item.title === 'Nuevo Crédito' ? () => setShowCrearCreditoModal(true) :
                     item.title === 'Nuevo Cliente' ? () => setShowNuevoClienteModal(true) :
                     null;
                   
                   if (modalAction) {
                     return (
                       <button
                         key={index}
                         onClick={modalAction}
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

      {/* Modal de Nuevo Cliente */}
      {showNuevoClienteModal && (
        <NuevoClienteModal
          onClose={() => setShowNuevoClienteModal(false)}
          onClienteCreado={(nuevo) => {
            console.log('Cliente creado:', nuevo);
            setShowNuevoClienteModal(false);
          }}
        />
      )}
    </div>
  );
}
