'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Shield,
  Search,
  Bell,
  Activity,
  CreditCard,
  Banknote,
  Users,
  AlertCircle,
  Route,
  Package,
  PieChart,
  User,
  Settings,
  Wallet,
  Menu,
  X
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userRole] = useState<'admin' | 'coordinator' | 'supervisor' | 'collector' | 'accountant'>('admin');
  const pathname = usePathname();

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
                  <span className="font-normal text-[#08557f]">Credi</span>Sur
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
              {/* Barra de búsqueda sútil */}
              <div className="relative hidden md:block">
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
        <nav className="p-6 h-full overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            {/* Navegación principal */}
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Principal</div>
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'text-[#08557f] bg-gray-50 font-medium' 
                          : 'text-gray-600 hover:text-[#08557f] hover:bg-gray-50'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.icon}
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sección de sistema */}
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Sistema</div>
              <div className="space-y-1">
                <Link
                  href="/admin/sistema/configuracion"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm font-medium">Configuración</span>
                </Link>
                <Link
                  href="/admin/sistema/sincronizacion"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">Sincronización</span>
                </Link>
                <Link
                  href="/admin/sistema/backups"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm font-medium">Backups</span>
                </Link>
                <Link
                  href="/admin/auditoria"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
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
        {children}
      </main>

      {/* Sidebar móvil */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around py-3">
          {[
             { name: 'Dashboard', href: '/admin', icon: <Activity className="h-5 w-5" /> },
             { name: 'Créditos', href: '/admin/prestamos', icon: <CreditCard className="h-5 w-5" /> },
             { name: 'Cobranza', href: '/admin/pagos/registro', icon: <Banknote className="h-5 w-5" /> },
             { name: 'Más', href: '#', icon: <Menu className="h-5 w-5" />, action: () => setIsMenuOpen(true) }
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={item.action}
              className="flex flex-col items-center space-y-1 px-4 py-2"
            >
              <div className={`p-2 rounded-lg ${
                pathname === item.href ? 'bg-gray-100 text-[#08557f]' : 'text-gray-500'
              }`}>
                {item.icon}
              </div>
              <span className="text-xs text-gray-600">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
