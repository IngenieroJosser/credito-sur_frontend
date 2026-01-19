import { Metadata } from 'next';
import { ChevronLeft, UserPlus, BarChart3 } from 'lucide-react';
import ClienteDetalleElegante from '@/components/cliente/DetalleCliente';
import Link from 'next/link';

// Datos de ejemplo
const clientesEjemplo = {
  'cliente-001': {
    nombre: 'Carlos',
    apellido: 'Rodríguez',
    rolRecomendado: 'administrador' as const,
    score: 78,
    riesgo: 'medio' as const
  },
  'cliente-002': {
    nombre: 'Ana',
    apellido: 'Gómez',
    rolRecomendado: 'supervisor' as const,
    score: 92,
    riesgo: 'bajo' as const
  },
  'cliente-003': {
    nombre: 'Roberto',
    apellido: 'Sánchez',
    rolRecomendado: 'cobrador' as const,
    score: 65,
    riesgo: 'alto' as const
  },
  'cliente-004': {
    nombre: 'María',
    apellido: 'López',
    rolRecomendado: 'contable' as const,
    score: 85,
    riesgo: 'bajo' as const
  }
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const clienteInfo = id ? clientesEjemplo[id as keyof typeof clientesEjemplo] : undefined;
  
  return {
    title: `${clienteInfo ? `${clienteInfo.nombre} ${clienteInfo.apellido}` : 'Cliente'} • Gestión Crediticia`,
    description: `Panel de gestión y análisis para ${clienteInfo ? `${clienteInfo.nombre} ${clienteInfo.apellido}` : 'cliente'}`
  };
}

async function getClienteData(id: string) {
  // Simulación de API call
  return clientesEjemplo[id as keyof typeof clientesEjemplo] || clientesEjemplo['cliente-001'];
}

export default async function ClienteDetallePage({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const clienteData = await getClienteData(id);
  
  // En producción, esto vendría de la sesión
  const rolUsuario: 'administrador' | 'coordinador' | 'supervisor' | 'cobrador' | 'contable' = 
    clienteData?.rolRecomendado || 'administrador';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-25 to-gray-50">
      {/* Header sofisticado */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/clientes" 
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                  <BarChart3 className="w-5 h-5 text-[#08557f]" />
                </div>
                <div>
                  <h1 className="text-lg font-light text-gray-900">Gestión Crediticia</h1>
                  <p className="text-sm text-gray-500">Panel de análisis de clientes</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-700">{rolUsuario}</span>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-[#08557f] to-[#0a6a9e] text-white rounded-lg hover:opacity-90 transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm">
                <UserPlus className="w-4 h-4" />
                Nuevo Cliente
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="px-4 lg:px-8 py-6">
        {/* Breadcrumb elegante */}
        <div className="mb-6">
          <nav className="flex items-center text-sm text-gray-500">
            <Link href="/admin" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <ChevronLeft className="w-4 h-4 mx-2" />
            <Link href="/admin/clientes" className="hover:text-primary transition-colors">
              Clientes
            </Link>
            <ChevronLeft className="w-4 h-4 mx-2" />
            <span className="text-primary font-medium">
              {clienteData?.nombre} {clienteData?.apellido}
            </span>
          </nav>
          
          <div className="mt-2 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-light text-gray-900">
                {clienteData?.nombre} {clienteData?.apellido}
              </h2>
              <p className="text-gray-500 mt-1">Análisis detallado del perfil crediticio</p>
            </div>
            
            <div className="hidden lg:flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-500">Score Crediticio</div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                      style={{ width: `${clienteData?.score || 78}%` }}
                    />
                  </div>
                  <span className="font-medium text-gray-900">{clienteData?.score || 78}/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Componente de detalle */}
        <ClienteDetalleElegante 
          clienteId={id}
          rolUsuario={rolUsuario}
        />

        {/* Footer sofisticado */}
        <footer className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>Sistema de Gestión Crediticia v2.0</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Datos actualizados al {new Date().toLocaleDateString()}</span>
            </div>
            <div className="mt-4 md:mt-0">
              <span className="text-gray-400">© 2024 Créditos Plus</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}