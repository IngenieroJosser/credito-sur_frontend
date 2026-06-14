import { buildCrearPrestamoPayload } from '@/lib/creditos/crear-prestamo-payload';
import { FrecuenciaPago, TipoAmortizacion } from '@/lib/types/creditos';

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
});
