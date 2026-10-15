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

  // `plazoMeses` decide el interés simple en el backend
  // (`interesTotal = monto * tasa * plazoMeses`, loans.service.ts:1429) y no tenía
  // ninguna prueba. Estas tres fijan lo medido.
  it('respeta el plazoMeses que manda el modal, incluso fraccionario', () => {
    const payload = buildCrearPrestamoPayload({
      creditType: 'prestamo',
      clienteCreditoId: 'cliente-1',
      monto: 1000000,
      tasaInteres: 10,
      cuotas: 45,
      plazoMeses: 1.5,
      frecuenciaPago: FrecuenciaPago.DIARIO,
    });

    expect(payload.plazoMeses).toBe(1.5);
  });

  it('deriva el plazo SIN redondear cuando el modal no lo manda', () => {
    // 45 cuotas diarias son 1,5 meses. Redondeando a 2 el interés sube un 33%, que es
    // justo lo que advierte la nota de `derivarPlazoMeses`.
    const payload = buildCrearPrestamoPayload({
      creditType: 'prestamo',
      clienteCreditoId: 'cliente-1',
      monto: 1000000,
      tasaInteres: 10,
      cuotas: 45,
      frecuenciaPago: FrecuenciaPago.DIARIO,
    });

    expect(payload.plazoMeses).toBe(1.5);
  });

  it('nunca deja el plazo en cero si no hay cuotas ni plazo', () => {
    const payload = buildCrearPrestamoPayload({
      creditType: 'prestamo',
      clienteCreditoId: 'cliente-1',
      monto: 1000000,
      tasaInteres: 10,
      cuotas: 0,
      frecuenciaPago: FrecuenciaPago.DIARIO,
    });

    expect(payload.plazoMeses).toBeGreaterThan(0);
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
