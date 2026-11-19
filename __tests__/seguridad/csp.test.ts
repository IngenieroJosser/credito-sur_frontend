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

/**
 * El backend configurado tiene que estar en `connect-src`.
 *
 * Los tres orígenes de Render estaban escritos a mano en el módulo. Mientras el
 * sistema viva en Render y en local no se nota —`localhost:*` y `127.0.0.1:*`
 * ya están permitidos—, pero el día que el backend esté en otro dominio (el
 * servidor del cliente, un entorno de pruebas, la LAN de la oficina con nombre
 * propio) la CSP bloquearía TODAS las llamadas de la app a su propio backend, y
 * el síntoma —una pantalla sin datos— no se parece en nada a la causa.
 */
describe('la CSP deja hablar con el backend que esté configurado', () => {
  const original = process.env.NEXT_PUBLIC_BASE_URL

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_BASE_URL
    else process.env.NEXT_PUBLIC_BASE_URL = original
  })

  it('incluye el origen de NEXT_PUBLIC_BASE_URL', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://api.elcliente.com/api-credisur'

    const csp = construirCsp('production')

    expect(csp).toContain('https://api.elcliente.com')
  })

  it('y su equivalente de socket, que es por donde van las notificaciones', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://api.elcliente.com'

    expect(construirCsp('production')).toContain('wss://api.elcliente.com')
  })

  it('en claro, el socket va sin cifrar: ws, no wss', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'http://192.168.1.50:3001'

    const csp = construirCsp('production')

    expect(csp).toContain('http://192.168.1.50:3001')
    expect(csp).toContain('ws://192.168.1.50:3001')
  })

  it('una variable mal escrita no tumba la cabecera', () => {
    // Sin esto, un valor basura dejaría la app sin CSP ninguna.
    process.env.NEXT_PUBLIC_BASE_URL = 'esto no es una url'

    const csp = construirCsp('production')

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain('https://credito-sur-backend.onrender.com')
  })

  it('sin variable, la CSP es la de siempre', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL

    const csp = construirCsp('production')

    expect(csp).toContain('https://credito-sur-backend.onrender.com')
    expect(csp).toContain('wss://credito-sur-backend.onrender.com')
  })
})
