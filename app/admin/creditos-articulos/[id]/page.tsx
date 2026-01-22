import { Metadata } from 'next';
import { ChevronLeft, Package } from 'lucide-react';
import Link from 'next/link';
import DetallePrestamo, { PrestamoDetalle } from '@/components/prestamos/DetallePrestamo';

// Mock data adapted for Credit/Article
const creditoMock: PrestamoDetalle = {
  id: 'CR-2024-001',
  clienteId: 'CLI-001',
  clienteNombre: 'Carlos Andrés Rodríguez Pérez',
  clienteDni: '0912345678',
  montoPrestamo: 2500000,
  montoTotal: 3000000,
  saldoPendiente: 2000000,
  tasaInteres: 15,
  plazo: '12 Meses',
  frecuencia: 'mensual',
  fechaInicio: '15/01/2024',
  fechaVencimiento: '15/01/2025',
  estado: 'ACTIVO',
  producto: 'Televisor Samsung 55" 4K',
  garantia: 'Prenda sobre artículo',
  fotos: ['foto1'],
  cuotas: [
    { numero: 1, fecha: '15/02/2024', monto: 250000, estado: 'PAGADO', fechaPago: '14/02/2024' },
    { numero: 2, fecha: '15/03/2024', monto: 250000, estado: 'PAGADO', fechaPago: '15/03/2024' },
    { numero: 3, fecha: '15/04/2024', monto: 250000, estado: 'PENDIENTE' },
    { numero: 4, fecha: '15/05/2024', monto: 250000, estado: 'PENDIENTE' },
    { numero: 5, fecha: '15/06/2024', monto: 250000, estado: 'PENDIENTE' },
    { numero: 6, fecha: '15/07/2024', monto: 250000, estado: 'PENDIENTE' },
    { numero: 7, fecha: '15/08/2024', monto: 250000, estado: 'PENDIENTE' },
    { numero: 8, fecha: '15/09/2024', monto: 250000, estado: 'PENDIENTE' },
    { numero: 9, fecha: '15/10/2024', monto: 250000, estado: 'PENDIENTE' },
    { numero: 10, fecha: '15/11/2024', monto: 250000, estado: 'PENDIENTE' },
    { numero: 11, fecha: '15/12/2024', monto: 250000, estado: 'PENDIENTE' },
    { numero: 12, fecha: '15/01/2025', monto: 250000, estado: 'PENDIENTE' },
  ]
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Detalle de Crédito ${id} • CrediSur`,
    description: `Gestión y detalles del crédito ${id}`
  };
}

export default async function CreditoDetallePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const credito = { ...creditoMock, id };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/creditos-articulos"
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">
                    <span className="text-blue-600">Gestión de </span>
                    <span className="text-orange-500">Créditos</span>
                  </h1>
                  <p className="text-sm font-medium">
                    <span className="text-blue-600">Detalle de </span>
                    <span className="text-orange-500">artículo</span>
                  </p>
                </div>
              </div>
            </div>

            <Link
              href={`/admin/creditos-articulos/${id}/editar`}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm shadow-sm hover:shadow-md"
            >
              Editar Crédito
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <DetallePrestamo prestamo={credito} />
      </main>
    </div>
  );
}