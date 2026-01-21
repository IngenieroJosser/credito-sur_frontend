import { Metadata } from 'next';
import { ChevronLeft, BarChart3, Smartphone, Zap, CreditCard as CreditCardIcon, DollarSign } from 'lucide-react';
import ClienteDetalleElegante, { Cliente, Prestamo, Pago, Comentario } from '@/components/cliente/DetalleCliente';
import Link from 'next/link';

// Datos de ejemplo adaptados a las nuevas interfaces
const clienteEjemplo: Cliente = {
  id: 'CLI-001',
  codigo: 'C001',
  dni: '0912345678',
  nombres: 'Carlos Andrés',
  apellidos: 'Rodríguez Pérez',
  correo: 'carlos.rodriguez@email.com',
  telefono: '0991234567',
  direccion: 'Av. 9 de Octubre y Boyacá',
  referencia: 'Frente al parque central',
  nivelRiesgo: 'AMARILLO',
  puntaje: 78,
  enListaNegra: false,
  estadoAprobacion: 'APROBADO',
  fechaRegistro: '15 Mar 2023',
  ocupacion: 'Comerciante',
  avatarColor: 'bg-blue-600'
};

const prestamosEjemplo: Prestamo[] = [
  {
    id: 'PR-2023-001',
    producto: 'Refrigeradora Samsung',
    montoTotal: 1200,
    montoPagado: 720,
    montoPendiente: 480,
    cuotasTotales: 12,
    cuotasPagadas: 7,
    cuotasPendientes: 5,
    fechaInicio: '15/01/2023',
    fechaVencimiento: '15/12/2023',
    proximoPago: '15/08/2023',
    estado: 'ACTIVO',
    tasaInteres: 15,
    diasMora: 0,
    icono: <Smartphone className="w-5 h-5" />,
    categoria: 'Electrodomésticos'
  },
  {
    id: 'PR-2023-012',
    producto: 'Cocina a Gas',
    montoTotal: 650,
    montoPagado: 325,
    montoPendiente: 325,
    cuotasTotales: 8,
    cuotasPagadas: 4,
    cuotasPendientes: 4,
    fechaInicio: '05/03/2023',
    fechaVencimiento: '05/10/2023',
    proximoPago: '05/08/2023',
    estado: 'EN_MORA',
    tasaInteres: 12,
    diasMora: 7,
    moraAcumulada: 12.50,
    icono: <Zap className="w-5 h-5" />,
    categoria: 'Electrodomésticos'
  }
];

const pagosEjemplo: Pago[] = [
  {
    id: 'PA-00123',
    fecha: '15 Jul 2023',
    monto: 100,
    cuota: 7,
    metodo: 'Transferencia',
    estado: 'confirmado',
    referencia: 'TRX-789456',
    icono: <CreditCardIcon className="w-5 h-5" />
  },
  {
    id: 'PA-00122',
    fecha: '15 Jun 2023',
    monto: 100,
    cuota: 6,
    metodo: 'Efectivo',
    estado: 'confirmado',
    icono: <DollarSign className="w-5 h-5" />
  }
];

const comentariosEjemplo: Comentario[] = [
  {
    id: 'COM-001',
    fecha: '10 Ago 2023',
    autor: 'Ana Martínez',
    rolAutor: 'Supervisor',
    contenido: 'Cliente cumplió acuerdo de pago. Se comprometió a ponerse al día antes del 20/08.',
    tipo: 'llamada',
    avatarColor: 'bg-purple-600'
  },
  {
    id: 'COM-002',
    fecha: '05 Ago 2023',
    autor: 'Roberto Sánchez',
    rolAutor: 'Cobrador',
    contenido: 'Visita domiciliaria realizada. Cliente presentó justificativo médico por retraso.',
    tipo: 'visita',
    avatarColor: 'bg-blue-600'
  }
];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Detalle de Cliente • CrediSur`,
    description: `Panel de gestión y análisis para el cliente ${id}`
  };
}

export default async function ClienteDetallePage({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  
  // Simulamos datos específicos si el ID cambia, o usamos el default
  const cliente = { ...clienteEjemplo, id };

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
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

      {/* Header General de la Página */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/clientes" 
                className="p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-[#08557f]"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#08557f]/10 text-[#08557f]">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-light text-gray-900 tracking-tight">Gestión de Clientes</h1>
                  <p className="text-sm text-gray-500 font-light">Detalle y análisis de cartera</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <ClienteDetalleElegante 
          cliente={cliente}
          prestamos={prestamosEjemplo}
          pagos={pagosEjemplo}
          comentarios={comentariosEjemplo}
          rolUsuario="administrador"
        />
      </main>
    </div>
  );
}
