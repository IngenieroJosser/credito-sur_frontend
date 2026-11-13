'use client';

import { SkeletonDetalle } from '@/components/ui/Skeleton'

import { use, useState, useEffect } from 'react';
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { ChevronLeft, Archive, User } from 'lucide-react';
import Link from 'next/link';
import { vencidasService, CuentaVencida } from '@/services/vencidas-service';
import ArchivarCuentaModal from '@/components/prestamos/ArchivarCuentaModal';
import Cifra from '@/components/ui/Cifra'

export default function DetalleCuentaVencidaPage({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);
  const [cuenta, setCuenta] = useState<CuentaVencida | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArchivarModal, setShowArchivarModal] = useState(false);

  useEffect(() => {
    const fetchCuenta = async () => {
      setLoading(true);
      try {
        const res = await vencidasService.obtenerCuentasVencidas();
        const found = res.cuentas.find((c: CuentaVencida) => c.id === id);
        setCuenta(found || null);
      } catch (err) {
        console.error('Error cargando cuenta vencida:', err);
        setCuenta(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCuenta();
  }, [id]);

  // Tiempo real: refrescar automáticamente cuando haya cambios.
  //
  // Va antes de los returns tempranos: puesto después, mientras cargaba se
  // ejecutaba un hook menos que ya cargado, y en cuanto el número cambia entre
  // dos renders React tumba la pantalla con el error 310.
  useRealtimeData(['pagos_actualizados'], () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  })

  if (loading) {
    return (
      <SkeletonDetalle />
    );
  }

  if (!cuenta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-red-500">No se encontró la cuenta vencida</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-12">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-900 opacity-10 blur-[100px]"></div>
      </div>

      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/cuentas-vencidas" 
                className="shrink-0 p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="shrink-0 p-2 rounded-xl bg-slate-900 text-white">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">Expediente de Castigo</h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{cuenta.numeroPrestamo} • {cuenta.diasVencidos} Días Vencidos</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowArchivarModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  <Archive className="w-4 h-4" />
                  Archivar Cuenta
                </button>
                <div className="w-[1px] h-8 bg-slate-200 hidden md:block" />
                <Link href={`/creditos/${id}`} className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                    Ver Crédito
                 </Link>
            </div>
          </div>
        </div>
      </header>

      {/*
        Modal de Archivar.

        `saldoPendiente` salia de `cuenta.montoVencido || cuenta.saldoTotal || 0`, y
        ninguno de esos dos campos existe en `CuentaVencida`: los reales son
        `saldoPendiente` y `montoOriginal`. Los dos valian `undefined`, asi que el modal
        recibia SIEMPRE 0 como saldo pendiente.
      */}
      {showArchivarModal && (
        <ArchivarCuentaModal
          prestamoId={id}
          numeroPrestamo={cuenta.numeroPrestamo}
          clienteNombre={typeof cuenta.cliente === 'string' ? cuenta.cliente : cuenta.cliente.nombre}
          saldoPendiente={cuenta.saldoPendiente || 0}
          onClose={() => setShowArchivarModal(false)}
          onSuccess={() => {
            window.location.href = '/cuentas-vencidas';
          }}
        />
      )}

      <main className="relative z-10 px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row">
            <div className="p-8 flex-1 border-b md:border-b-0 md:border-r border-slate-100">
                <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg mb-4 inline-block tracking-widest uppercase">
                    Cuenta Incobrable / Castigada
                </span>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">{cuenta.cliente.nombre}</h2>
                <p className="text-slate-500 font-medium mb-6">{cuenta.cliente.documento}</p>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Monto a Castigar</p>
                        <Cifra
                          valor={cuenta.saldoPendiente}
                          tamano="grande"
                          className="font-bold text-rose-600 font-mono tracking-tighter"
                        />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Fecha Vencimiento</p>
                        <p className="text-lg font-bold text-slate-900">{cuenta.fechaVencimiento}</p>
                    </div>
                </div>
            </div>
            <div className="p-8 bg-slate-50/50 w-full md:w-80 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Información de Localización</h4>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{cuenta.ruta}</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
            <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-8">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Dictamen de Coordinación</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                        Esta cuenta ha superado los 60 días de vencimiento. Se recomienda iniciar formalmente el proceso de cobro pre-jurídico o castigo de cartera según el manual de políticas de la empresa.
                    </p>
                </div>

                {/*
                  * Aquí había dos botones, «Acuerdo de Pago Final» y «Castigar
                  * Cartera», con su color y su hover y SIN `onClick`. Encima de
                  * un expediente con datos reales, invitaban a pulsar y no
                  * hacían absolutamente nada.
                  *
                  * La decisión formal se registra en el listado, que manda la
                  * solicitud a aprobación. En vez de abrir aquí una tercera
                  * copia de ese flujo, se lleva a quien mira el expediente al
                  * sitio donde la decisión sí se guarda.
                  */}
                <div className="mt-8">
                    <Link
                        href="/cuentas-vencidas"
                        className="inline-flex items-center justify-center w-full py-3 px-4 bg-[#08557f] text-white font-bold rounded-xl hover:bg-[#064460] transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08557f] focus-visible:ring-offset-2"
                    >
                        Registrar la decisión de esta cuenta
                    </Link>
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                        La prórroga, el seguimiento, el cobro jurídico y la baja por
                        pérdida se registran desde el listado de cuentas vencidas. Lo
                        que se elija queda como solicitud y se aplica cuando se aprueba.
                    </p>
                </div>
            </section>
        </div>
      </main>
    </div>
  );
}
