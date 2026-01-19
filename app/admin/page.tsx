'use client'

import Link from 'next/link';
import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Users,
  CreditCard,
  Banknote,
  PieChart,
  Target,
  Search,
  Filter,
  Download,
  ChevronRight,
  Calendar,
  ArrowUpRight,
  Activity,
  Wallet
} from 'lucide-react';

interface MetricCard {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  trendData: number[];
}

interface QuickAccessItem {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  badge?: number;
  href: string;
}

const DashboardPage = () => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const currentDate = new Date();
  
  // Formatear fecha elegante
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-ES', options);
  };

  // Métricas principales ultra minimalistas
  const mainMetrics: MetricCard[] = [
    {
      title: 'Capital Activo',
      value: '$2.8M',
      change: 8.2,
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'var(--primary)',
      trendData: [65, 70, 75, 78, 82, 85, 88, 90, 92, 95, 96, 98]
    },
    {
      title: 'Recuperación',
      value: '94.2%',
      change: 2.1,
      icon: <Target className="h-4 w-4" />,
      color: 'var(--success)',
      trendData: [85, 87, 88, 89, 90, 91, 92, 93, 93.5, 94, 94.2, 94.2]
    },
    {
      title: 'Cartera Vencida',
      value: '$45K',
      change: -3.4,
      icon: <AlertCircle className="h-4 w-4" />,
      color: 'var(--danger)',
      trendData: [12, 11, 10, 9, 8, 7, 6, 5.5, 5, 4.8, 4.5, 4.5]
    },
    {
      title: 'Eficiencia',
      value: '87.3%',
      change: 1.8,
      icon: <Activity className="h-4 w-4" />,
      color: 'var(--secondary)',
      trendData: [80, 81, 82, 83, 84, 85, 86, 86.5, 87, 87.2, 87.3, 87.3]
    }
  ];

  // Accesos rápidos elegantes
  const quickAccess: QuickAccessItem[] = [
    {
      title: 'Nuevo Crédito',
      subtitle: 'Registro rápido',
      icon: <CreditCard className="h-5 w-5" />,
      color: '#08557f',
      badge: 3,
      href: '/admin/prestamos/nuevo'
    },
    {
      title: 'Cobranza',
      subtitle: 'Gestionar pagos',
      icon: <Wallet className="h-5 w-5" />,
      color: '#10b981',
      badge: 12,
      href: '/admin/pagos/registro'
    },
    {
      title: 'Clientes',
      subtitle: 'Base de datos',
      icon: <Users className="h-5 w-5" />,
      color: '#8b5cf6',
      href: '/admin/clientes'
    },
    {
      title: 'Análisis',
      subtitle: 'Reportes avanzados',
      icon: <PieChart className="h-5 w-5" />,
      color: '#fb851b',
      href: '/admin/reportes/operativos'
    }
  ];

  // Actividad reciente
  const recentActivity = [
    { id: 1, client: 'González M.', action: 'Pago completado', amount: '$1,250', time: '09:42', status: 'success' },
    { id: 2, client: 'López C.', action: 'Renegociación', amount: '$3,500', time: '10:15', status: 'pending' },
    { id: 3, client: 'Martínez A.', action: 'Mora detectada', amount: '$750', time: '11:30', status: 'alert' },
    { id: 4, client: 'Ramírez P.', action: 'Pago anticipado', amount: '$2,100', time: '13:20', status: 'success' },
    { id: 5, client: 'Sánchez L.', action: 'Consulta saldo', amount: '-', time: '14:45', status: 'info' }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Encabezado del dashboard */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-light text-gray-800 mb-2">Panel de Control</h1>
            <p className="text-sm text-gray-500">{formatDate(currentDate)}</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
            <Download className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Exportar</span>
          </button>
        </div>
        
        {/* Filtro de tiempo móvil (solo visible en móvil ya que el desktop estaba en el header) */}
        <div className="md:hidden mt-4 flex items-center space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
          {['Hoy', 'Sem', 'Mes', 'Trim'].map((item, index) => {
            const values = ['today', 'week', 'month', 'quarter'] as const;
            return (
              <button
                key={item}
                onClick={() => setTimeFilter(values[index])}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  timeFilter === values[index] 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {mainMetrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-lg transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${metric.color === '#08557f' ? 'from-[#08557f]/10 to-[#08557f]/5' : metric.color === '#10b981' ? 'from-[#10b981]/10 to-[#10b981]/5' : metric.color === '#ef4444' ? 'from-[#ef4444]/10 to-[#ef4444]/5' : 'from-[#fb851b]/10 to-[#fb851b]/5'}`}>
                <div style={{ color: metric.color }}>
                  {metric.icon}
                </div>
              </div>
              <div className={`flex items-center space-x-1 text-sm ${
                metric.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{metric.change >= 0 ? '+' : ''}{metric.change}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-light text-gray-800">{metric.value}</div>
              <div className="text-sm text-gray-500">{metric.title}</div>
            </div>
            
            {/* Mini gráfico elegante */}
            <div className="mt-4 h-1 flex items-end space-x-px">
              {metric.trendData.map((value, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-full"
                  style={{
                    height: `${value * 0.6}%`,
                    backgroundColor: metric.color,
                    opacity: 0.3 + (i / metric.trendData.length) * 0.7
                  }}
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Accesos rápidos y actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Accesos rápidos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Accesos rápidos */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light text-gray-800">Acciones Rápidas</h2>
              <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Ver todos <ChevronRight className="inline h-4 w-4 ml-1" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickAccess.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="group p-4 border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all duration-300 text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${item.color}10` }}>
                      <div style={{ color: item.color }}>
                        {item.icon}
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.subtitle}</p>
                  <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          {/* Resumen de rendimiento */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-light">Rendimiento del Mes</h2>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {[
                { label: 'Tasa de Recuperación', value: 94, color: '#10b981' },
                { label: 'Eficiencia Operativa', value: 87, color: '#fb851b' },
                { label: 'Satisfacción Cliente', value: 92, color: '#8b5cf6' },
                { label: 'Cumplimiento Metas', value: 96, color: '#08557f' }
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{item.label}</span>
                    <span className="font-medium" style={{ color: item.color }}>{item.value}%</span>
                  </div>
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${item.value}%`,
                        backgroundColor: item.color,
                        animation: `slideIn 1s ease-out ${index * 0.2}s forwards`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-light text-gray-800">Actividad Reciente</h2>
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="group p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-800">{item.client}</div>
                    <div className="text-sm text-gray-500">{item.action}</div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    item.status === 'success' ? 'bg-green-100 text-green-800' :
                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    item.status === 'alert' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {item.amount}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{item.time}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats adicionales */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Clientes Activos', value: '1,247', icon: <Users className="h-5 w-5" />, color: '#08557f' },
            { label: 'Préstamos Activos', value: '856', icon: <CreditCard className="h-5 w-5" />, color: '#10b981' },
            { label: 'Cobros Hoy', value: '$45,820', icon: <Banknote className="h-5 w-5" />, color: '#fb851b' },
            { label: 'En Morosidad', value: '3.6%', icon: <AlertCircle className="h-5 w-5" />, color: '#ef4444' }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`inline-flex p-3 rounded-xl mb-3`} style={{ backgroundColor: `${stat.color}10` }}>
                <div style={{ color: stat.color }}>
                  {stat.icon}
                </div>
              </div>
              <div className="text-2xl font-light text-gray-800 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer sutil */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Actualizado en tiempo real • Última sincronización: {new Date().toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { width: 0%; }
          to { width: var(--target-width); }
        }
        
        .hover\:shadow-lg {
          transition: all 0.3s ease;
        }
        
        .hover\:shadow-lg:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
