/**
 * Cálculo del interés de un crédito, en un solo lugar.
 *
 * Esta fórmula estaba copiada en cinco sitios de tres componentes (crear
 * crédito, crear préstamo y editar préstamo). Cada copia se fue tocando por
 * separado y terminaron divergiendo: el preview mostraba una cifra y el backend
 * guardaba otra. Al vivir aquí, las tres pantallas no pueden volver a separarse.
 *
 * Debe dar EXACTAMENTE lo mismo que `LoansService.calculateInterestAndCuotas`
 * del backend. Si se cambia una, hay que cambiar la otra.
 */

/**
 * La tasa se pasa a centésimas (base entera) antes de dividir.
 *
 * Dividir primero deja un residuo binario: 29/100 se guarda como
 * 0.28999999999999998, así que 100 * (29/100) da 28.999999999996 y `Math.trunc`
 * —que corta, no redondea— lo dejaba en 28. Se perdía un peso. Multiplicando en
 * enteros primero, 100 * 2900 / 10000 da 29 exacto.
 *
 * La tasa es Decimal(5,2) en la base, así que *100 siempre es entero.
 */
const aCentesimas = (tasa: number): number =>
  Math.round((Number(tasa) || 0) * 100);

/**
 * Interés plano (lo que la empresa llama "amortización"): la tasa se aplica una
 * sola vez sobre el capital, sin importar el plazo.
 */
export function calcularInteresPlano(capital: number, tasa: number): number {
  const c = Number(capital) || 0;
  if (c <= 0) return 0;
  return Math.trunc((c * aCentesimas(tasa)) / 10000);
}

/**
 * Interés simple: la tasa se aplica por cada mes de plazo. El plazo cuenta con
 * mínimo 1 mes, igual que el backend, para que un plazo en 0 no anule el interés.
 */
export function calcularInteresSimple(
  capital: number,
  tasa: number,
  plazoMeses: number,
): number {
  const c = Number(capital) || 0;
  if (c <= 0) return 0;
  const meses = Math.max(1, Number(plazoMeses) || 0);
  return Math.trunc((c * aCentesimas(tasa) * meses) / 10000);
}
