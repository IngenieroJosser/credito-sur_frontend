/**
 * Verifica el respaldo offline centralizado: encola SOLO ante error de red y
 * devuelve el valor optimista; ante un error HTTP real (403/409/500) re-lanza
 * (no encola algo que el servidor rechazó de verdad).
 */
const enqueueOperation = jest.fn().mockResolvedValue({ id: 'q1' });
jest.mock('@/lib/offline/syncService', () => ({
  syncService: { enqueueOperation: (...a: unknown[]) => enqueueOperation(...a) },
}));

import { conRespaldoOffline, esErrorDeRed } from '@/lib/offline/conRespaldoOffline';

describe('conRespaldoOffline', () => {
  beforeEach(() => {
    enqueueOperation.mockClear();
  });

  it('devuelve el resultado normal cuando la llamada tiene éxito (no encola)', async () => {
    const res = await conRespaldoOffline(
      async () => ({ ok: true }),
      { type: 't', endpoint: '/x', method: 'POST', description: 'x' },
      { optimista: true } as any,
    );
    expect(res).toEqual({ ok: true });
    expect(enqueueOperation).not.toHaveBeenCalled();
  });

  it('encola y devuelve el valor optimista ante error de red', async () => {
    const optimista = { esOffline: true };
    const res = await conRespaldoOffline(
      async () => { throw { code: 'ERR_NETWORK' }; },
      { type: 'rol_crear', endpoint: '/roles', method: 'POST', data: { a: 1 }, description: 'Crear rol' },
      optimista as any,
    );
    expect(res).toBe(optimista);
    expect(enqueueOperation).toHaveBeenCalledWith(
      'rol_crear', '/roles', 'POST', { a: 1 }, 'Crear rol', undefined, undefined,
    );
  });

  it('re-lanza (NO encola) ante un error HTTP real', async () => {
    await expect(
      conRespaldoOffline(
        async () => { throw { response: { status: 403 }, statusCode: 403 }; },
        { type: 't', endpoint: '/x', method: 'POST', description: 'x' },
        { optimista: true } as any,
      ),
    ).rejects.toBeDefined();
    expect(enqueueOperation).not.toHaveBeenCalled();
  });

  it('esErrorDeRed clasifica correctamente', () => {
    expect(esErrorDeRed({ code: 'ERR_NETWORK' })).toBe(true);
    expect(esErrorDeRed({ statusCode: 0 })).toBe(true);
    expect(esErrorDeRed({ message: 'network error' })).toBe(true);
    expect(esErrorDeRed({ statusCode: 403 })).toBe(false);
    expect(esErrorDeRed({ response: { status: 500 } })).toBe(false);
  });
});
