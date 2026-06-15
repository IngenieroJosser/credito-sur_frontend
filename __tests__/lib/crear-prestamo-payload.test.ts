import {
  buildCrearPrestamoPayload,
  buildVentaContadoPayload,
} from '@/lib/creditos/crear-prestamo-payload';
import { FrecuenciaPago, TipoAmortizacion } from '@/types/enums';

describe('buildCrearPrestamoPayload', () => {
  it('usa INTERES_PLANO por defecto para nuevos créditos', () => {
    const payload = buildCrearPrestamoPayload({
      creditType: 'prestamo',
      clienteCreditoId: 'cliente-1',
      monto: 5000000,
      tasaInteres: 10,
      cuotas: 12,
      frecuenciaPago: FrecuenciaPago.MENSUAL,
    });

    expect(payload.tipoAmortizacion).toBe(TipoAmortizacion.INTERES_PLANO);
  });

  it('respeta INTERES_SIMPLE cuando se selecciona explícitamente', () => {
    const payload = buildCrearPrestamoPayload({
      creditType: 'prestamo',
      clienteCreditoId: 'cliente-1',
      monto: 5000000,
      tasaInteres: 10,
      cuotas: 12,
      frecuenciaPago: FrecuenciaPago.MENSUAL,
      tipoAmortizacion: TipoAmortizacion.INTERES_SIMPLE,
    });

    expect(payload.tipoAmortizacion).toBe(TipoAmortizacion.INTERES_SIMPLE);
  });

  it('respeta INTERES_PLANO cuando se selecciona explícitamente', () => {
    const payload = buildCrearPrestamoPayload({
      creditType: 'prestamo',
      clienteCreditoId: 'cliente-1',
      monto: 5000000,
      tasaInteres: 10,
      cuotas: 12,
      frecuenciaPago: FrecuenciaPago.MENSUAL,
      tipoAmortizacion: TipoAmortizacion.INTERES_PLANO,
    });

    expect(payload.tipoAmortizacion).toBe(TipoAmortizacion.INTERES_PLANO);
  });

  it('construye venta contado sin campos de préstamo ni cuota', () => {
    const payload = buildVentaContadoPayload(
      {
        creditType: 'articulo',
        clienteCreditoId: 'cliente-1',
        articuloId: 'producto-1',
        monto: 1_000_000,
        ventaContado: true,
        cuotaInicialArticulo: 0,
      },
      'vendedor-1',
      'caja-pv-1',
    );

    expect(payload).toEqual({
      clienteId: 'cliente-1',
      productoId: 'producto-1',
      precioVenta: 1_000_000,
      cajaId: 'caja-pv-1',
      creadoPorId: 'vendedor-1',
      metodoPago: 'EFECTIVO',
      notas: 'Venta de artículo de contado',
    });
    expect(payload).not.toHaveProperty('tipoPrestamo');
    expect(payload).not.toHaveProperty('cantidadCuotas');
    expect(payload).not.toHaveProperty('cuotaInicial');
  });
});
