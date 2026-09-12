export type LoanLike = {
  tipoPrestamo?: string | null;
  monto?: number | string | null;
  cuotaInicial?: number | string | null;
  interesTotal?: number | string | null;
};

const toNumber = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Los dos totales de un credito, que NO son lo mismo.
 *
 *  - `totalFinanciado` = monto + interes. Es lo que el cliente queda debiendo y
 *    lo que se reparte en cuotas.
 *  - `totalContrato`   = lo anterior mas la cuota inicial, pero SOLO en creditos
 *    de articulo. Es el valor del negocio completo.
 *
 * La diferencia esta en la cuota inicial de un articulo: el cliente ya la pago,
 * asi que no se financia (no entra en `totalFinanciado`) pero si forma parte de
 * lo que costo el articulo (si entra en `totalContrato`).
 *
 * Usar uno donde va el otro infla o desinfla la cartera en pantalla: por eso se
 * calculan aqui una sola vez y no en cada componente.
 */
export const getLoanAmounts = (loan: LoanLike) => {
  const tipo = String(loan?.tipoPrestamo ?? '').toUpperCase();
  const isArticulo = tipo === 'ARTICULO';

  const monto = toNumber(loan?.monto);
  const cuotaInicial = toNumber(loan?.cuotaInicial);
  const interesTotal = toNumber(loan?.interesTotal);

  const totalFinanciado = monto + interesTotal;
  const totalContrato = isArticulo ? monto + cuotaInicial + interesTotal : monto + interesTotal;

  return {
    isArticulo,
    monto,
    cuotaInicial,
    interesTotal,
    totalFinanciado,
    totalContrato,
  };
};
