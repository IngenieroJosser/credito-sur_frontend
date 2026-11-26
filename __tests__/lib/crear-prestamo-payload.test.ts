import * as fs from 'fs'
import * as path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

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
        metodoPago: 'TRANSFERENCIA',
      },
      'vendedor-1',
    );

    expect(payload).toEqual({
      clienteId: 'cliente-1',
      productoId: 'producto-1',
      precioVenta: 1_000_000,
      creadoPorId: 'vendedor-1',
      metodoPago: 'TRANSFERENCIA',
      notas: 'Venta de artículo de contado',
    });
    expect(payload).not.toHaveProperty('tipoPrestamo');
    expect(payload).not.toHaveProperty('cantidadCuotas');
    expect(payload).not.toHaveProperty('cuotaInicial');
  });
});

/**
 * Nadie vuelve a armar el payload a mano.
 *
 * Habia seis copias de la matematica del credito en el frontend y todas se
 * habian separado del backend. Quedaba una septima aqui, escondida donde no se
 * miraba: el modal de crear credito del detalle de cliente del supervisor, que
 * ningun barrido veia porque sus botones estan en un FAB detras de un
 * `accept="image/*"` que cegaba al recortador de comentarios. Mandaba
 * `tasaInteresMora: 5` —la unica pantalla del sistema con esa tasa, medido,
 * contra el 2 de todas las demas— y `plazoMeses: Math.ceil(cuotas / 4)` con el
 * comentario «estimado si es semanal»: sin mirar la frecuencia de verdad y con
 * el redondeo que infla el interes hasta un 33%.
 */
describe('ninguna pantalla arma el payload de crear credito a mano', () => {
  const RAIZ = path.join(__dirname, '..', '..')
  const OMITIR = new Set(['node_modules', '.next', 'dist', 'coverage', '__tests__', 'e2e'])

  const recorrer = (dir: string, acc: string[] = []): string[] => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || OMITIR.has(e.name)) continue
      const completo = path.join(dir, e.name)
      if (e.isDirectory()) recorrer(completo, acc)
      else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) acc.push(completo)
    }
    return acc
  }

  const archivos = recorrer(RAIZ)

  it('la centinela esta leyendo el proyecto', () => {
    // Piso medido el 2026-11-18: 419 archivos .ts/.tsx fuera de pruebas.
    expect(archivos.length).toBeGreaterThan(350)
  })

  it('nadie fija la tasa de mora por su cuenta', () => {
    const culpables: string[] = []

    for (const f of archivos) {
      const codigo = sinComentarios(fs.readFileSync(f, 'utf8'))
      // El origen unico y el formulario largo de creacion son los dos sitios
      // donde la cifra vive a proposito.
      const relativa = path.relative(RAIZ, f).split(path.sep).join('/')
      if (relativa === 'lib/creditos/crear-prestamo-payload.ts') continue
      if (relativa === 'components/prestamos/CreacionPrestamo.tsx') continue
      if (relativa === 'components/creditos/CreacionCreditoArticulo.tsx') continue

      if (/tasaInteresMora:\s*\d/.test(codigo)) {
        culpables.push(relativa)
      }
    }

    expect(culpables).toEqual([])
  })

  it('nadie deriva el plazo en meses con un redondeo propio', () => {
    const culpables: string[] = []

    for (const f of archivos) {
      const codigo = sinComentarios(fs.readFileSync(f, 'utf8'))
      if (/plazoMeses:[^,\r\n]*Math\.(ceil|round|floor)/.test(codigo)) {
        culpables.push(path.relative(RAIZ, f).split(path.sep).join('/'))
      }
    }

    expect(culpables).toEqual([])
  })
})
