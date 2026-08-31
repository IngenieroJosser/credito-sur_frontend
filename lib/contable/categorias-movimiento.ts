/**
 * Categorías predefinidas de movimientos de caja, con su CÓDIGO contable.
 *
 * El backend (`accounting.service` → `CUENTA_POR_CATEGORIA`) decide la cuenta a
 * partir del `tipoReferencia` que recibe. Solo reconoce estos códigos exactos;
 * cualquier otro texto (o un id/uuid de categoría) cae a la cuenta genérica
 * "Otros Ingresos (3.3)" / gastos, lo que registraría un aporte de capital como
 * si fuera una ganancia. Por eso el formulario debe mandar el CÓDIGO, no un id.
 *
 * Estos códigos deben coincidir EXACTAMENTE con las claves del backend.
 */
export interface CategoriaMovimiento {
  /** Lo que se envía como `tipoReferencia` (debe existir en CUENTA_POR_CATEGORIA del backend). */
  code: string;
  /** Nombre visible en el selector. */
  label: string;
  /** Código de la cuenta contable a la que va (para el mensaje al usuario). */
  cuenta: string;
  /** Nombre de la cuenta contable (para el mensaje). */
  cuentaNombre: string;
  /** Explicación corta de qué hace este movimiento. */
  efecto: string;
}

export const CATEGORIAS_INGRESO: CategoriaMovimiento[] = [
  {
    code: 'APORTE_CAPITAL',
    label: 'Dinero que pone el dueño',
    cuenta: '2.1',
    cuentaNombre: 'Capital del Propietario',
    efecto: 'Plata que el dueño mete al negocio para trabajar. No es una ganancia.',
  },
  {
    code: 'AJUSTE_POSITIVO',
    label: 'Sobrante de caja',
    cuenta: '2.4',
    cuentaNombre: 'Ajustes Pendientes',
    efecto: 'Apareció dinero de más en la caja y la cuadras. Queda por explicar; no es ganancia.',
  },
  {
    code: 'OTROS_INGRESOS',
    label: 'Otra entrada (ganancia)',
    cuenta: '3.3',
    cuentaNombre: 'Otros Ingresos',
    efecto: 'Cualquier otra entrada de dinero que SÍ es ganancia del negocio.',
  },
];

export const CATEGORIAS_EGRESO: CategoriaMovimiento[] = [
  {
    code: 'GASTO_OPERATIVO',
    label: 'Gasto del día a día',
    cuenta: '4.1',
    cuentaNombre: 'Gastos Operativos',
    efecto: 'Transporte, comida, combustible… lo que se gasta operando la ruta.',
  },
  {
    code: 'GASTO_ADMINISTRATIVO',
    label: 'Gasto de oficina',
    cuenta: '4.2',
    cuentaNombre: 'Gastos Administrativos',
    efecto: 'Papelería, servicios, arriendo… gastos de administración.',
  },
  {
    code: 'BASE_COBRADOR',
    label: 'Entregar base a un cobrador',
    cuenta: '1.4.1',
    cuentaNombre: 'Deuda de Cobradores',
    efecto: 'Le das dinero al cobrador para prestar. Queda como su deuda, no es un gasto.',
  },
  {
    code: 'RETIRO_UTILIDADES',
    label: 'El dueño saca ganancias',
    cuenta: '2.2',
    cuentaNombre: 'Retiro de Utilidades',
    efecto: 'El dueño retira ganancias del negocio. No es un gasto.',
  },
];

export function categoriasPorTipo(tipo: 'INGRESO' | 'EGRESO'): CategoriaMovimiento[] {
  return tipo === 'INGRESO' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;
}

export function buscarCategoriaMovimiento(code?: string): CategoriaMovimiento | undefined {
  if (!code) return undefined;
  const c = code.toUpperCase();
  return [...CATEGORIAS_INGRESO, ...CATEGORIAS_EGRESO].find((x) => x.code === c);
}

/**
 * Mensaje dinámico que explica qué hará el movimiento con la categoría elegida.
 */
export function mensajeEfectoMovimiento(params: {
  tipo: 'INGRESO' | 'EGRESO';
  categoriaCode?: string;
  montoFmt?: string;
  cajaNombre?: string;
}): { texto: string; alerta: boolean } {
  const cat = buscarCategoriaMovimiento(params.categoriaCode);
  if (!cat) {
    return {
      texto: 'Elige una categoría para ver exactamente cómo se registrará este movimiento.',
      alerta: false,
    };
  }
  const verbo = params.tipo === 'INGRESO' ? 'Sumará' : 'Restará';
  const prep = params.tipo === 'INGRESO' ? 'a' : 'de';
  const monto = params.montoFmt && params.montoFmt.trim() ? params.montoFmt : 'el monto';
  const caja = params.cajaNombre || 'la caja';
  return {
    texto: `${verbo} ${monto} ${prep} ${caja}. Se registra en la cuenta ${cat.cuenta} — ${cat.cuentaNombre}. ${cat.efecto}`,
    // Aviso suave cuando el ingreso SÍ cuenta como ganancia (para que no se
    // registre un aporte de capital ahí por error).
    alerta: cat.code === 'OTROS_INGRESOS',
  };
}
