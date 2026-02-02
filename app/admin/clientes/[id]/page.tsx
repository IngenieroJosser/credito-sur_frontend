'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, BarChart3, Smartphone, DollarSign, Loader2 } from 'lucide-react';
import ClienteDetalleElegante, { Cliente, Prestamo, Pago, Comentario } from '@/components/cliente/DetalleCliente';
import Link from 'next/link';
import { MOCK_CLIENTES } from '@/services/clientes-service';

export default function ClienteDetallePage() {
  const params = useParams();
  // Asegurar que el ID sea un string limpio
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId as string;
  
  // MODO FRONTEND: Buscar directamente en los mocks sin llamadas asíncronas fallidas
  const clienteEncontrado = MOCK_CLIENTES.find(c => c.id === id) || MOCK_CLIENTES[0];
  
  // Construir el objeto de datos completo simulado
  const clienteData = {
    ...clienteEncontrado,
    prestamos: [],
    pagos: []
  };

  const isLoading = false;
  const error = null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Cargando información del cliente...</p>
        </div>
      </div>
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
          <Link href="/admin/clientes" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900">
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al listado</span>
          </Link>
        </div>
      </div>
    );
  }

  // Mapeo de datos del backend a la interfaz de UI
  const cliente: Cliente = {
    ...clienteData,
    fechaRegistro: clienteData.fechaRegistro || 'No disponible',
    avatarColor: 'bg-blue-600'
  };

  // Mapeo de préstamos (si vienen del backend)
  const prestamos: Prestamo[] = (clienteData.prestamos || []).map((p: unknown) => {
    return {
      ...(p as Partial<Prestamo>),
      icono: <Smartphone className="w-5 h-5" />,
      categoria: 'General',
    } as Prestamo
  })

  // Mapeo de pagos
  const pagos: Pago[] = (clienteData.pagos || []).map((p: unknown) => {
    return {
      ...(p as Partial<Pago>),
      icono: <DollarSign className="w-5 h-5" />,
      estado: 'confirmado',
    } as Pago
  })

  const comentarios: Comentario[] = []; // Por ahora vacío hasta implementar backend

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Header General de la Página */}
      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/clientes" 
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
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
          rolUsuario="administrador"
        />
      </main>
    </div>
  );
}
