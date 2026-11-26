import { formatCurrency } from '@/lib/utils'

/** Los conceptos guardados antes del cambio pueden traer importes crudos. */
export function formatearImportesEnConcepto(concepto: string): string {
  return concepto.replace(/\$(\d+(?:[.,]\d+)*)/g, (original, importe: string) => (
    /^\d+(?:\.\d{1,2})?$/.test(importe) ? formatCurrency(Number(importe)) : original
  ))
}
