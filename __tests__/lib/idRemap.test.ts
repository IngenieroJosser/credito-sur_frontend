/**
 * Verifica el remapeo de ids temporales (offline → real): que un crédito creado
 * offline se reenlace al cliente real tras sincronizar, y que texto del usuario
 * que empiece por "temp-" no se confunda con un id temporal.
 */
import {
  registrarMapeo,
  remapearProfundo,
  remapearEndpoint,
  contieneTempIdSinResolver,
  extraerIdReal,
  limpiarMapeos,
  hayMapeos,
} from '@/lib/offline/idRemap';

const TEMP_CLIENTE = 'temp-1735570000000';
const REAL_CLIENTE = 'a1b2c3d4-0000-4000-8000-000000000001';

beforeEach(() => {
  limpiarMapeos();
});

describe('idRemap — remapeo de ids temporales', () => {
  it('remapea el clienteId de un crédito una vez conocido el id real', () => {
    // Antes de sincronizar el cliente: el crédito aún referencia el temp-id.
    const creditoData = { clienteId: TEMP_CLIENTE, monto: 500000 };
    expect(contieneTempIdSinResolver('/loans', creditoData)).toBe(true);

    // El cliente se sincroniza → registramos el mapeo temp → real.
    registrarMapeo(TEMP_CLIENTE, REAL_CLIENTE);

    // Ahora el crédito se remapea al cliente real y ya no queda temp sin resolver.
    const remapeado = remapearProfundo(creditoData);
    expect(remapeado).toEqual({ clienteId: REAL_CLIENTE, monto: 500000 });
    expect(contieneTempIdSinResolver('/loans', remapeado)).toBe(false);
  });

  it('remapea un id temporal en el endpoint (PUT /clients/temp-...)', () => {
    registrarMapeo(TEMP_CLIENTE, REAL_CLIENTE);
    expect(remapearEndpoint(`/clients/${TEMP_CLIENTE}`)).toBe(`/clients/${REAL_CLIENTE}`);
  });

  it('NO confunde texto del usuario que empieza por "temp-" con un id temporal', () => {
    const data = {
      nombres: 'Temp-Store',
      notas: 'temp-fix pendiente',
      direccion: 'temperatura 123',
    };
    // No hay ningún id temporal real: no debe diferirse.
    expect(contieneTempIdSinResolver('/clients', data)).toBe(false);
    // Y remapear no altera el texto.
    expect(remapearProfundo(data)).toEqual(data);
  });

  it('extraerIdReal cubre las formas comunes de respuesta', () => {
    expect(extraerIdReal({ id: 'x' })).toBe('x');
    expect(extraerIdReal({ data: { id: 'y' } })).toBe('y');
    expect(extraerIdReal({ cliente: { id: 'z' } })).toBe('z');
    expect(extraerIdReal({ prestamo: { id: 'w' } })).toBe('w');
    expect(extraerIdReal({ nada: true })).toBeNull();
  });

  it('limpiarMapeos deja el mapa vacío', () => {
    registrarMapeo(TEMP_CLIENTE, REAL_CLIENTE);
    expect(hayMapeos()).toBe(true);
    limpiarMapeos();
    expect(hayMapeos()).toBe(false);
  });

  it('no registra mapeos inválidos (no-temp, vacíos o iguales)', () => {
    registrarMapeo('no-es-temp', REAL_CLIENTE);
    registrarMapeo('', REAL_CLIENTE);
    registrarMapeo(TEMP_CLIENTE, '');
    expect(hayMapeos()).toBe(false);
  });
});
