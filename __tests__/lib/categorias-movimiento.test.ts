import {
  CATEGORIAS_INGRESO,
  CATEGORIAS_EGRESO,
  categoriasPorTipo,
  buscarCategoriaMovimiento,
  mensajeEfectoMovimiento,
} from '@/lib/contable/categorias-movimiento';

// Estos códigos DEBEN coincidir con CUENTA_POR_CATEGORIA del backend
// (accounting.service). Si el backend cambia una cuenta, este test debe romperse
// para no misclasificar dinero en silencio.
const CUENTA_ESPERADA_BACKEND: Record<string, string> = {
  APORTE_CAPITAL: '2.1',
  AJUSTE_POSITIVO: '2.4',
  OTROS_INGRESOS: '3.3',
  GASTO_OPERATIVO: '4.1',
  GASTO_ADMINISTRATIVO: '4.2',
  BASE_COBRADOR: '1.4.1',
  RETIRO_UTILIDADES: '2.2',
};

describe('categorias-movimiento', () => {
  it('cada categoría mapea a la cuenta que el backend espera', () => {
    for (const c of [...CATEGORIAS_INGRESO, ...CATEGORIAS_EGRESO]) {
      expect(CUENTA_ESPERADA_BACKEND[c.code]).toBe(c.cuenta);
    }
  });

  it('Aporte de Capital va a 2.1 (capital, NO a Otros Ingresos 3.3)', () => {
    const cap = buscarCategoriaMovimiento('APORTE_CAPITAL');
    expect(cap?.cuenta).toBe('2.1');
    expect(cap?.cuenta).not.toBe('3.3');
  });

  it('categoriasPorTipo filtra por INGRESO / EGRESO', () => {
    expect(categoriasPorTipo('INGRESO').map((c) => c.code)).toContain('APORTE_CAPITAL');
    expect(categoriasPorTipo('EGRESO').map((c) => c.code)).toContain('RETIRO_UTILIDADES');
    expect(categoriasPorTipo('INGRESO').map((c) => c.code)).not.toContain('GASTO_OPERATIVO');
  });

  it('mensaje dinámico explica el efecto y avisa cuando es ganancia', () => {
    const aporte = mensajeEfectoMovimiento({
      tipo: 'INGRESO',
      categoriaCode: 'APORTE_CAPITAL',
      montoFmt: '$10.000.000',
      cajaNombre: 'Caja de Oficina',
    });
    expect(aporte.texto).toContain('Sumará $10.000.000 a Caja de Oficina');
    expect(aporte.texto).toContain('2.1');
    expect(aporte.alerta).toBe(false);

    const otros = mensajeEfectoMovimiento({ tipo: 'INGRESO', categoriaCode: 'OTROS_INGRESOS' });
    expect(otros.alerta).toBe(true); // avisa: SÍ cuenta como ganancia

    const sinCat = mensajeEfectoMovimiento({ tipo: 'INGRESO' });
    expect(sinCat.texto).toMatch(/Elige una categoría/);
  });
});
