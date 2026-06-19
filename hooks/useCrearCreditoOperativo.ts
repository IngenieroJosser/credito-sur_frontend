import { useCallback } from 'react';
import { toast } from 'sonner';
import { buildCrearPrestamoPayload } from '@/lib/creditos/crear-prestamo-payload';
import { prestamosService } from '@/services/prestamos-service';
import { exportService } from '@/services/export-service';
import { rutasService } from '@/services/rutas-service';

const isUuid = (value?: string | null) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim(),
  )
}

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
      const clienteIdFinal = String(
        prestamo?.clienteId ||
          prestamo?.cliente?.id ||
          prestamo?.cliente?.clienteId ||
          data?.clienteId ||
          data?.clienteCreditoId ||
          data?.cliente?.id ||
          '',
      ).trim()

      if (rutaId && cobradorId && clienteIdFinal) {
        if (!isUuid(rutaId)) {
          console.warn('[Crear crédito operativo] rutaId inválido para asignación:', {
            rutaId,
          })
        } else if (!isUuid(clienteIdFinal)) {
          console.warn('[Crear crédito operativo] clienteId inválido para asignación:', {
            clienteIdFinal,
            dataClienteCreditoId: data?.clienteCreditoId,
            dataClienteId: data?.clienteId,
            prestamoClienteId: prestamo?.clienteId,
            prestamo,
          })
        } else if (!isUuid(cobradorId)) {
          console.warn('[Crear crédito operativo] cobradorId inválido para asignación:', {
            cobradorId,
            userId,
          })
        } else {
          try {
            await rutasService.asignarCliente(
              rutaId,
              clienteIdFinal,
              cobradorId,
            );
          } catch (assignError) {
            console.error('Error al asignar cliente a la ruta:', assignError);
          }
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
