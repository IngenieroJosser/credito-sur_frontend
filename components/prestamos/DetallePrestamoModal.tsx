'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import DetallePrestamo, { PrestamoDetalle } from '@/components/prestamos/DetallePrestamo';

// Mock data generator for detail
const getMockPrestamoDetalle = (id: string): PrestamoDetalle => ({
  id,
  clienteId: 'CLI-001',
  clienteNombre: 'Carlos Andrés Rodríguez Pérez',
  clienteDni: '0912345678',
  clienteTelefono: '+57 321 654 9870',
  clienteDireccion: 'Calle 123 # 45 - 67, Barrio El Centro',
  montoPrestamo: 1500000,
  montoTotal: 1800000,
  saldoPendiente: 1200000,
  tasaInteres: 20,
  duracion: '6 Meses',
  frecuencia: 'mensual',
  fechaInicio: '15/01/2024',
  fechaVencimiento: '15/07/2024',
  estado: 'ACTIVO',
  producto: 'Préstamo Personal',
  garantia: 'Pagaré',
  fotos: ['foto1'],
  cuotas: [
    { numero: 1, fecha: '15/02/2024', monto: 300000, estado: 'PAGADO', fechaPago: '14/02/2024' },
    { numero: 2, fecha: '15/03/2024', monto: 300000, estado: 'PAGADO', fechaPago: '15/03/2024' },
    { numero: 3, fecha: '15/04/2024', monto: 300000, estado: 'PENDIENTE' },
    { numero: 4, fecha: '15/05/2024', monto: 300000, estado: 'PENDIENTE' },
    { numero: 5, fecha: '15/06/2024', monto: 300000, estado: 'PENDIENTE' },
    { numero: 6, fecha: '15/07/2024', monto: 300000, estado: 'PENDIENTE' },
  ]
});

interface DetallePrestamoModalProps {
  id: string;
  onClose: () => void;
}

export default function DetallePrestamoModal({ id, onClose }: DetallePrestamoModalProps) {
  const [prestamo, setPrestamo] = useState<PrestamoDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset loading state if ID changes (handled by component re-mount or here if prop changes)
    // setLoading(true); // Removed to avoid lint error (already true on mount due to key prop)
    const timer = setTimeout(() => {
      setPrestamo(getMockPrestamoDetalle(id));
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [id]);

  // Modal handles isOpen (assumed true if this component is rendered, or we pass true)
  // ListadoPrestamos conditionally renders this component, so isOpen is always true when mounted.

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Detalle de Préstamo - ${id}`}
      size="xl"
    >
      <div className="min-h-[400px]">
        {loading ? (
           <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
           </div>
        ) : prestamo ? (
           <DetallePrestamo prestamo={prestamo} />
        ) : (
           <div className="p-10 text-center text-slate-500">No se encontró información.</div>
        )}
      </div>
    </Modal>
  );
}

