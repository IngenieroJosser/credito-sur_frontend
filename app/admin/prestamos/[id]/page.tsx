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
  plazo: '6 Meses',
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
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white/50 to-slate-50"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #0f172a 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.02
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #0f172a 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.02
        }}></div>
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
                <div className="p-2 rounded-lg bg-slate-100 text-slate-900">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">Gestión de Préstamos</h1>
                  <p className="text-sm text-slate-500">Detalle de operación y cartera</p>
                </div>
              </div>
            </div>
            
            <Link
              href={`/admin/prestamos/${id}/editar`}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm shadow-sm"
            >
              Editar Préstamo
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <DetallePrestamo prestamo={prestamo} />
      </main>
    </div>
  );
}
