import { Metadata } from 'next';
import { ChevronLeft, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import DetallePrestamo, { PrestamoDetalle } from '@/components/prestamos/DetallePrestamo';

// Datos MOCK para demostración
const prestamoMock: PrestamoDetalle = {
  id: 'PR-2024-001',
  clienteId: 'CLI-001',
  clienteNombre: 'Carlos Andrés Rodríguez Pérez',
  clienteDni: '0912345678',
  montoPrestamo: 1500000,
  montoTotal: 1800000,
  saldoPendiente: 1200000,
  tasaInteres: 20,
  duracion: '6 Meses',
  frecuencia: 'mensual',
  fechaInicio: '15/01/2024',
  fechaVencimiento: '15/07/2024',
  estado: 'ACTIVO',
  producto: 'Préstamo Personal - Libre Inversión',
  garantia: 'Pagaré firmado + Referencia Laboral',
  fotos: ['foto1', 'foto2'], // Simulación de fotos existentes
  cuotas: [
    { numero: 1, fecha: '15/02/2024', monto: 300000, estado: 'PAGADO', fechaPago: '14/02/2024' },
    { numero: 2, fecha: '15/03/2024', monto: 300000, estado: 'PAGADO', fechaPago: '15/03/2024' },
    { numero: 3, fecha: '15/04/2024', monto: 300000, estado: 'PENDIENTE' },
    { numero: 4, fecha: '15/05/2024', monto: 300000, estado: 'PENDIENTE' },
    { numero: 5, fecha: '15/06/2024', monto: 300000, estado: 'PENDIENTE' },
    { numero: 6, fecha: '15/07/2024', monto: 300000, estado: 'PENDIENTE' },
  ]
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Detalle de Préstamo ${id} • CrediSur`,
    description: `Gestión y detalles del préstamo ${id}`
  };
}

export default async function PrestamoDetallePage({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  
  // Simulamos datos específicos si el ID cambia, o usamos el default
  const prestamo = { ...prestamoMock, id };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      {/* Header General de la Página */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/prestamos" 
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">
                    <span className="text-blue-600">Gestión de </span>
                    <span className="text-orange-500">Préstamos</span>
                  </h1>
                  <p className="text-sm font-medium">
                    <span className="text-blue-600">Detalle de operación </span>
                    <span className="text-orange-500">y cartera</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/pagos/registrar/${prestamo.clienteId}`}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm shadow-sm hover:shadow-md hover:shadow-blue-600/20"
              >
                Registrar Pago
              </Link>
              <Link
                href={`/admin/prestamos/${id}/editar`}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm shadow-sm hover:shadow-md"
              >
                Editar Préstamo
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <DetallePrestamo prestamo={prestamo} />
      </main>
    </div>
  );
}
