'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import DetallePrestamo, { PrestamoDetalle } from '@/components/prestamos/DetallePrestamo';
import { prestamosService } from '@/services/prestamos-service';
import { getLoanAmounts } from '@/lib/loan-calculations';
import { offlineStore } from '@/lib/offline/offlineDb';

interface DetallePrestamoModalProps {
  id: string;
  onClose: () => void;
  includeArchived?: boolean;
}

export default function DetallePrestamoModal({ id, onClose, includeArchived = false }: DetallePrestamoModalProps) {
  const [prestamo, setPrestamo] = useState<PrestamoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    const fetchPrestamo = async () => {
      setLoading(true);
      try {
        const data = includeArchived
          ? await prestamosService.obtenerPrestamoArchivadoPorId(id)
          : await prestamosService.obtenerPrestamoPorId(id);
        const cuotasData = await prestamosService.obtenerCuotas(id).catch(() => []);
        
        const principal = Number(data.monto || 0);
        const tasa = Number(data.tasaInteres || 0);
        const meses = Number(data.plazoMeses || 0);
        let interesTotal = Number(data.interesTotal || 0);
        if (interesTotal === 0 && tasa > 0 && meses > 0) {
          interesTotal = (principal * tasa * meses) / 100;
        }

        const amounts = getLoanAmounts({
          tipoPrestamo: data.tipoPrestamo,
          monto: principal,
          cuotaInicial: data.cuotaInicial,
          interesTotal,
        });

        const isArticle = amounts.isArticulo;
        const montoTotal = amounts.totalContrato;
        const saldoPendiente = Number(data.saldoPendiente || 0);

        const rawFotos = Array.isArray(data.fotos)
          ? data.fotos
          : Array.isArray(data.archivos) && data.archivos.length > 0
            ? data.archivos
              .map((a: any) => a?.url || a?.path || a?.ruta)
              .filter(Boolean)
            : Array.isArray(data?.cliente?.archivos)
              ? data.cliente.archivos
                .map((a: any) => a?.url || a?.path || a?.ruta)
                .filter(Boolean)
              : [];

        const fotos: string[] = Array.from(
          new Set(
            (rawFotos || [])
              .map((u: any) => String(u || '').trim())
              .filter(Boolean)
              // filtrar entradas rotas tipo "oxz...jpg" sin ruta/publicId ni URL
              .filter((u: string) => u.startsWith('http://') || u.startsWith('https://') || u.includes('/'))
          )
        );

        setPrestamo({
          id: data.id || id,
          clienteId: data.clienteId || data.cliente?.id || '',
          clienteNombre: data.cliente ? `${data.cliente.nombres} ${data.cliente.apellidos}` : (data.clienteNombre || ''),
          clienteDni: data.cliente?.dni || data.clienteDni || '',
          clienteTelefono: data.cliente?.telefono || data.clienteTelefono || '',
          clienteDireccion: data.cliente?.direccion || data.clienteDireccion || '',
          montoPrestamo: principal,
          montoTotal: montoTotal,
          saldoPendiente: (saldoPendiente === principal && interesTotal > 0 && !isArticle) ? montoTotal : saldoPendiente,
          tasaInteres: tasa,
          interesTotal: interesTotal,
          capitalPagado: data.capitalPagado != null ? Number(data.capitalPagado) : undefined,
          interesPagado: data.interesPagado != null ? Number(data.interesPagado) : undefined,
          duracion: meses ? `${meses} Meses` : (data.duracion || ''),
          frecuencia: data.frecuenciaPago || data.frecuencia || 'SEMANAL',
          fechaInicio: data.fechaInicio || '',
          fechaPrimerCobro: data.fechaPrimerCobro || undefined,
          fechaProximoPago: data.proximoPago || undefined,
          fechaVencimiento: data.fechaFin || data.fechaVencimiento || '',
          estado: data.estado || 'ACTIVO',
          tipoAmortizacion: (data.tipoAmortizacion || 'INTERES_SIMPLE') as 'INTERES_SIMPLE' | 'FRANCESA',
          tipoPrestamo: (typeof data.tipoPrestamo === 'string' ? data.tipoPrestamo : '').toUpperCase(),
          cuotaInicial: amounts.cuotaInicial,
          producto: typeof data.producto === 'string' ? data.producto : ((data.producto as any)?.nombre || data.tipoPrestamo || 'Préstamo'),
          productoInfo: data.producto ? {
            marca: (data.producto as any).marca,
            modelo: (data.producto as any).modelo,
            serie: (data.producto as any).serie,
            categoria: (data.producto as any).categoria
          } : undefined,
          garantia: data.garantia || '',
          notas: data.notas || '',
          fotos,
          cuotas: cuotasData.map((c: any) => ({
            numero: c.numeroCuota,
            fecha: c.fechaVencimiento,
            monto: c.monto,
            montoPagado: c.montoPagado != null ? Number(c.montoPagado) : undefined,
            montoCapital: c.montoCapital != null ? Number(c.montoCapital) : undefined,
            montoInteres: c.montoInteres != null ? Number(c.montoInteres) : undefined,
            estado: c.estado,
            fechaPago: c.fechaPago || undefined,
          })),
        });
      } catch (err) {
        console.error('Error cargando detalle del préstamo:', err);
        // Fallback offline
        try {
          const offP = await offlineStore.getById<any>('prestamos', id);
          if (offP) {
            const offCuotas = await offlineStore.getByIndex<any>('cuotas', 'by-prestamoId', id).catch(() => []);
            setPrestamo({
              id: offP.id,
              clienteId: offP.clienteId || '',
              clienteNombre: offP.clienteNombre || '',
              clienteDni: '',
              clienteTelefono: '',
              clienteDireccion: '',
              montoPrestamo: offP.monto || offP.montoPrestamo || 0,
              montoTotal: offP.montoTotal || 0,
              saldoPendiente: offP.saldoPendiente || 0,
              tasaInteres: offP.tasaInteres || 0,
              interesTotal: offP.interesTotal,
              capitalPagado: offP.capitalPagado,
              interesPagado: offP.interesPagado,
              duracion: offP.plazoMeses ? `${offP.plazoMeses} Meses` : '',
              frecuencia: offP.frecuenciaPago || 'mensual',
              fechaInicio: offP.fechaInicio || '',
              fechaVencimiento: offP.fechaFin || '',
              estado: offP.estado || 'ACTIVO',
              tipoAmortizacion: offP.tipoAmortizacion || 'INTERES_SIMPLE',
              producto: offP.tipoPrestamo || 'Préstamo',
              garantia: '',
              fotos: [],
              cuotas: offCuotas.map((c: any) => ({
                numero: c.numeroCuota,
                fecha: c.fechaVencimiento,
                monto: c.monto,
                montoCapital: c.montoCapital,
                montoInteres: c.montoInteres,
                estado: c.estado,
                fechaPago: c.fechaPago || undefined,
              })),
            });
          } else {
            setPrestamo(null);
          }
        } catch {
          setPrestamo(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPrestamo();
  }, [id, includeArchived]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483620] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={handleClose}>
      {/* Backdrop */}
      <div className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} />

      {/* Centered modal panel */}
      <div
        className={`relative w-full bg-white shadow-2xl flex flex-col transition-all duration-200 ease-out h-[100dvh] sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl sm:max-w-5xl ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto sm:rounded-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Cargando detalle del crédito...</p>
            </div>
          ) : prestamo ? (
            <DetallePrestamo prestamo={prestamo} />
          ) : (
            <div className="flex items-center justify-center min-h-[50vh]">
              <p className="text-slate-500 font-medium">No se encontró información del crédito.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

