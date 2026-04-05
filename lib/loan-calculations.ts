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
