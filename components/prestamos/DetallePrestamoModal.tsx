'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import DetallePrestamo, { PrestamoDetalle } from '@/components/prestamos/DetallePrestamo';
import { prestamosService } from '@/services/prestamos-service';

interface DetallePrestamoModalProps {
  id: string;
  onClose: () => void;
}

export default function DetallePrestamoModal({ id, onClose }: DetallePrestamoModalProps) {
  const [prestamo, setPrestamo] = useState<PrestamoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrestamo = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await prestamosService.obtenerPrestamoPorId(id);
        const cuotasData = await prestamosService.obtenerCuotas(id).catch(() => []);
        
        const detalle: PrestamoDetalle = {
          id: data.id || id,
          clienteId: data.clienteId || data.cliente?.id || '',
          clienteNombre: data.cliente ? `${data.cliente.nombres} ${data.cliente.apellidos}` : (data.clienteNombre || ''),
          clienteDni: data.cliente?.dni || data.clienteDni || '',
          clienteTelefono: data.cliente?.telefono || data.clienteTelefono || '',
          clienteDireccion: data.cliente?.direccion || data.clienteDireccion || '',
          montoPrestamo: data.monto || data.montoPrestamo || 0,
          montoTotal: data.montoTotal || data.monto || 0,
          saldoPendiente: data.saldoPendiente || data.montoPendiente || 0,
          tasaInteres: data.tasaInteres || 0,
          duracion: data.plazoMeses ? `${data.plazoMeses} Meses` : (data.duracion || ''),
          frecuencia: data.frecuenciaPago || data.frecuencia || 'mensual',
          fechaInicio: data.fechaInicio || '',
          fechaVencimiento: data.fechaFin || data.fechaVencimiento || '',
          estado: data.estado || 'ACTIVO',
          producto: data.tipoPrestamo || data.producto || 'Préstamo',
          garantia: data.garantia || '',
          fotos: data.fotos || [],
          cuotas: cuotasData.map((c: any) => ({
            numero: c.numeroCuota,
            fecha: c.fechaVencimiento,
            monto: c.monto,
            estado: c.estado,
            fechaPago: c.fechaPago || undefined,
          })),
        };
        setPrestamo(detalle);
      } catch (err) {
        console.error('Error cargando detalle del préstamo:', err);
        setError('No se pudo cargar el detalle del préstamo');
      } finally {
        setLoading(false);
      }
    };

    fetchPrestamo();
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
        ) : error ? (
           <div className="p-10 text-center text-red-500">{error}</div>
        ) : prestamo ? (
           <DetallePrestamo prestamo={prestamo} />
        ) : (
           <div className="p-10 text-center text-slate-500">No se encontró información.</div>
        )}
      </div>
    </Modal>
  );
}

