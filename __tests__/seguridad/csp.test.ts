import { construirCsp } from '@/lib/seguridad/csp';

/**
 * 'unsafe-eval' permite ejecutar como código cualquier texto que llegue a la
 * página. Hace falta en desarrollo, porque la recarga en caliente de Next
 * evalúa código en tiempo de ejecución, pero en producción no existe esa
 * recarga: dejarlo puesto sería abrir esa puerta sin ninguna ganancia.
 */
describe('Política de seguridad de contenido', () => {
  it('en producción NO permite evaluar texto como código', () => {
    expect(construirCsp('production')).not.toContain('unsafe-eval');
  });

  it('en desarrollo sí lo permite, para la recarga en caliente', () => {
    expect(construirCsp('development')).toContain("'unsafe-eval'");
  });

  it('en ningún entorno se cargan scripts de otros dominios', () => {
    for (const entorno of ['production', 'development']) {
      const csp = construirCsp(entorno);
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    }
  });

  it('la exfiltración solo puede ir a los orígenes permitidos', () => {
    const csp = construirCsp('production');
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain('https://credito-sur-backend.onrender.com');
  });
});
