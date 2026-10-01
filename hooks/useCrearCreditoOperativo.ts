import { mensajeDeError } from '@/lib/mensaje-de-error';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { buildCrearPrestamoPayload, type CrearCreditoModalData } from '@/lib/creditos/crear-prestamo-payload';
import { prestamosService } from '@/services/prestamos-service';
import { exportService } from '@/services/export-service';
import { rutasService } from '@/services/rutas-service';
import { isUuid } from '@/lib/utils'


interface UseCrearCreditoOperativoProps {
  userId?: string;
  rutaId?: string;
  cobradorId?: string;
  onSuccess?: () => void;
  /** `unknown`: es lo que sale de un `catch`, y quien lo reciba lo convierte. */
  onError?: (error: unknown) => void;
}

export function useCrearCreditoOperativo({
  userId,
  rutaId,
  cobradorId,
  onSuccess,
  onError,
}: UseCrearCreditoOperativoProps) {
  const handleCrearCredito = useCallback(async (data: CrearCreditoModalData) => {
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
      // `data.clienteId` y `data.cliente?.id` no existen: CrearCreditoModal emite
      // `clienteCreditoId` (CrearCreditoModal.tsx:967 y alrededores). Con `data: any`
      // esos dos eslabones no se veian.
      const clienteIdFinal = String(
        prestamo?.clienteId ||
          prestamo?.cliente?.id ||
          data?.clienteCreditoId ||
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
    } catch (error) {
      console.error('Error al crear crédito:', error);
      toast.error(mensajeDeError(error, 'No se pudo crear el crédito. Inténtelo de nuevo.'));
      onError?.(error);
    }
  }, [userId, rutaId, cobradorId, onSuccess, onError]);

  return { handleCrearCredito };
}
