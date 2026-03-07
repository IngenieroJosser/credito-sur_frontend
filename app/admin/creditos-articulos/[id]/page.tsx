'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, Package, FileText } from 'lucide-react';
import Link from 'next/link';
import DetallePrestamo, { PrestamoDetalle } from '@/components/prestamos/DetallePrestamo';
import { prestamosService } from '@/services/prestamos-service';
import { exportService } from '@/services/export-service';
import { toast } from 'sonner';

export default function CreditoDetallePage() {
  const params = useParams();
  const id = params?.id as string;
  const [credito, setCredito] = useState<PrestamoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await prestamosService.obtenerPrestamoPorId(id);
        const cuotasData = await prestamosService.obtenerCuotas(id).catch(() => []);
        setCredito({
          id: data.id || id,
          clienteId: data.clienteId || data.cliente?.id || '',
          clienteNombre: data.cliente ? `${data.cliente.nombres} ${data.cliente.apellidos}` : '',
          clienteDni: data.cliente?.dni || '',
          clienteTelefono: data.cliente?.telefono || '',
          clienteDireccion: data.cliente?.direccion || '',
          montoPrestamo: data.monto || 0,
          montoTotal: data.montoTotal || (Number(data.monto || 0) + Number(data.interesTotal || 0)),
          saldoPendiente: data.saldoPendiente || data.montoPendiente || 0,
          tasaInteres: data.tasaInteres || 0,
          interesTotal: data.interesTotal != null ? Number(data.interesTotal) : undefined,
          capitalPagado: data.capitalPagado != null ? Number(data.capitalPagado) : undefined,
          interesPagado: data.interesPagado != null ? Number(data.interesPagado) : undefined,
          duracion: data.plazoMeses ? `${data.plazoMeses} Meses` : '',
          frecuencia: data.frecuenciaPago || 'mensual',
          fechaInicio: data.fechaInicio || '',
          fechaVencimiento: data.fechaFin || '',
          estado: data.estado || 'ACTIVO',
          tipoPrestamo: data.tipoPrestamo || 'ARTICULO',
          cuotaInicial: Number(data.cuotaInicial || 0),
          producto: data.producto?.nombre || data.tipoPrestamo || 'Crédito Artículo',
          garantia: data.garantia || 'Prenda sobre artículo',
          fotos: data.fotos || [],
          cuotas: cuotasData.map((c: any) => ({
            numero: c.numeroCuota,
            fecha: c.fechaVencimiento,
            monto: c.monto,
            montoCapital: c.montoCapital != null ? Number(c.montoCapital) : undefined,
            montoInteres: c.montoInteres != null ? Number(c.montoInteres) : undefined,
            estado: c.estado,
            fechaPago: c.fechaPago || undefined,
          })),
        });
      } catch (err) {
        console.error('Error cargando crédito:', err);
        setError('No se pudo cargar el crédito');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !credito) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-red-500">{error || 'Crédito no encontrado'}</p>
      </div>
    );
  }

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
                href="/creditos-articulos"
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

            <div className="flex items-center gap-2">

              <Link
                href={`/creditos-articulos/${id}/editar`}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm shadow-sm hover:shadow-md"
              >
                Editar Crédito
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <DetallePrestamo prestamo={credito} />
      </main>
    </div>
  );
}
