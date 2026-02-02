'use client';

import { useState, use } from 'react';
import { ChevronLeft, BarChart3, Pencil, UserCog, Percent } from 'lucide-react';
import Link from 'next/link';
import DetallePrestamo, { PrestamoDetalle } from '@/components/prestamos/DetallePrestamo';
import EditarPrestamoModal from '@/components/prestamos/EditarPrestamoModal';
import ModificarInteresModal from '@/components/prestamos/ModificarInteresModal';

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

export default function PrestamoDetallePage({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModifyInterestModalOpen, setIsModifyInterestModalOpen] = useState(false);
  
  const handlePassToSupervisor = () => {
    // TODO: Implement API call to escalate to supervisor
    if (confirm('¿Está seguro de pasar esta cuenta a revisión del supervisor?')) {
      console.log('Pasando cuenta', id, 'al supervisor');
      alert('Cuenta enviada al supervisor para revisión');
    }
  };
  
  const handleModifyInterest = () => {
    setIsModifyInterestModalOpen(true);
  };
  
  // Simulamos datos específicos si el ID cambia, o usamos el default
  const prestamo = { ...prestamoMock, id };

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
                href="/coordinador/creditos" 
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
              <button
                onClick={handlePassToSupervisor}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-orange-200 text-orange-600 font-black rounded-xl hover:bg-orange-50 transition-all text-sm shadow-sm hover:shadow-md active:scale-95"
              >
                <UserCog className="w-4 h-4" />
                Pasar a Supervisión
              </button>
              
              <button
                onClick={handleModifyInterest}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-600 font-black rounded-xl hover:bg-blue-50 transition-all text-sm shadow-sm hover:shadow-md active:scale-95"
              >
                <Percent className="w-4 h-4" />
                Modificar Interés
              </button>
              
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm shadow-sm hover:shadow-md"
              >
                <Pencil className="w-4 h-4 text-slate-500" />
                Editar Préstamo
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <DetallePrestamo prestamo={prestamo} />
      </main>

      {isEditModalOpen && (
        <EditarPrestamoModal 
          id={id} 
          onClose={() => setIsEditModalOpen(false)} 
          onSuccess={() => {
            // Recargar datos o actualizar estado
          }}
        />
      )}
      
      {isModifyInterestModalOpen && (
        <ModificarInteresModal 
          prestamoId={id} 
          tasaActual={prestamo.tasaInteres}
          onClose={() => setIsModifyInterestModalOpen(false)} 
          onSuccess={() => {
            setIsModifyInterestModalOpen(false);
            // Recargar datos
          }}
        />
      )}
    </div>
  );
}
