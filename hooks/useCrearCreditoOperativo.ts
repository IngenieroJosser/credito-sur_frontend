import { useCallback } from 'react';
import { toast } from 'sonner';
import { buildCrearPrestamoPayload } from '@/lib/creditos/crear-prestamo-payload';
import { prestamosService } from '@/services/prestamos-service';
import { exportService } from '@/services/export-service';
import { rutasService } from '@/services/rutas-service';

interface UseCrearCreditoOperativoProps {
  userId?: string;
  rutaId?: string;
  cobradorId?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export function useCrearCreditoOperativo({
  userId,
  rutaId,
  cobradorId,
  onSuccess,
  onError,
}: UseCrearCreditoOperativoProps) {
  const handleCrearCredito = useCallback(async (data: any) => {
    try {
      if (!userId) {
        toast.error('No se pudo crear el crédito: sesión inválida.');
        return;
      }

      const esContado = Boolean(data?.ventaContado);
      const isArticulo = data?.creditType === 'articulo';
      const payload = buildCrearPrestamoPayload(data, userId);

      const prestamo = await prestamosService.crearPrestamo(payload);

      if (isArticulo && prestamo?.id && !esContado) {
        try {
          await exportService.exportContrato(prestamo.id);
        } catch (err) {
          console.error('Error al descargar contrato:', err);
        }
      }

      // Asignar cliente a la ruta automáticamente si estamos en una ruta específica
      if (rutaId && cobradorId && data?.clienteCreditoId) {
        try {
          await rutasService.asignarCliente(
            rutaId,
            data.clienteCreditoId,
            cobradorId,
          );
        } catch (assignError) {
          console.error('Error al asignar cliente a la ruta:', assignError);
        }
      }

      toast.success('Crédito creado correctamente. Pendiente de aprobación.');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error al crear crédito:', error);
      toast.error(error?.message || 'No se pudo crear el crédito. Inténtelo de nuevo.');
      onError?.(error);
    }
  }, [userId, rutaId, cobradorId, onSuccess, onError]);

  return { handleCrearCredito };
}
