'use client'

import Link from 'next/link';
import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Users,
  User,
  CreditCard,
  Banknote,
  PieChart,
  Target,
  Bell,
  Search,
  Filter,
  Download,
  ChevronRight,
  Calendar,
  ArrowUpRight,
  Activity,
  Wallet,
  Shield,
  Settings,
  Menu,
  X,
  Package,
  Route
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
  const [userRole] = useState<'admin' | 'coordinator' | 'supervisor' | 'collector' | 'accountant'>('admin');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      color: '#08557f',
      trendData: [65, 70, 75, 78, 82, 85, 88, 90, 92, 95, 96, 98]
    },
    {
      title: 'Recuperación',
      value: '94.2%',
      change: 2.1,
      icon: <Target className="h-4 w-4" />,
      color: '#10b981',
      trendData: [85, 87, 88, 89, 90, 91, 92, 93, 93.5, 94, 94.2, 94.2]
    },
    {
      title: 'Cartera Vencida',
      value: '$45K',
      change: -3.4,
      icon: <AlertCircle className="h-4 w-4" />,
      color: '#ef4444',
      trendData: [12, 11, 10, 9, 8, 7, 6, 5.5, 5, 4.8, 4.5, 4.5]
    },
    {
      title: 'Eficiencia',
      value: '87.3%',
      change: 1.8,
      icon: <Activity className="h-4 w-4" />,
      color: '#fb851b',
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

  // Configuración del rol actual
  const roleConfig = {
    admin: { name: 'Administrador', initials: 'AD' },
    coordinator: { name: 'Coordinador', initials: 'CO' },
    supervisor: { name: 'Supervisor', initials: 'SU' },
    collector: { name: 'Cobrador', initials: 'CB' },
    accountant: { name: 'Contable', initials: 'CT' }
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: <Activity className="h-4 w-4" /> },
    { name: 'Créditos', href: '/admin/prestamos', icon: <CreditCard className="h-4 w-4" /> },
    { name: 'Cobranza', href: '/admin/pagos/registro', icon: <Banknote className="h-4 w-4" /> },
    { name: 'Clientes', href: '/admin/clientes', icon: <Users className="h-4 w-4" /> },
    { name: 'Cuentas en mora', href: '/admin/cuentas-mora', icon: <AlertCircle className="h-4 w-4" /> },
    { name: 'Rutas', href: '/admin/rutas', icon: <Route className="h-4 w-4" /> },
    { name: 'Artículos', href: '/admin/articulos', icon: <Package className="h-4 w-4" /> },
    { name: 'Módulo contable', href: '/admin/contable', icon: <PieChart className="h-4 w-4" /> },
    { name: 'Usuarios', href: '/admin/users', icon: <User className="h-4 w-4" /> },
    { name: 'Roles y permisos', href: '/admin/roles-permisos', icon: <Shield className="h-4 w-4" /> },
    { name: 'Reportes operativos', href: '/admin/reportes/operativos', icon: <PieChart className="h-4 w-4" /> },
    { name: 'Reportes financieros', href: '/admin/reportes/financieros', icon: <PieChart className="h-4 w-4" /> },
    { name: 'Perfil', href: '/admin/perfil', icon: <User className="h-4 w-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header ultra minimalista */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo y título */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-[#08557f] to-[#063a58] rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <h1 className="ml-3 text-lg font-light text-gray-800">
                  <span className="font-normal text-[#08557f]">Credi</span>Finanzas
                </h1>
              </div>

              {/* Indicador de rol sutil */}
              <div className="hidden md:block">
                <div className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                  {roleConfig[userRole].name}
                </div>
              </div>
            </div>

            {/* Controles de la derecha */}
            <div className="flex items-center space-x-2">
              {/* Filtro de tiempo */}
              <div className="hidden md:flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
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

              {/* Barra de búsqueda sútil */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 w-40 md:w-56 bg-transparent border-0 border-b border-gray-200 focus:border-[#08557f] focus:outline-none text-sm placeholder-gray-400"
                />
              </div>

              {/* Notificaciones */}
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="h-5 w-5 text-gray-500" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#fb851b] rounded-full"></span>
              </button>

              {/* Avatar de usuario */}
              <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {roleConfig[userRole].initials}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar elegante para desktop */}
      <aside className={`fixed left-0 top-16 bottom-0 w-64 bg-white/80 backdrop-blur-sm border-r border-gray-100 transition-all duration-300 z-40 ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:block`}>
        <nav className="p-6">
          <div className="space-y-6">
            {/* Navegación principal */}
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Principal</div>
              <div className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-[#08557f] hover:bg-gray-50 rounded-lg transition-all duration-200"
                  >
                    {item.icon}
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Sección de sistema */}
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Sistema</div>
              <div className="space-y-1">
                <Link
                  href="/admin/sistema/configuracion"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm font-medium">Configuración</span>
                </Link>
                <Link
                  href="/admin/sistema/sincronizacion"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
                >
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">Sincronización</span>
                </Link>
                <Link
                  href="/admin/sistema/backups"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm font-medium">Backups</span>
                </Link>
                <Link
                  href="/admin/auditoria"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
                >
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">Auditoría</span>
                </Link>
              </div>
            </div>

            {/* Resumen del mes elegante */}
            <div className="pt-8 border-t border-gray-100">
              <div className="p-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl text-white">
                <div className="text-xs text-gray-300 mb-2">Rendimiento del mes</div>
                <div className="text-2xl font-light mb-3">94.2%</div>
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#08557f] to-[#10b981]"
                    style={{ width: '94.2%' }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>Meta: 95%</span>
                  <span>+2.1%</span>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className={`pt-16 lg:pl-64 transition-all duration-300 ${isMenuOpen ? 'lg:pl-64' : ''}`}>
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
        </div>
      </main>

      {/* Sidebar móvil */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around py-3">
          {['Dashboard', 'Créditos', 'Cobranza', 'Más'].map((item) => (
            <button
              key={item}
              className="flex flex-col items-center space-y-1 px-4 py-2"
            >
              <div className={`p-2 rounded-lg ${
                item === 'Dashboard' ? 'bg-gray-100' : ''
              }`}>
                <Activity className="h-5 w-5 text-gray-500" />
              </div>
              <span className="text-xs text-gray-600">{item}</span>
            </button>
          ))}
        </div>
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
