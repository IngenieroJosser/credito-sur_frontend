'use client';

import PantallaCarga from '@/components/ui/PantallaCarga'

import React, { useEffect, useState } from 'react';
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { useParams } from 'next/navigation';
import { ChevronLeft, BarChart3, Smartphone, DollarSign, Loader2 } from 'lucide-react';
import ClienteDetalleElegante, { Cliente, Prestamo, Pago, Comentario } from '@/components/cliente/DetalleCliente';
import Link from 'next/link';
import { clientesService } from '@/services/clientes-service';
import {
  computeDiasMoraFromCuotas,
  getBogotaDateKey,
  isCuotaNoPagada,
  normalizeDateKey,
  resolveFechaEfectivaCuota,
} from '@/lib/rutas-core'

export default function ClienteDetallePage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId as string;
  
  const [clienteData, setClienteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarCliente = async () => {
      try {
        const cliente = await clientesService.obtenerPorId(id);
        setClienteData(cliente);
      } catch (err) {
        console.error('Error cargando cliente:', err);
        setError('No se pudo cargar el cliente');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) cargarCliente();
  }, [id]);

  // Tiempo real: refrescar automáticamente cuando haya cambios.
  //
  // Va antes de los returns tempranos: puesto después, mientras cargaba se
  // ejecutaba un hook menos que ya cargado, y en cuanto el número cambia entre
  // dos renders React tumba la pantalla con el error 310.
  useRealtimeData(['pagos_actualizados', 'clientes_actualizados'], () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  })


  if (isLoading) {
    return (
      <PantallaCarga texto="Cargando información del cliente..." />
    );
  }

  if (error || !clienteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error al cargar</h2>
          <p className="text-slate-500 mb-6">No se pudo obtener la información del cliente. Verifique su conexión o intente nuevamente.</p>
          <Link href="/clientes" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900">
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al listado</span>
          </Link>
        </div>
      </div>
    );
  }

  // Mapeo de datos del backend a la interfaz de UI
  const fotos: string[] = (clienteData.archivos || [])
    .map((a: any) => a?.url || a?.path || a?.ruta)
    .filter(Boolean)

  const cliente: Cliente = {
    ...clienteData,
    fechaRegistro: clienteData.creadoEn || 'No disponible',
    ruta: clienteData.asignacionesRuta?.[0]?.ruta?.nombre || 'Sin Ruta',
    avatarColor: 'bg-blue-600',
    fotos,
  };

  // Mapeo de préstamos (si vienen del backend)
  const prestamos: Prestamo[] = (clienteData.prestamos || []).map((p: any) => {
    const cuotas = p.cuotas || [];
    const cuotasPagadas = cuotas.filter((c: any) => c.estado === 'PAGADO' || c.estado === 'PAGADA').length;
    const totalCuotas = p.cantidadCuotas || cuotas.length || 0;

    const hoyKey = getBogotaDateKey(new Date())
    const frecuencia = String(p.frecuenciaPago || 'DIARIO').toUpperCase()
    const cuotasVencidas = (Array.isArray(cuotas) ? cuotas : []).filter((c: any) => {
      if (!c || !isCuotaNoPagada(c)) return false
      const raw = resolveFechaEfectivaCuota(c) || String(c?.fechaVencimiento || '')
      const k = normalizeDateKey(raw)
      return !!k && !!hoyKey && k < hoyKey
    }).length
    const diasMora = computeDiasMoraFromCuotas(cuotas as any, hoyKey, frecuencia)
    const estadoUI = cuotasVencidas > 0 || diasMora > 0 ? 'EN_MORA' : p.estado
    
    // El backend devuelve Decimal como string/objeto, aseguramos conversión a número
    const principal = Number(p.monto || 0);
    const tasa = Number(p.tasaInteres || 0);
    const meses = Number(p.plazoMeses || 0);
    let interesTotal = Number(p.interesTotal || 0);
    
    // Si el interés viene en 0 pero hay tasa y plazo, intentamos calcularlo localmente
    // para corregir visualmente préstamos antiguos mal calculados.
    if (interesTotal === 0 && tasa > 0 && meses > 0) {
      interesTotal = (principal * tasa * meses) / 100;
    }

    const montoTotal = principal + interesTotal;
    const saldoPendiente = Number(p.saldoPendiente || 0);
    
    return {
      id: p.id,
      producto: p.tipoPrestamo === 'ARTICULO' ? (p.producto?.nombre || 'Artículo') : 'Préstamo Efectivo',
      montoTotal: montoTotal,
      montoPagado: Number(p.totalPagado || 0),
      montoPendiente: (saldoPendiente === principal && interesTotal > 0) ? montoTotal : saldoPendiente,
      cuotasTotales: totalCuotas,
      cuotasPagadas: cuotasPagadas,
      cuotasPendientes: Math.max(0, totalCuotas - cuotasPagadas),
      fechaInicio: p.fechaInicio,
      fechaVencimiento: p.fechaFin,
      proximoPago: cuotas.find((c: any) => c.estado === 'PENDIENTE' || c.estado === 'PARCIAL' || c.estado === 'VENCIDA' || c.estado === 'VENCIDO')?.fechaVencimiento || p.fechaFin,
      estado: estadoUI,
      tasaInteres: tasa,
      moraAcumulada: Number(p.interesMoraPagado || 0),
      cuotasVencidas,
      diasMora,
      icono: <Smartphone className="w-5 h-5" />,
      categoria: p.tipoPrestamo || 'General',
    } as Prestamo;
  });

  // Mapeo de pagos
  const pagos: Pago[] = (clienteData.pagos || []).map((p: any) => {
    return {
      id: p.id,
      fecha: p.fechaPago,
      monto: Number(p.montoTotal || 0),
      cuota: p.detalles?.[0]?.cuota?.numeroCuota || 1, // Ajuste basado en estructura de pagos.service
      metodo: p.metodoPago,
      estado: 'confirmado',
      referencia: p.numeroPago,
      icono: <DollarSign className="w-5 h-5" />,
      archivos: p.archivos || [],
    } as Pago;
  });

  const comentarios: Comentario[] = []; // Por ahora vacío hasta implementar backend

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Header General de la Página */}
      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/clientes" 
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="shrink-0 p-2 rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">
                    <span className="text-blue-600">Gestión de </span>
                    <span className="text-orange-500">Clientes</span>
                  </h1>
                  <p className="text-sm font-medium">
                    <span className="text-blue-600">Detalle y análisis </span>
                    <span className="text-orange-500">de cartera</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <ClienteDetalleElegante 
          cliente={cliente}
          prestamos={prestamos}
          pagos={pagos}
          comentarios={comentarios}
        />
      </main>
    </div>
  );
}
