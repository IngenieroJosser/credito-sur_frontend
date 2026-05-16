import { formatErrorForComponent, normalizeApiErrorMessage } from '@/lib/api/api';

describe('API error messages', () => {
  it('joins validation error arrays into a readable message', () => {
    expect(normalizeApiErrorMessage(['El correo no es valido', 'La contrasena es requerida'])).toBe(
      'El correo no es valido. La contrasena es requerida',
    );
  });

  it('shows a friendly permissions message for 403 errors', () => {
    expect(formatErrorForComponent({ statusCode: 403 })).toBe(
      'No tienes permisos para realizar esta acción.',
    );
  });

  it('shows a friendly rate limit message for 429 errors', () => {
    expect(formatErrorForComponent({ statusCode: 429 })).toBe(
      'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
    );
  });
});
