import { listaPadreDeDetalle, pareceId } from '@/lib/detalle-padre';

describe('detalle-padre — cold-start offline', () => {
  it('detecta ids (uuid, token largo, temp-)', () => {
    expect(pareceId('a1b2c3d4-0000-4000-8000-000000000001')).toBe(true);
    expect(pareceId('ckv9f8h2n0001qz')).toBe(false); // 15 chars
    expect(pareceId('ckv9f8h2n0001qzabcd')).toBe(true); // ≥16
    expect(pareceId('temp-1735570000000')).toBe(true);
    expect(pareceId('clientes')).toBe(false);
    expect(pareceId('editar')).toBe(false);
  });

  it('devuelve la lista padre de un detalle', () => {
    const id = 'a1b2c3d4-0000-4000-8000-000000000001';
    expect(listaPadreDeDetalle(`/coordinador/clientes/${id}`)).toBe('/coordinador/clientes');
    expect(listaPadreDeDetalle(`/coordinador/clientes/${id}/editar`)).toBe('/coordinador/clientes');
    expect(listaPadreDeDetalle(`/supervisor/rutas/${id}`)).toBe('/supervisor/rutas');
    expect(listaPadreDeDetalle(`/creditos-articulos/${id}`)).toBe('/creditos-articulos');
  });

  it('devuelve null cuando NO es un detalle con lista padre', () => {
    // Ya es una lista
    expect(listaPadreDeDetalle('/coordinador/clientes')).toBeNull();
    // Página de acción, no lista
    const id = 'a1b2c3d4-0000-4000-8000-000000000001';
    expect(listaPadreDeDetalle(`/supervisor/pagos/registrar/${id}`)).toBeNull();
    // Home de rol
    expect(listaPadreDeDetalle('/cobranzas')).toBeNull();
    // Raíz
    expect(listaPadreDeDetalle('/')).toBeNull();
  });
});
