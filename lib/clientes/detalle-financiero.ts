import type { PagoDeCliente } from '@/services/clientes-service'

/**
 * Cuotas afectadas por un pago del detalle de cliente.
 *
 * Un pago puede cubrir varias cuotas. Si el vinculo no existe en una fila vieja,
 * se dice que no se sabe (`—`); nunca se inventa la cuota 1.
 */
export function textoCuotasDePagoCliente(pago: PagoDeCliente): string {
  const numeros = pago.detalles
    .map((detalle) => detalle.cuota?.numeroCuota)
    .filter((numero): numero is number => typeof numero === 'number')

  return numeros.join(', ') || '—'
}
